#!/bin/bash
set -euo pipefail

# ==============================================================================
# CivicPulse — macOS Application Launcher
# Starts FastAPI Backend (port 8000) & React Dashboard (port 3000)
# ==============================================================================

# Formatting Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ------------------------------------------------------------
# Determine Project Root (working-directory independent)
# ------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

PYTHON="$REPO_ROOT/.venv/bin/python"

# ------------------------------------------------------------
# Validations
# ------------------------------------------------------------
if [ ! -f "$PYTHON" ]; then
    echo -e "${RED}Error: Virtual environment not found at $PYTHON.${NC}"
    echo "Please run ./setup/macOS/setup_mac.sh first."
    exit 1
fi

if [ ! -f "$REPO_ROOT/.env" ]; then
    echo -e "${RED}Error: .env not found in project root ($REPO_ROOT/.env).${NC}"
    exit 1
fi

if [ ! -f "$REPO_ROOT/dashboard/.env" ]; then
    echo -e "${RED}Error: dashboard/.env not found ($REPO_ROOT/dashboard/.env).${NC}"
    exit 1
fi

if [ ! -f "$REPO_ROOT/models/production/best.pt" ]; then
    echo -e "${RED}Error: Production model not found at $REPO_ROOT/models/production/best.pt.${NC}"
    exit 1
fi

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN} CivicPulse Starting (macOS)${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# ------------------------------------------------------------
# Process Management & Cleanup Trap
# ------------------------------------------------------------
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    # Prevent trap recursion
    trap - SIGINT SIGTERM EXIT
    echo ""
    echo -e "${YELLOW}Shutting down CivicPulse services...${NC}"
    
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo "Stopping Backend (PID: $BACKEND_PID)..."
        kill -TERM "$BACKEND_PID" 2>/dev/null || true
    fi

    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo "Stopping Frontend (PID: $FRONTEND_PID)..."
        kill -TERM "$FRONTEND_PID" 2>/dev/null || true
    fi

    # Wait for child processes to terminate cleanly
    [ -n "$BACKEND_PID" ] && wait "$BACKEND_PID" 2>/dev/null || true
    [ -n "$FRONTEND_PID" ] && wait "$FRONTEND_PID" 2>/dev/null || true

    echo -e "${GREEN}All CivicPulse services stopped.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# ------------------------------------------------------------
# 1. Start Backend
# ------------------------------------------------------------
echo -e "${GREEN}Backend starting...${NC}"
"$PYTHON" -m uvicorn src.api.main:app --reload &
BACKEND_PID=$!

# ------------------------------------------------------------
# 2. Start Frontend
# ------------------------------------------------------------
echo -e "${GREEN}Frontend starting...${NC}"
(cd "$REPO_ROOT/dashboard" && npm run dev) &
FRONTEND_PID=$!

# ------------------------------------------------------------
# Service URLs & Wait
# ------------------------------------------------------------
echo ""
echo -e "${CYAN}Dashboard: http://localhost:3000${NC}"
echo -e "${CYAN}API:       http://127.0.0.1:8000${NC}"
echo ""
echo -e "${YELLOW}Press [Ctrl+C] to stop all services.${NC}"
echo ""

# Wait for background services
wait
