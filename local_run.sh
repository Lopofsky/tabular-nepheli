#!/bin/bash

# app_runner.sh
set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Log functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if python3 is installed
check_python() {
    if ! command -v python3 &> /dev/null; then
        log_error "Python3 is not installed. Please install Python3 first."
        exit 1
    fi
}

# Check if pip is installed
check_pip() {
    if ! command -v pip3 &> /dev/null; then
        log_error "pip3 is not installed. Please install pip3 first."
        exit 1
    fi
}

# Create virtual environment if it doesn't exist
setup_venv() {
    if [ ! -d "venv" ]; then
        log_info "Creating virtual environment..."
        python3 -m venv venv
    fi
}

# Activate virtual environment
activate_venv() {
    log_info "Activating virtual environment..."
    source venv/bin/activate
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    pip install -r requirements.txt
}

# Create necessary directories
create_directories() {
    log_info "Creating necessary directories..."
    mkdir -p app/static
}

# Create requirements.txt if it doesn't exist
create_requirements() {
    if [ ! -f "requirements.txt" ]; then
        log_info "Creating requirements.txt..."
        cat > requirements.txt << EOF
fastapi
uvicorn
python-multipart
pandas
openpyxl
EOF
    fi
}

# Check if port 8000 is available
check_port() {
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
        log_error "Port 8000 is already in use. Please free up the port and try again."
        exit 1
    fi
}

# Main execution
main() {
    # Check prerequisites
    check_python
    check_pip
    check_port

    # Setup environment
    setup_venv
    activate_venv
    create_requirements
    create_directories
    install_dependencies

    # Run the application
    log_info "Starting the application..."
    log_info "The application will be available at http://localhost:8000"
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8004
}

# Run main function
main