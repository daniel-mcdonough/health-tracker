#!/bin/bash

# Update Kubernetes Deployments Script
# This script helps ensure smooth rolling updates of the health-tracker deployments
# It preserves PVCs and only updates the container images

set -e

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

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed or not in PATH"
    exit 1
fi

# Set namespace
NAMESPACE="health-tracker"

# Configuration
CONTAINER_REGISTRY="${CONTAINER_REGISTRY:-docker.io/danielmcdonough}"

# Check arguments
if [ $# -lt 1 ]; then
    print_error "Usage: $0 <tag>"
    echo "Example: $0 20250808-123456"
    echo "Example: $0 latest"
    exit 1
fi

TAG=$1

# Construct full image names
BACKEND_IMAGE="$CONTAINER_REGISTRY/health-tracker-backend:$TAG"
FRONTEND_IMAGE="$CONTAINER_REGISTRY/health-tracker-frontend:$TAG"

print_status "Updating deployments with tag: $TAG"
print_status "Backend image: $BACKEND_IMAGE"
print_status "Frontend image: $FRONTEND_IMAGE"

# Check if namespace exists
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
    print_error "Namespace '$NAMESPACE' does not exist"
    exit 1
fi

# Function to update deployment
update_deployment() {
    local deployment_name=$1
    local container_name=$2
    local image=$3
    
    print_status "Updating $deployment_name..."
    
    # Update the deployment with the new image
    kubectl set image deployment/$deployment_name $container_name=$image -n $NAMESPACE
    
    # Wait for rollout to complete
    print_status "Waiting for $deployment_name rollout to complete..."
    if kubectl rollout status deployment/$deployment_name -n $NAMESPACE --timeout=300s; then
        print_status "✅ $deployment_name updated successfully"
    else
        print_error "Rollout failed for $deployment_name"
        return 1
    fi
}

# Main update process
main() {
    print_status "Starting deployment update..."
    
    # Verify PVC exists (just to confirm it won't be affected)
    if kubectl get pvc health-tracker-pvc -n $NAMESPACE &> /dev/null; then
        print_status "✓ PVC 'health-tracker-pvc' exists and will be preserved"
    else
        print_warning "PVC 'health-tracker-pvc' not found - deployments may fail if they require it"
    fi
    
    # Update backend
    if ! update_deployment "health-tracker-backend" "backend" "$BACKEND_IMAGE"; then
        print_error "Failed to update backend deployment"
        exit 1
    fi
    
    # Update frontend
    if ! update_deployment "health-tracker-frontend" "frontend" "$FRONTEND_IMAGE"; then
        print_error "Failed to update frontend deployment"
        exit 1
    fi
    
    print_status "✅ All deployments updated successfully!"
    echo ""
    print_status "Current pod status:"
    kubectl get pods -n $NAMESPACE -l 'app in (health-tracker-backend, health-tracker-frontend)'
    echo ""
    print_status "PVC status:"
    kubectl get pvc -n $NAMESPACE
}

# Run main function
main