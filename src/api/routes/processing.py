"""
src/api/routes/processing.py
FastAPI router endpoints for ML video processing jobs (Phase 11B).
"""

from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile, HTTPException, status

from src.schemas.processing import ProcessJobResponse, JobStatusResponse
from src.services.processing_job_manager import job_manager, JobStatus

router = APIRouter(prefix="/process", tags=["processing"])


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
    zone_id: Optional[str] = Form(None, description="Optional surveillance zone identifier (e.g. EC-01)"),
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
            zone_id=zone_id,
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
