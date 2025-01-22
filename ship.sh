#!/bin/bash

# Configuration
CONTAINER_NAME="python_app"
IMAGE_NAME="python_app_image"
DOCKERFILE_PATH="./Dockerfile"
PORT=8004

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    echo -e "${2:-$GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Function to load environment variables and perform git pull
git_pull_repo() {
    log "Pulling latest changes from repository..." $YELLOW
    git checkout main
    git pull
    
    # Fall back to regular pull if authentication fails or credentials don't exist
    if git pull origin master; then
        log "Repository updated successfully" $GREEN
    else
        log "Failed to pull from repository" $RED
        exit 1
    fi
}

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    log "Docker is not running. Please start Docker first." $RED
    exit 1
fi

# Perform git pull before any Docker operations
git_pull_repo

# Stop the existing container if it's running
if docker ps -q -f name=$CONTAINER_NAME >/dev/null; then
    log "Stopping existing container..." $YELLOW
    docker stop $CONTAINER_NAME
fi

# Remove the existing container
if docker ps -aq -f name=$CONTAINER_NAME >/dev/null; then
    log "Removing existing container..." $YELLOW
    docker rm $CONTAINER_NAME
fi

# Build the new image
log "Building new Docker image..." $YELLOW
if docker build -t $IMAGE_NAME -f $DOCKERFILE_PATH .; then
    log "Image built successfully!"
else
    log "Failed to build Docker image" $RED
    exit 1
fi

# Run the new container
log "Starting new container..." $YELLOW
if docker run -d \
    --name $CONTAINER_NAME \
    -p $PORT:$PORT \
    --restart unless-stopped \
    $IMAGE_NAME; then
    log "Container started successfully!"
    log "Application is running on http://localhost:$PORT"
else
    log "Failed to start container" $RED
    exit 1
fi

# Show container logs
log "Showing container logs (press Ctrl+C to exit)..." $YELLOW
docker logs -f $CONTAINER_NAME