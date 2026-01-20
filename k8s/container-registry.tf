# Namespace
resource "kubernetes_namespace" "registry" {
  metadata {
    name = "registry"
  }
}

# TLS Certificate (self-signed)
resource "tls_private_key" "registry_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "tls_self_signed_cert" "registry_cert" {
  private_key_pem = tls_private_key.registry_key.private_key_pem

  subject {
    common_name         = "docker-registry.registry.svc.cluster.local"
    organization        = "Local Development"
    organizational_unit = "Container Registry"
    locality            = "Local"
    province            = "Local" 
    country             = "US"
  }

  dns_names = [
    "docker-registry.registry.svc.cluster.local",
    "docker-registry.registry",
    "docker-registry", 
    "localhost"
  ]

  ip_addresses = [
    "127.0.0.1",
    "192.168.1.201"  # Your node IP
  ]

  validity_period_hours = 8760  # 1 year

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth"
  ]
}

# Kubernetes secret for TLS certificate
resource "kubernetes_secret" "registry_tls" {
  metadata {
    name      = "registry-tls"
    namespace = kubernetes_namespace.registry.metadata[0].name
  }

  type = "kubernetes.io/tls"

  data = {
    "tls.crt" = tls_self_signed_cert.registry_cert.cert_pem
    "tls.key" = tls_private_key.registry_key.private_key_pem
  }
}

# Persistent Volume Claim
resource "kubernetes_persistent_volume_claim" "registry_pvc" {
  metadata {
    name      = "registry-pvc"
    namespace = kubernetes_namespace.registry.metadata[0].name
  }

  spec {
    access_modes       = ["ReadWriteOnce"]
    storage_class_name = "longhorn"

    resources {
      requests = {
        storage = "20Gi"
      }
    }
  }
}

# Deployment
resource "kubernetes_deployment" "docker_registry" {
  metadata {
    name      = "docker-registry"
    namespace = kubernetes_namespace.registry.metadata[0].name
    labels = {
      app = "docker-registry"
    }
  }

  spec {
    replicas = 1

    selector {
      match_labels = {
        app = "docker-registry"
      }
    }

    template {
      metadata {
        labels = {
          app = "docker-registry"
        }
      }

      spec {
        container {
          name  = "registry"
          image = "registry:2"

          port {
            name           = "registry"
            container_port = 5000
          }

          env {
            name  = "REGISTRY_HTTP_ADDR"
            value = ":5000"
          }
          env {
            name  = "REGISTRY_HTTP_TLS_CERTIFICATE"
            value = "/certs/tls.crt"
          }
          env {
            name  = "REGISTRY_HTTP_TLS_KEY"
            value = "/certs/tls.key"
          }
          env {
            name  = "REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY"
            value = "/var/lib/registry"
          }

          volume_mount {
            name       = "registry-storage"
            mount_path = "/var/lib/registry"
          }
          
          volume_mount {
            name       = "registry-certs"
            mount_path = "/certs"
            read_only  = true
          }
        }

        volume {
          name = "registry-storage"

          persistent_volume_claim {
            claim_name = kubernetes_persistent_volume_claim.registry_pvc.metadata[0].name
          }
        }
        
        volume {
          name = "registry-certs"
          
          secret {
            secret_name = kubernetes_secret.registry_tls.metadata[0].name
          }
        }
      }
    }
  }
}

# Service
resource "kubernetes_service" "docker_registry" {
  metadata {
    name      = "docker-registry"
    namespace = kubernetes_namespace.registry.metadata[0].name
  }

  spec {
    selector = {
      app = "docker-registry"
    }

    # expose on the network
    type = "NodePort"

    port {
      port        = 5000       # inside the cluster
      target_port = 5000       # containerPort
      protocol    = "TCP"
      node_port   = 32000      # <-- pick any unused port in 30000–32767
    }
  }
}

# Output the certificate for local Docker configuration
output "registry_certificate" {
  description = "Self-signed certificate for the Docker registry - save this to trust locally"
  value       = tls_self_signed_cert.registry_cert.cert_pem
  sensitive   = false
}

output "registry_setup_instructions" {
  description = "Instructions for setting up local Docker to trust the registry"
  value = <<EOT
To configure your local Docker to trust the self-signed certificate:

1. Create the certificate directory:
   sudo mkdir -p /etc/docker/certs.d/192.168.1.201:32000

2. Save the certificate (run: terraform output -raw registry_certificate > registry.crt):
   sudo cp registry.crt /etc/docker/certs.d/192.168.1.201:32000/ca.crt

3. Restart Docker daemon:
   sudo systemctl restart docker

4. Test with:
   docker push 192.168.1.201:32000/test-image

Registry URLs:
- External: https://192.168.1.201:32000 
- Internal: https://docker-registry.registry.svc.cluster.local:5000
EOT
}
