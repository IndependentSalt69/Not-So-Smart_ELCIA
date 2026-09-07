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
# Determine Project Root (working-directory independent)
# ------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# ------------------------------------------------------------
# 1. OS & Architecture Detection
# ------------------------------------------------------------
echo -e "${YELLOW}[1/10] Checking Operating System & Architecture...${NC}"

OS_NAME="$(uname -s)"
if [ "$OS_NAME" != "Darwin" ]; then
    echo -e "${RED}Error: This setup script is for macOS only (detected: $OS_NAME).${NC}"
    echo "For Windows, run .\\setup\\windows\\setup_gpu.ps1 instead."
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

for tool in git node npm ffmpeg; do
    if ! command -v "$tool" >/dev/null 2>&1; then
        MISSING_TOOLS+=("$tool")
    fi
done

# Check if at least one Python interpreter command is available
if ! command -v python3.11 >/dev/null 2>&1 && \
   ! command -v python3.10 >/dev/null 2>&1 && \
   ! command -v python3.12 >/dev/null 2>&1 && \
   ! command -v python3.13 >/dev/null 2>&1 && \
   ! command -v python3.14 >/dev/null 2>&1 && \
   ! command -v python3 >/dev/null 2>&1 && \
   ! command -v python >/dev/null 2>&1; then
    MISSING_TOOLS+=("python3")
fi

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
            python*|python3*|python3.11)
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

echo -e "      CLI Tools:    ${GREEN}git, node, npm, ffmpeg found${NC}"

# ------------------------------------------------------------
# 3. Python Version Compatibility Check
# ------------------------------------------------------------
echo -e "${YELLOW}[3/10] Checking Python interpreter & version compatibility...${NC}"

PYTHON_BIN=""
PYTHON_SYS_VER=""

# Check candidate Python interpreters in priority order (preferring Python 3.11, then 3.10, 3.12, 3.13, 3.14, python3, python)
for candidate in python3.11 python3.10 python3.12 python3.13 python3.14 python3 python; do
    if command -v "$candidate" >/dev/null 2>&1; then
        CANDIDATE_VER="$("$candidate" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")' 2>/dev/null || true)"
        CANDIDATE_COMPAT="$("$candidate" -c 'import sys; print("1" if sys.version_info >= (3, 10) else "0")' 2>/dev/null || true)"
        if [ "$CANDIDATE_COMPAT" = "1" ]; then
            PYTHON_BIN="$candidate"
            PYTHON_SYS_VER="$CANDIDATE_VER"
            break
        fi
    fi
done

if [ -z "$PYTHON_BIN" ]; then
    # Detect what system python version was found for actionable error reporting
    DETECTED_VER="not found"
    if command -v python3 >/dev/null 2>&1; then
        DETECTED_VER="$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")' 2>/dev/null || echo 'unknown')"
    elif command -v python >/dev/null 2>&1; then
        DETECTED_VER="$(python -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")' 2>/dev/null || echo 'unknown')"
    fi

    echo -e "${RED}Error: Python 3.10+ required (detected: Python $DETECTED_VER).${NC}"
    echo "CivicPulse requires Python 3.10 or higher (Python 3.11 recommended)."
    echo ""
    echo "Please install Python 3.11 using Homebrew:"
    echo "  brew install python@3.11"
    echo ""
    echo "Then rerun setup:"
    echo "  ./setup/macOS/setup_mac.sh"
    echo ""
    exit 1
fi

echo -e "      Python Binary:  ${GREEN}$(command -v "$PYTHON_BIN")${NC}"
echo -e "      Python Version: ${GREEN}Python $PYTHON_SYS_VER${NC}"
if [ "$PYTHON_BIN" = "python3.11" ]; then
    echo -e "      Status:         ${GREEN}Using recommended Python 3.11 interpreter${NC}"
else
    echo -e "      Note:           ${GRAY}Python 3.11 is recommended; proceeding with detected Python $PYTHON_SYS_VER${NC}"
fi

# ------------------------------------------------------------
# 4. Determine Project Root & Virtual Environment
# ------------------------------------------------------------
echo -e "${YELLOW}[4/10] Setting up Python virtual environment...${NC}"

VENV_DIR="$REPO_ROOT/.venv"
PYTHON="$VENV_DIR/bin/python"
PIP="$VENV_DIR/bin/pip"

if [ -f "$PYTHON" ]; then
    # Verify existing virtual environment was created with a compatible Python version
    VENV_COMPAT="$("$PYTHON" -c 'import sys; print("1" if sys.version_info >= (3, 10) else "0")' 2>/dev/null || echo "0")"
    if [ "$VENV_COMPAT" != "1" ]; then
        echo -e "      Existing .venv uses an incompatible Python version. Recreating .venv with $PYTHON_BIN..."
        rm -rf "$VENV_DIR"
    fi
