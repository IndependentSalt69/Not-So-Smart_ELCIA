$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " CivicPulse - NVIDIA GPU Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$Python = ".\.venv\Scripts\python.exe"

# ------------------------------------------------------------
# 1. NVIDIA
# ------------------------------------------------------------

Write-Host "[1/9] Checking NVIDIA GPU..." -ForegroundColor Yellow

if (-not (Get-Command nvidia-smi -ErrorAction SilentlyContinue)) {
    throw "nvidia-smi not found. Install the NVIDIA driver first."
}

$GPU = (& nvidia-smi --query-gpu=name --format=csv,noheader | Select-Object -First 1).Trim()

if (-not $GPU) {
    throw "No NVIDIA GPU detected."
}

Write-Host "      GPU: $GPU" -ForegroundColor Green

# ------------------------------------------------------------
# 2. Python
# ------------------------------------------------------------

Write-Host "[2/9] Checking Python..." -ForegroundColor Yellow

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    throw "Python not found in PATH."
}

python --version

# ------------------------------------------------------------
# 3. Virtual environment
# ------------------------------------------------------------

Write-Host "[3/9] Checking virtual environment..." -ForegroundColor Yellow

if (-not (Test-Path $Python)) {
    Write-Host "      Creating .venv..." -ForegroundColor Gray
    python -m venv .venv
}

if (-not (Test-Path $Python)) {
    throw "Failed to create .venv."
}

Write-Host "      .venv ready." -ForegroundColor Green

# ------------------------------------------------------------
# 4. Common dependencies
# ------------------------------------------------------------

Write-Host "[4/9] Installing common dependencies..." -ForegroundColor Yellow

& $Python -m pip install --upgrade pip
& $Python -m pip install -r requirements.txt

# ------------------------------------------------------------
# 5. CUDA PyTorch
# ------------------------------------------------------------

Write-Host "[5/9] Installing CUDA-enabled PyTorch..." -ForegroundColor Yellow

& $Python -m pip uninstall -y torch torchvision torchaudio

& $Python -m pip install `
    torch==2.14.0 `
    torchvision==0.29.0 `
    --index-url https://download.pytorch.org/whl/cu130

# ------------------------------------------------------------
# 6. Verify CUDA + modules
# ------------------------------------------------------------

Write-Host "[6/9] Verifying CUDA and ML dependencies..." -ForegroundColor Yellow

& $Python -c @"
import torch
import ultralytics
import timm
import lap

print('PyTorch:', torch.__version__)
print('CUDA build:', torch.version.cuda)
print('CUDA available:', torch.cuda.is_available())

if torch.cuda.is_available():
    print('GPU:', torch.cuda.get_device_name(0))
else:
    raise SystemExit('CUDA is unavailable')

print('Ultralytics:', ultralytics.__version__)
print('timm:', timm.__version__)
print('lap:', lap.__version__)
"@

# ------------------------------------------------------------
# 7. Required local configuration
# ------------------------------------------------------------

Write-Host "[7/9] Checking local configuration..." -ForegroundColor Yellow

if (-not (Test-Path ".env")) {
    throw ".env not found. Add your Supabase credentials."
}

if (-not (Test-Path "models\production\best.pt")) {
    throw "models\production\best.pt not found."
}

if (-not (Test-Path "dashboard\.env")) {
    throw "dashboard\.env not found. Add VITE_API_BASE_URL and VITE_GOOGLE_MAPS_API_KEY."
}

Write-Host "      root .env:       OK" -ForegroundColor Green
Write-Host "      production model: OK" -ForegroundColor Green
Write-Host "      dashboard .env:  OK" -ForegroundColor Green
Write-Host ""
Write-Host "      Testing Supabase connection..." -ForegroundColor Gray

$SupabaseTest = Join-Path $Root ".supabase_test.py"

@'
from sqlalchemy import create_engine, text
from src.core.config import settings

engine = create_engine(settings.DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text("SELECT 1")).scalar()

if result != 1:
    raise SystemExit("Supabase database test failed")

print("Supabase connection: OK")
'@ | Set-Content -Path $SupabaseTest -Encoding UTF8

try {
    & $Python $SupabaseTest

    if ($LASTEXITCODE -ne 0) {
        throw "Supabase database test failed."
    }
}
finally {
    if (Test-Path $SupabaseTest) {
        Remove-Item $SupabaseTest -Force
    }
}

# ------------------------------------------------------------
# 8. FFmpeg
# ------------------------------------------------------------

Write-Host "[8/9] Checking FFmpeg..." -ForegroundColor Yellow

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    throw "FFmpeg not found. Install with: winget install Gyan.FFmpeg.Shared"
}

ffmpeg -version | Select-Object -First 1

# ------------------------------------------------------------
# 9. Frontend
# ------------------------------------------------------------

Write-Host "[9/9] Checking frontend dependencies..." -ForegroundColor Yellow

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm not found. Install Node.js first."
}

Push-Location "$Root\dashboard"

if (-not (Test-Path "node_modules")) {
    npm install --legacy-peer-deps
} else {
    Write-Host "      node_modules already present." -ForegroundColor Green
}

Pop-Location

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " CivicPulse setup complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "GPU:    $GPU" -ForegroundColor Green
Write-Host "CUDA:   Available" -ForegroundColor Green
Write-Host "Model:  Found" -ForegroundColor Green
Write-Host "FFmpeg: Found" -ForegroundColor Green
Write-Host ""
Write-Host "Run:" -ForegroundColor Cyan
Write-Host "    .\start.ps1" -ForegroundColor White
Write-Host ""