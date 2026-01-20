# Health Tracker Deployment Guide

## Docker Containers Created

### Backend Container
- **Path**: `server/Dockerfile`
- **Features**: Node.js API, SQLite database, JWT authentication
- **Security**: Non-root user, health checks, resource limits
- **Port**: 3001

### Frontend Container
- **Path**: `client/Dockerfile`
- **Features**: React SPA served by Nginx, optimized static assets
- **Security**: Non-root user, security headers, gzip compression
- **Port**: 80

## Kubernetes Deployment

### Storage (Longhorn)
- **File**: `k8s/storage.yaml`
- **Features**:
  - Longhorn StorageClass with 3 replicas
  - 1GB PVC for SQLite database
  - Retain policy for data safety

### Architecture
```
Cloudflare Tunnel -> Ingress -> {
  /api/* -> Backend Service -> Backend Pods
  /*     -> Frontend Service -> Frontend Pods
}
```

### Key Files
- `k8s/namespace.yaml` - Health tracker namespace
- `k8s/backend-deployment.yaml` - Backend deployment (2 replicas)
- `k8s/frontend-deployment.yaml` - Frontend deployment (2 replicas)
- `k8s/services.yaml` - Internal services
- `k8s/ingress.yaml` - External access routing
- `k8s/secrets.yaml` - Secrets template (configure before use)
- `k8s/deploy.sh` - Automated deployment script

## Deployment Steps

### 1. Build & Push Images
```bash
# Build backend
cd server
docker build -t your-registry/health-tracker-backend:latest .
docker push your-registry/health-tracker-backend:latest

# Build frontend
cd ../client
docker build -t your-registry/health-tracker-frontend:latest .
docker push your-registry/health-tracker-frontend:latest
```

### 2. Update Kubernetes Manifests
```bash
# Update image names in deployments
sed -i 's/health-tracker-backend:latest/your-registry\/health-tracker-backend:latest/g' k8s/backend-deployment.yaml
sed -i 's/health-tracker-frontend:latest/your-registry\/health-tracker-frontend:latest/g' k8s/frontend-deployment.yaml

# Update domain in ingress
sed -i 's/your-domain.com/your-actual-domain.com/g' k8s/ingress.yaml
```

### 3. Create Strong Secrets
```bash
# Generate strong JWT secret
openssl rand -base64 32

# Generate password hash
cd server && npm run generate-password

# Update k8s/secrets.yaml with:
# - Strong JWT secret
# - Secure password hash
# - Your actual email/username
```

### 4. Deploy to Kubernetes
```bash
cd k8s
./deploy.sh
```

### 5. Configure Cloudflare Tunnel
Point your Cloudflare tunnel to the Kubernetes ingress service.

## Security Features

### Container Security
- Non-root users (1001 for backend, 101 for frontend)
- Read-only root filesystems where possible
- Dropped all capabilities
- Resource limits and requests
- Health checks for reliability

### Kubernetes Security
- Network policies ready
- Pod security contexts
- Secrets management
- Resource quotas
- Longhorn encrypted storage

### Application Security
- JWT authentication
- CORS protection
- Security headers (CSP, XSS protection, etc.)
- Input validation
- User isolation (all data scoped to user_id)

## Local Testing

Use Docker Compose for local development:
```bash
docker-compose up -d
```
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Monitoring

### Health Checks
- Backend: `GET /health`
- Frontend: `GET /` (main page)
- Both have Kubernetes liveness/readiness probes

### Logs
```bash
# Backend logs
kubectl logs -f deployment/health-tracker-backend -n health-tracker

# Frontend logs
kubectl logs -f deployment/health-tracker-frontend -n health-tracker
```

## Important Security Notes

1. **Change JWT Secret**: Use a strong, random 32+ character secret
2. **Set Secure Password**: Generate a password hash using `npm run generate-password`
3. **Secrets Management**: Consider using external secret management (Vault, etc.)
4. **TLS**: Cloudflare provides TLS termination
5. **Rate Limiting**: Consider adding rate limiting middleware
6. **Backup**: Regular Longhorn snapshots of the database

## Updates

To update the application:
1. Build and push new container images
2. Update image tags in deployments
3. Run `kubectl apply -f k8s/`
4. Kubernetes will rolling update with zero downtime
