#!/bin/bash

# Local Build Script for Kubernetes Development

set -e

# Configuration
LOCAL_REGISTRY="${LOCAL_REGISTRY:-192.168.1.201:32000}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "🐳 Building Health Tracker for Local Kubernetes"
echo "Registry: $LOCAL_REGISTRY"

# Build backend
echo "🔧 Building backend..."
cd server
docker build -t health-tracker-backend:$IMAGE_TAG .
docker tag health-tracker-backend:$IMAGE_TAG $LOCAL_REGISTRY/health-tracker-backend:$IMAGE_TAG

# Build frontend
echo "🌐 Building frontend..."
cd ../client
docker build -t health-tracker-frontend:$IMAGE_TAG .
docker tag health-tracker-frontend:$IMAGE_TAG $LOCAL_REGISTRY/health-tracker-frontend:$IMAGE_TAG

# # For Kind clusters
# if command -v kind &> /dev/null; then
#     echo "📦 Loading images into Kind cluster..."
#     kind load docker-image health-tracker-backend:$IMAGE_TAG || true
#     kind load docker-image health-tracker-frontend:$IMAGE_TAG || true
# fi

# # For Minikube
# if command -v minikube &> /dev/null && minikube status | grep -q "Running"; then
#     echo "📦 Images available in Minikube docker daemon"
# fi

# If local registry is running, push to it
if curl -s -f -o /dev/null "http://$LOCAL_REGISTRY/v2/"; then
    echo "⬆️  Pushing to local registry..."
    docker push $LOCAL_REGISTRY/health-tracker-backend:$IMAGE_TAG
    docker push $LOCAL_REGISTRY/health-tracker-frontend:$IMAGE_TAG
    echo "✅ Images pushed to $LOCAL_REGISTRY"
else
    echo "ℹ️  Local registry not available at $LOCAL_REGISTRY"
    echo "   Images available locally as:"
    echo "   - health-tracker-backend:$IMAGE_TAG"
    echo "   - health-tracker-frontend:$IMAGE_TAG"
fi

echo ""
echo "🚀 To deploy to Kubernetes:"
echo "   1. Update k8s manifests with image names"
echo "   2. Run: kubectl apply -f k8s/"

cd ..