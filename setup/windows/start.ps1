$ErrorActionPreference = "Stop"

# Determine repository root from script location (working-directory independent)
$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Definition }
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path
Set-Location $RepoRoot

$Python = Join-Path $RepoRoot ".venv\Scripts\python.exe"

if (-not (Test-Path $Python)) {
    throw ".venv not found at $RepoRoot\.venv. Run .\setup\windows\setup_gpu.ps1 first."
}

if (-not (Test-Path "$RepoRoot\.env")) {
    throw ".env not found at $RepoRoot\.env."
}

if (-not (Test-Path "$RepoRoot\dashboard\.env")) {
    throw "dashboard\.env not found at $RepoRoot\dashboard\.env."
}

if (-not (Test-Path "$RepoRoot\models\production\best.pt")) {
    throw "models\production\best.pt not found at $RepoRoot\models\production\best.pt."
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
    "Set-Location '$RepoRoot'; & '$Python' -m uvicorn src.api.main:app --reload"
)

Write-Host "Backend starting..." -ForegroundColor Green

# Frontend
$Dashboard = Join-Path $RepoRoot "dashboard"

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
