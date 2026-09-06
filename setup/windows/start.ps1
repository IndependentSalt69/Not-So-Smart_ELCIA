$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$Python = ".\.venv\Scripts\python.exe"

if (-not (Test-Path $Python)) {
    throw ".venv not found. Run .\setup_gpu.ps1 first."
}

if (-not (Test-Path ".env")) {
    throw ".env not found."
}

if (-not (Test-Path "dashboard\.env")) {
    throw "dashboard\.env not found."
}

if (-not (Test-Path "models\production\best.pt")) {
    throw "models\production\best.pt not found."
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " CivicPulse Starting" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Backend
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$Root'; & '$Python' -m uvicorn src.api.main:app --reload"
)

Write-Host "Backend starting..." -ForegroundColor Green

# Frontend
$Dashboard = Join-Path $Root "dashboard"

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$Dashboard'; npm run dev"
)

Write-Host "Frontend starting..." -ForegroundColor Green

Write-Host ""
Write-Host "Dashboard: http://localhost:3000" -ForegroundColor Cyan
Write-Host "API:       http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host ""