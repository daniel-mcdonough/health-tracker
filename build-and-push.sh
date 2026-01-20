#!/bin/bash

# Health Tracker Docker Build and Push Script

set -e

# Configuration - Set your container registry here
CONTAINER_REGISTRY="docker.io/danielmcdonough"
#"${CONTAINER_REGISTRY:-}"  # e.g., "docker.io/yourusername" or "ghcr.io/yourusername"
IMAGE_TAG="${IMAGE_TAG:-latest}"
BUILD_TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Check if container registry is set
if [ -z "$CONTAINER_REGISTRY" ]; then
    print_error "Container registry not set!"
    echo "Please set the CONTAINER_REGISTRY environment variable or edit this script."
    echo "Examples:"
    echo "  export CONTAINER_REGISTRY=docker.io/yourusername"
    echo "  export CONTAINER_REGISTRY=ghcr.io/yourusername"
    echo "  export CONTAINER_REGISTRY=localhost:5000"
    exit 1
fi

print_status "🐳 Building Health Tracker Docker Images"
print_status "Registry: $CONTAINER_REGISTRY"
print_status "Tag: $IMAGE_TAG"

# Backend image names
BACKEND_IMAGE="health-tracker-backend"
BACKEND_FULL_IMAGE="$CONTAINER_REGISTRY/$BACKEND_IMAGE"

# Frontend image names
FRONTEND_IMAGE="health-tracker-frontend"
FRONTEND_FULL_IMAGE="$CONTAINER_REGISTRY/$FRONTEND_IMAGE"

# Build backend
print_status "🔧 Building backend image..."
cd server
docker build \
    -t "$BACKEND_IMAGE:$IMAGE_TAG" \
    -t "$BACKEND_IMAGE:$BUILD_TIMESTAMP" \
    -t "$BACKEND_FULL_IMAGE:$IMAGE_TAG" \
    -t "$BACKEND_FULL_IMAGE:$BUILD_TIMESTAMP" \
    --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    --build-arg VERSION="$IMAGE_TAG" \
    .

if [ $? -eq 0 ]; then
    print_status "✅ Backend image built successfully"
else
    print_error "Failed to build backend image"
    exit 1
fi

# Build frontend
print_status "🌐 Building frontend image..."
cd ../client
docker build \
    -t "$FRONTEND_IMAGE:$IMAGE_TAG" \
    -t "$FRONTEND_IMAGE:$BUILD_TIMESTAMP" \
    -t "$FRONTEND_FULL_IMAGE:$IMAGE_TAG" \
    -t "$FRONTEND_FULL_IMAGE:$BUILD_TIMESTAMP" \
    --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
    --build-arg VERSION="$IMAGE_TAG" \
    --build-arg BUILD_TIMESTAMP="$BUILD_TIMESTAMP" \
    .

if [ $? -eq 0 ]; then
    print_status "✅ Frontend image built successfully"
else
    print_error "Failed to build frontend image"
    exit 1
fi

# Show built images
print_status "📦 Built images:"
docker images | grep -E "($BACKEND_IMAGE|$FRONTEND_IMAGE)" | head -8

# Ask for confirmation before pushing
echo ""
read -p "Push images to $CONTAINER_REGISTRY? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Check if we need to login
    if [[ "$CONTAINER_REGISTRY" == *"docker.io"* ]] || [[ "$CONTAINER_REGISTRY" == *"ghcr.io"* ]]; then
        print_warning "You may need to login to the registry first:"
        if [[ "$CONTAINER_REGISTRY" == *"ghcr.io"* ]]; then
            echo "  echo \$GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin"
        else
            echo "  docker login"
        fi
        echo ""
    fi

    # Push backend images
    print_status "⬆️  Pushing backend images..."
    docker push "$BACKEND_FULL_IMAGE:$IMAGE_TAG"
    docker push "$BACKEND_FULL_IMAGE:$BUILD_TIMESTAMP"

    if [ $? -eq 0 ]; then
        print_status "✅ Backend images pushed successfully"
    else
        print_error "Failed to push backend images"
        exit 1
    fi

    # Push frontend images
    print_status "⬆️  Pushing frontend images..."
    docker push "$FRONTEND_FULL_IMAGE:$IMAGE_TAG"
    docker push "$FRONTEND_FULL_IMAGE:$BUILD_TIMESTAMP"

    if [ $? -eq 0 ]; then
        print_status "✅ Frontend images pushed successfully"
    else
        print_error "Failed to push frontend images"
        exit 1
    fi

    print_status "🎉 All images built and pushed successfully!"
    echo ""
    echo "Images available at:"
    echo "  - $BACKEND_FULL_IMAGE:$IMAGE_TAG"
    echo "  - $BACKEND_FULL_IMAGE:$BUILD_TIMESTAMP"
    echo "  - $FRONTEND_FULL_IMAGE:$IMAGE_TAG"
    echo "  - $FRONTEND_FULL_IMAGE:$BUILD_TIMESTAMP"
    echo ""
    
    # Return to project root before checking for deployment script
    cd ..
    
    # Ask if user wants to update Kubernetes deployments
    echo ""
    read -p "Update Kubernetes deployments with the new images? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -f "k8s/update-deployments.sh" ]; then
            print_status "Updating Kubernetes deployments..."
            export CONTAINER_REGISTRY
            ./k8s/update-deployments.sh "$BUILD_TIMESTAMP"
        else
            print_error "k8s/update-deployments.sh not found"
            echo "To manually update deployments, run:"
            echo "  ./k8s/update-deployments.sh $BUILD_TIMESTAMP"
        fi
    else
        echo "To update Kubernetes deployments later, run:"
        echo "  export CONTAINER_REGISTRY=$CONTAINER_REGISTRY"
        echo "  ./k8s/update-deployments.sh $BUILD_TIMESTAMP"
        echo ""
        echo "Or to update manifest files directly:"
        echo "  sed -i 's|health-tracker-backend:[^\"]*|health-tracker-backend:$BUILD_TIMESTAMP|g' k8s/backend-deployment.yaml"
        echo "  sed -i 's|health-tracker-frontend:[^\"]*|health-tracker-frontend:$BUILD_TIMESTAMP|g' k8s/frontend-deployment.yaml"
    fi
else
    print_status "Push cancelled. Images available locally as:"
    echo "  - $BACKEND_IMAGE:$IMAGE_TAG"
    echo "  - $FRONTEND_IMAGE:$IMAGE_TAG"
fi
