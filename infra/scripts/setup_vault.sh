#!/bin/bash
set -e

NAMESPACE="sentinelcare"
VAULT_RELEASE="vault"

echo "--- Installing HashiCorp Vault ---"
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update
helm upgrade --install $VAULT_RELEASE hashicorp/vault \
    --namespace $NAMESPACE \
    --set "server.dev.enabled=true" \
    --set "injector.enabled=true" \
    --set "ui.enabled=true" \
    --wait

echo "--- Waiting for Vault to be ready ---"
kubectl wait --for=condition=Ready pod -l app.kubernetes.io/name=vault -n $NAMESPACE --timeout=120s

echo "--- Configuring Vault ---"
# Enable Kubernetes Auth
kubectl exec -n $NAMESPACE vault-0 -- vault auth enable kubernetes

# Configure Kubernetes Auth
kubectl exec -n $NAMESPACE vault-0 -- sh -c '
    vault write auth/kubernetes/config \
        kubernetes_host="https://$KUBERNETES_PORT_443_TCP_ADDR:443" \
        token_reviewer_jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
        kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
        issuer="https://kubernetes.default.svc.cluster.local"
'

# Create Policy
kubectl exec -n $NAMESPACE vault-0 -- sh -c '
    vault policy write backend - <<EOF
path "secret/data/sentinelcare/backend" {
  capabilities = ["read"]
}
EOF
'

# Create Role
kubectl exec -n $NAMESPACE vault-0 -- vault write auth/kubernetes/role/backend \
    bound_service_account_names=default \
    bound_service_account_namespaces=$NAMESPACE \
    policies=backend \
    ttl=24h

# Write Secret
echo "--- Writing Secrets to Vault ---"
kubectl exec -n $NAMESPACE vault-0 -- vault kv put secret/sentinelcare/backend AUTH_SECRET="super-secret-demo-key"

echo "--- Vault Setup Complete ---"
