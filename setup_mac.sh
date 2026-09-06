#!/bin/bash
set -euo pipefail

# ==============================================================================
# CivicPulse — macOS Environment Setup Script
# Supports: Apple Silicon (arm64, MPS acceleration) & Intel (x86_64, CPU fallback)
# ==============================================================================

# Formatting Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN} CivicPulse - macOS Setup${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# ------------------------------------------------------------
# 1. OS & Architecture Detection
# ------------------------------------------------------------
echo -e "${YELLOW}[1/10] Checking Operating System & Architecture...${NC}"

OS_NAME="$(uname -s)"
if [ "$OS_NAME" != "Darwin" ]; then
    echo -e "${RED}Error: This setup script is for macOS only (detected: $OS_NAME).${NC}"
    echo "For Windows, run .\\setup_gpu.ps1 instead."
    exit 1
fi

ARCH="$(uname -m)"
case "$ARCH" in
    arm64)
        ARCH_DESC="Apple Silicon (arm64)"
        ;;
    x86_64)
        ARCH_DESC="Intel Mac (x86_64 - CPU fallback)"
        ;;
    *)
        ARCH_DESC="Unknown architecture ($ARCH)"
        ;;
esac

echo -e "      OS:           ${GREEN}macOS ($OS_NAME)${NC}"
echo -e "      Architecture: ${GREEN}$ARCH_DESC${NC}"

# ------------------------------------------------------------
# 2. Command-Line Tools & Homebrew Guidance
# ------------------------------------------------------------
echo -e "${YELLOW}[2/10] Checking required CLI tools...${NC}"

MISSING_TOOLS=()

for tool in git python3 node npm ffmpeg; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        MISSING_TOOLS+=("$tool")
    fi
done

if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
    echo -e "${RED}Error: Missing required tools: ${MISSING_TOOLS[*]}${NC}"
    echo ""
    echo "To install missing dependencies on macOS using Homebrew:"
    if ! command -v brew >/dev/null 2>&1; then
        echo "  1. Install Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    fi
    for tool in "${MISSING_TOOLS[@]}"; do
        case "$tool" in
            git)
                echo "  - brew install git"
                ;;
            python3)
                echo "  - brew install python@3.11"
                ;;
            node|npm)
                echo "  - brew install node"
                ;;
            ffmpeg)
                echo "  - brew install ffmpeg"
                ;;
        esac
    done
    echo ""
    exit 1
fi

echo -e "      CLI Tools:    ${GREEN}git, python3, node, npm, ffmpeg found${NC}"

# ------------------------------------------------------------
# 3. Python Version Compatibility Check
# ------------------------------------------------------------
echo -e "${YELLOW}[3/10] Checking Python version compatibility...${NC}"

PYTHON_SYS_VER="$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")')"
PYTHON_COMPAT="$(python3 -c 'import sys; print("1" if sys.version_info >= (3, 10) else "0")')"

if [ "$PYTHON_COMPAT" != "1" ]; then
    echo -e "${RED}Error: Python 3.10+ required. Found Python $PYTHON_SYS_VER.${NC}"
    echo "Install a compatible Python version via Homebrew: brew install python@3.11"
    exit 1
fi

echo -e "      Python:       ${GREEN}Python $PYTHON_SYS_VER${NC}"

# ------------------------------------------------------------
# 4. Determine Project Root & Virtual Environment
# ------------------------------------------------------------
echo -e "${YELLOW}[4/10] Setting up Python virtual environment...${NC}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

VENV_DIR="$ROOT_DIR/.venv"
PYTHON="$VENV_DIR/bin/python"
PIP="$VENV_DIR/bin/pip"

if [ ! -f "$PYTHON" ]; then
    echo -e "      Creating .venv..."
    python3 -m venv "$VENV_DIR"
fi

if [ ! -f "$PYTHON" ]; then
    echo -e "${RED}Error: Failed to initialize virtual environment at $VENV_DIR${NC}"
    exit 1
fi

echo -e "      .venv:        ${GREEN}$VENV_DIR (Ready)${NC}"

# ------------------------------------------------------------
# 5. Install Common Dependencies (requirements.txt)
# ------------------------------------------------------------
echo -e "${YELLOW}[5/10] Installing Python dependencies from requirements.txt...${NC}"

"$PIP" install --upgrade pip
"$PIP" install -r requirements.txt

# ------------------------------------------------------------
# 6. Verify PyTorch, Accelerators & ML Libraries
# ------------------------------------------------------------
echo -e "${YELLOW}[6/10] Verifying PyTorch and machine learning modules...${NC}"

"$PYTHON" -c "
import sys
import torch
import torchvision
import ultralytics
import cv2
import supervision
import timm
import psycopg
import shapely