fi

if [ ! -f "$PYTHON" ]; then
    echo -e "      Creating .venv using $PYTHON_BIN at $VENV_DIR..."
    "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

if [ ! -f "$PYTHON" ]; then
    echo -e "${RED}Error: Failed to initialize virtual environment at $VENV_DIR${NC}"
    exit 1
fi

echo -e "      .venv:          ${GREEN}$VENV_DIR (Ready)${NC}"

# ------------------------------------------------------------
# 5. Install Common Dependencies (requirements.txt)
# ------------------------------------------------------------
echo -e "${YELLOW}[5/10] Installing Python dependencies from requirements.txt...${NC}"

if [ ! -f "$REPO_ROOT/requirements.txt" ]; then
    echo -e "${RED}Error: requirements.txt not found at $REPO_ROOT/requirements.txt${NC}"
    exit 1
fi

"$PIP" install --upgrade pip

if ! "$PIP" install -r "$REPO_ROOT/requirements.txt"; then
    echo ""
    echo -e "${RED}Error: Failed to install Python dependencies using Python $PYTHON_SYS_VER ($PYTHON_BIN).${NC}"
    echo "If package compilation or binary wheel resolution failed on Python $PYTHON_SYS_VER,"
    echo "we recommend installing and running with Python 3.11:"
    echo "  brew install python@3.11"
    echo ""
    exit 1
fi

# ------------------------------------------------------------
# 6. Verify PyTorch, Accelerators & ML Libraries
# ------------------------------------------------------------
echo -e "${YELLOW}[6/10] Verifying PyTorch and machine learning modules...${NC}"

if ! "$PYTHON" -c "
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
"; then
    echo ""
    echo -e "${RED}Error: Machine learning module import verification failed using Python $PYTHON_SYS_VER ($PYTHON).${NC}"
    echo "If precompiled binary wheels for PyTorch or computer vision libraries are unavailable for Python $PYTHON_SYS_VER,"
    echo "please install and use Python 3.11:"
    echo "  brew install python@3.11"
    echo ""
    exit 1
fi

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
        echo -e "      Device:         ${GREEN}Apple Silicon Metal Performance Shaders (MPS) Available${NC}"
    else
        echo -e "      Device:         ${YELLOW}MPS Unavailable (falling back to CPU execution)${NC}"
    fi
else
    echo -e "      Device:         ${GREEN}CPU Execution (Intel x86_64)${NC}"
fi

# ------------------------------------------------------------
# 8. Local Configuration & Health Checks
# ------------------------------------------------------------
echo -e "${YELLOW}[8/10] Validating project configuration & database...${NC}"

if [ ! -f "$REPO_ROOT/.env" ]; then
    echo -e "${RED}Error: .env not found in project root ($REPO_ROOT/.env). Please create it with your database credentials.${NC}"
    exit 1
fi

if [ ! -f "$REPO_ROOT/models/production/best.pt" ]; then
    echo -e "${RED}Error: Production model not found at $REPO_ROOT/models/production/best.pt.${NC}"
    exit 1
fi

if [ ! -f "$REPO_ROOT/dashboard/.env" ]; then
    echo -e "${RED}Error: dashboard/.env not found ($REPO_ROOT/dashboard/.env). Add VITE_API_BASE_URL and VITE_GOOGLE_MAPS_API_KEY.${NC}"
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
echo -e "      FFmpeg:         ${GREEN}$FFMPEG_VER${NC}"

# ------------------------------------------------------------
# 10. Dashboard Frontend Dependencies
# ------------------------------------------------------------
echo -e "${YELLOW}[10/10] Setting up Dashboard frontend dependencies...${NC}"

NODE_VER="$(node --version)"
NPM_VER="$(npm --version)"
echo -e "      Node:           ${GREEN}$NODE_VER${NC}"
echo -e "      npm:            ${GREEN}$NPM_VER${NC}"

cd "$REPO_ROOT/dashboard"
if [ ! -d "$REPO_ROOT/dashboard/node_modules" ]; then
    echo -e "      Installing npm packages..."
    npm install --legacy-peer-deps
else
    echo -e "      node_modules:   ${GREEN}Already installed${NC}"
fi
cd "$REPO_ROOT"

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
echo -e "Production Model:       found ($REPO_ROOT/models/production/best.pt)"
echo ""
echo -e "${CYAN}Run:${NC}"
echo -e "    ./setup/macOS/start_mac.sh"
echo -e "    (or from setup/macOS: ./start_mac.sh)"
echo ""
