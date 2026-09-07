"""
src/api/routes/processing.py
FastAPI router endpoints for ML video processing jobs (Phase 11B).
"""

from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Query, Depends, status
from sqlalchemy.orm import Session

from src.api.dependencies import get_db
from src.schemas.processing import (
    ProcessJobResponse,
    JobStatusResponse,
    FlightInspectionRunSummary,
    FlightInspectionRunListResponse,
    FlightInspectionRunDetail,
)
from src.repositories.processing_runs import list_flight_runs, get_flight_run
from src.services.processing_job_manager import job_manager, JobStatus

router = APIRouter(prefix="/process", tags=["processing"])


@router.get(
    "/runs",
    status_code=status.HTTP_200_OK,
    response_model=FlightInspectionRunListResponse,
    summary="List Flight Inspection Runs",
    description="Lists reconstructed historical and active drone flight inspection runs with aggregate metrics, supporting zone filtering and pagination.",
)
def get_flight_inspection_runs(
    zone_id: Optional[str] = Query(None, description="Optional operational zone ID or code (e.g. EC-01)"),
    skip: int = Query(0, ge=0, description="Number of runs to skip"),
    limit: int = Query(20, ge=1, le=100, description="Max number of runs to return"),
    db: Session = Depends(get_db),
) -> FlightInspectionRunListResponse:
    """
    Returns aggregated flight runs from persisted detections, incidents, and video verifications.
    Survives server restarts and preserves the 1 physical hazard = 1 Incident semantic.
    """
    items, total = list_flight_runs(
        db=db,
        zone_id=zone_id,
        skip=skip,
        limit=limit,
    )
    return FlightInspectionRunListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/runs/{job_id}",
    status_code=status.HTTP_200_OK,
    response_model=FlightInspectionRunDetail,
    summary="Get Flight Inspection Run Detail",
    description="Retrieves a specific flight inspection run summary, all associated individual incident records, and verification info.",
)
def get_flight_inspection_run_detail(
    job_id: str,
    db: Session = Depends(get_db),
) -> FlightInspectionRunDetail:
    """
    Returns full flight run detail with summary and individual incident list sorted deterministically.
    """
    run_detail = get_flight_run(db=db, job_id_or_prefix=job_id)
    if not run_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flight inspection run '{job_id}' not found.",
        )
    return run_detail


@router.post(
    "",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=ProcessJobResponse,
    summary="Enqueue Drone Video ML Processing Job",
    description="Uploads a raw drone video clip (.mp4/.mov/.avi) and optional DJI SRT flight telemetry subtitle file to trigger asynchronous ML inference.",
)
async def create_processing_job(
    video: UploadFile = File(..., description="Raw drone footage file (.mp4, .mov, .avi)"),
    srt: Optional[UploadFile] = File(None, description="Optional DJI SRT flight telemetry subtitle file (.srt)"),
    zone_id: Optional[str] = Form(None, description="Optional surveillance zone identifier (e.g. EC-01 or OTHER)"),
    custom_zone_name: Optional[str] = Form(None, description="Custom operational zone name when zone is OTHER"),
    drone_id: Optional[str] = Form(None, description="Optional drone swarm ID (e.g. DRONE-ALPHA-1)"),
):
    """
    Validates uploaded files and enqueues an asynchronous processing job.
    Returns HTTP 202 Accepted immediately without waiting for inference completion.
    """
    if not video.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded video file missing filename.",
        )

    clean_custom_name = custom_zone_name.strip() if custom_zone_name else None
    if clean_custom_name and len(clean_custom_name) > 128:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Custom zone name cannot exceed 128 characters.",
        )

    if zone_id and zone_id.strip().upper() == "OTHER":
        if not clean_custom_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Custom zone name is required when 'Other' zone is selected.",
            )
        eff_zone_id = None
        eff_custom_name = clean_custom_name
    else:
        eff_zone_id = zone_id.strip() if zone_id else None
        eff_custom_name = clean_custom_name

    try:
        video_content = await video.read()
        srt_content = None
        srt_filename = None

        if srt and srt.filename:
            srt_filename = srt.filename
            srt_content = await srt.read()

        job = job_manager.create_job(
            video_filename=video.filename,
            video_content=video_content,
            srt_filename=srt_filename,
            srt_content=srt_content,
            zone_id=eff_zone_id,
            custom_zone_name=eff_custom_name,
            drone_id=drone_id,
        )

        return ProcessJobResponse(
            job_id=job.job_id,
            status=JobStatus.QUEUED,
            message="Drone footage uploaded and processing job queued successfully.",
            created_at=job.created_at,
        )

    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit processing job: {str(e)}",
        )


@router.get(
    "/{job_id}",
    status_code=status.HTTP_200_OK,
    response_model=JobStatusResponse,
    summary="Get ML Processing Job Status & Telemetry Results",
    description="Polls the execution status, progress, hazard counts, evidence count, and artifact output paths for a processing job.",
)
async def get_processing_job_status(job_id: str):
    """
    Returns job execution state (QUEUED, PROCESSING, COMPLETED, FAILED).
    """
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Processing job not found: {job_id}",
        )

    return JobStatusResponse(**job.to_dict())