print(f'      PyTorch:      {torch.__version__}')
print(f'      Torchvision:  {torchvision.__version__}')
print(f'      Ultralytics:  {ultralytics.__version__}')
print(f'      OpenCV:       {cv2.__version__}')
print(f'      Supervision:  {supervision.__version__}')
print(f'      timm:         {timm.__version__}')
"

# ------------------------------------------------------------
# 7. Verify PyTorch Hardware Device Support
# ------------------------------------------------------------
echo -e "${YELLOW}[7/10] Evaluating compute device acceleration...${NC}"

MPS_STATUS="$("$PYTHON" -c "
import torch
if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
    print('available')
else:
    print('unavailable')
")"

if [ "$ARCH" = "arm64" ]; then
    if [ "$MPS_STATUS" = "available" ]; then
        echo -e "      Device:       ${GREEN}Apple Silicon Metal Performance Shaders (MPS) Available${NC}"
    else
        echo -e "      Device:       ${YELLOW}MPS Unavailable (falling back to CPU execution)${NC}"
    fi
else
    echo -e "      Device:       ${GREEN}CPU Execution (Intel x86_64)${NC}"
fi

# ------------------------------------------------------------
# 8. Local Configuration & Health Checks
# ------------------------------------------------------------
echo -e "${YELLOW}[8/10] Validating project configuration & database...${NC}"

if [ ! -f "$ROOT_DIR/.env" ]; then
    echo -e "${RED}Error: .env not found in project root. Please create it with your database credentials.${NC}"
    exit 1
fi

if [ ! -f "$ROOT_DIR/models/production/best.pt" ]; then
    echo -e "${RED}Error: Production model not found at models/production/best.pt.${NC}"
    exit 1
fi

if [ ! -f "$ROOT_DIR/dashboard/.env" ]; then
    echo -e "${RED}Error: dashboard/.env not found. Add VITE_API_BASE_URL and VITE_GOOGLE_MAPS_API_KEY.${NC}"
    exit 1
fi

echo -e "      Root .env:        ${GREEN}OK${NC}"
echo -e "      Production Model: ${GREEN}OK${NC}"
echo -e "      Dashboard .env:   ${GREEN}OK${NC}"

# Lightweight database connectivity test
echo -e "      Testing database connectivity..."
"$PYTHON" -c "
from sqlalchemy import create_engine, text
from src.core.config import settings
try:
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        res = conn.execute(text('SELECT 1')).scalar()
    if res == 1:
        print('      Database test:    OK')
except Exception as e:
    print(f'      Database warning: Could not connect to database ({e}). Please verify .env settings.')
"

# Lightweight backend FastAPI import verification
echo -e "      Testing backend app import..."
"$PYTHON" -c "
from src.api.main import app
print('      Backend API:      OK (FastAPI application imported successfully)')
"

# ------------------------------------------------------------
# 9. FFmpeg Verification
# ------------------------------------------------------------
echo -e "${YELLOW}[9/10] Verifying FFmpeg installation...${NC}"

FFMPEG_VER="$(ffmpeg -version | head -n 1)"
echo -e "      FFmpeg:       ${GREEN}$FFMPEG_VER${NC}"

# ------------------------------------------------------------
# 10. Dashboard Frontend Dependencies
# ------------------------------------------------------------
echo -e "${YELLOW}[10/10] Setting up Dashboard frontend dependencies...${NC}"

NODE_VER="$(node --version)"
NPM_VER="$(npm --version)"
echo -e "      Node:         ${GREEN}$NODE_VER${NC}"
echo -e "      npm:          ${GREEN}$NPM_VER${NC}"

cd "$ROOT_DIR/dashboard"
if [ ! -d "node_modules" ]; then
    echo -e "      Installing npm packages..."
    npm install --legacy-peer-deps
else
    echo -e "      node_modules: ${GREEN}Already installed${NC}"
fi
cd "$ROOT_DIR"

# ------------------------------------------------------------
# Final Summary Banner
# ------------------------------------------------------------
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN} CivicPulse macOS setup complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "OS:                     macOS ($OS_NAME)"
echo -e "Architecture:           $ARCH_DESC"
echo -e "Python:                 Python $PYTHON_SYS_VER"
echo -e "Virtual Environment:    $VENV_DIR"
echo -e "PyTorch Version:        $("$PYTHON" -c "import torch; print(torch.__version__)")"
if [ "$ARCH" = "arm64" ]; then
    echo -e "MPS Acceleration:       $MPS_STATUS"
else
    echo -e "Hardware Acceleration:  CPU fallback"
fi
echo -e "FFmpeg:                 $FFMPEG_VER"
echo -e "Node.js:                $NODE_VER"
echo -e "Frontend Dependencies:  installed"
echo -e "Production Model:       found (models/production/best.pt)"
echo ""
echo -e "${CYAN}Run:${NC}"
echo -e "    ./start_mac.sh"
echo ""
