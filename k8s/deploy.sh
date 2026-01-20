#!/bin/bash

# Health Tracker Kubernetes Deployment Script

set -e

echo "🚀 Deploying Health Tracker to Kubernetes..."

# Create namespace
echo "📁 Creating namespace..."
kubectl apply -f namespace.yaml

# Create secrets (you should do this manually for security)
echo "🔐 Creating secrets..."
echo "⚠️  WARNING: Update secrets.yaml with your actual secrets before running!"
read -p "Have you updated the secrets? (y/N): " confirm
if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
    kubectl apply -f secrets.yaml
else
    echo "❌ Please update secrets first!"
    exit 1
fi

# Deploy storage
echo "💾 Setting up Longhorn storage..."
kubectl apply -f storage.yaml

# Wait for PVC to be bound
#echo "⏳ Waiting for PVC to be ready..."
#kubectl wait --for=condition=Bound pvc/health-tracker-pvc --namespace=health-tracker --timeout=60s

# Deploy backend
echo "🔧 Deploying backend..."
kubectl apply -f backend-deployment.yaml

# Deploy frontend
echo "🌐 Deploying frontend..."
kubectl apply -f frontend-deployment.yaml

# Create services
echo "🔗 Creating services..."
kubectl apply -f services.yaml

# Create ingress
echo "🌍 Creating ingress..."
kubectl apply -f ingress.yaml

# Wait for deployments to be ready
echo "⏳ Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/health-tracker-backend --namespace=health-tracker
kubectl wait --for=condition=available --timeout=300s deployment/health-tracker-frontend --namespace=health-tracker

echo "✅ Health Tracker deployed successfully!"
echo ""
echo "📋 Deployment Status:"
kubectl get pods --namespace=health-tracker
echo ""
echo "🔗 Services:"
kubectl get services --namespace=health-tracker
echo ""
echo "🌍 Ingress:"
kubectl get ingress --namespace=health-tracker
echo ""
echo "💡 Next steps:"
echo "1. Update your domain in ingress.yaml"
echo "2. Configure your Cloudflare tunnel to point to the ingress"
echo "3. Make sure you have a strong JWT secret in production!"