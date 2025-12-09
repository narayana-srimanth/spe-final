# SentinelCare DevSecOps Final Project Plan

## Goals and Success Criteria (rubric alignment)
- Working project (20): GitHub -> Jenkins webhook pipeline builds, tests, scans, publishes Docker Hub images, deploys to K8s; refresh shows new build; ELK/Kibana shows logs per service.
- Advanced features (3): Vault-backed secrets, modular Ansible roles, K8s HPA on key services.
- Innovation (2): Digital-twin timelines, explainable mock scoring, clinician-in-the-loop, live patching via canary/blue-green.
- Domain-specific (5): Healthcare (sepsis/deterioration) with FHIR/HL7 sandbox integration.

## Problem Statement and Vision
- Rural/understaffed hospitals miss early sepsis/acute deterioration signals; manual charting delays escalation.
- Build SentinelCare: edge-to-cloud observability and risk scoring (fixed mock models), clinician console, and care orchestration with zero-downtime updates and end-to-end automation.

## Solution Overview
- Multi-modal ingestion (BLE/HL7/FHIR/CSV), streaming enrichment, and risk scoring with packaged mock models.
- Clinician web console (alerts, patient timeline), ops console, and optional patient mobile app.
- FHIR-compliant integration back to hospital EHR; telehealth/messaging for care team coordination.
- Isolation per hospital tenant; offline-friendly edge cache where needed.

## Architecture (high level)
- Clients: React/TypeScript SPA, OIDC (Keycloak/Okta), WebSocket/SSE for live alerts.
- Gateway/mesh: API gateway with WAF/rate limiting; Istio service mesh for mTLS, retries, circuit breaking.
- Services (FastAPI microservices):
  - API Gateway/BFF
  - Patient and Care Plan
  - Device and Vitals
  - Risk Scoring (loads fixed mock model artifacts)
  - Alert/Notification
  - Integration (FHIR/HL7 sandbox)
  - Audit/Compliance
- Ingestion: MQTT/REST gateway; Kafka + schema registry; stream processor (Faust/Flink/ksqlDB) for cleaning/enrichment.
- Data: Postgres (clinical), TimescaleDB (vitals time-series), Redis (cache), MinIO/S3 (artifacts/raw feeds), MLflow optional registry for mock artifacts.
- Observability: Filebeat/Fluentbit -> ELK for logs; Prometheus/Grafana for metrics; Jaeger for traces.
- Security: Vault for secrets, OPA/Gatekeeper policies, Falco runtime, non-root/read-only containers.
- Scaling/resilience: HPA on Risk Scoring and Alert services using queue depth and p95 latency; PodDisruptionBudgets; Argo Rollouts for canary/blue-green; live patching via surge rolling updates.

## Key Flows
- Vitals -> gateway -> Kafka (schema validated) -> stream processor -> Risk Scoring -> scores/events persisted -> Alert/Notification triggers messages and UI updates.
- Care actions stored in Care Plan; Integration service syncs to FHIR sandbox; Audit logs all actions immutably.
- API gateway enforces authZ/authN, WAF, rate limits; Istio handles mTLS and traffic splitting.

## DevSecOps Automation (Jenkins with GitHub webhook)
- Trigger: PR + main branch via GitHub Hook for GITScm polling.
- Stages:
  1) Checkout; version/metadata check.
  2) Static quality: Ruff/Black + mypy; ESLint/Prettier; OpenAPI contract validation.
  3) Security: gitleaks (secrets), Bandit (SAST), pip-audit, npm audit, Trivy base image scan, Checkov on Terraform/Helm/Ansible.
  4) Tests: pytest unit/component; FastAPI testclient; React testing library; contract tests vs mock FHIR sandbox; mock model inference tests (golden outputs from fixed artifacts); synthetic stream tests.
  5) Build: Docker multi-stage images for backend, frontend, ingestion, stream processor; tag with git sha and semver.
  6) Scan: Trivy image scan, fail on high/critical unless waived with expiry.
  7) Push: Docker Hub org/repo (sha and semver tags).
  8) Deploy: Helm/Kustomize apply via kubectl; Vault Agent/CSI inject secrets; apply HPA; Argo Rollouts canary/blue-green with auto-rollback on health signals.
  9) Post-deploy verification: smoke/API/E2E (Playwright/Cypress); synthetic vitals load to exercise HPA; Kibana log check; Grafana SLO check; contract replay.
  10) Publish: coverage, SonarQube quality gate, SBOM (Syft), cosign attestation if available, changelog/release notes.
- Fixed mock models in pipeline: artifacts stored in repo or artifact bucket; checksum validation; unit/golden tests; packaged as wheel/ONNX; mounted read-only into Risk Scoring; no training step in CI/CD.

## IaC and Environments
- Environments: dev (ephemeral), stage, prod; separate namespaces, Vault mounts, Docker tags.
- Helm charts per service + shared dependencies; Kustomize overlays per env.
- Ansible roles (modular) for Jenkins agents, Docker hosts, K8s prereqs, ELK, Vault bootstrap, and app bootstrap.
- Optional Terraform for cluster and managed services; PVCs for Postgres/Timescale/MinIO/ELK with backup jobs to S3/MinIO.

## Security and Compliance
- AuthN/Z: OIDC for users; service accounts with least privilege; RBAC/ABAC for clinician roles.
- Data: TLS everywhere; PHI encryption at rest; field-level masking for analytics; immutable audit logging.
- Policy: OPA/Gatekeeper to enforce allowed registries, non-root/read-only FS, resource limits, required labels/owners, signed images (if cosign).
- Runtime: Falco alerts on anomalies; liveness/readiness; PodDisruptionBudgets and restart budgets.
- Secrets: Vault for DB creds, API keys, certs; short-lived tokens; no secrets in Git.

## Observability and SLOs
- Logs: per-service pipelines into ELK; Kibana dashboards for API, Risk Scoring, Alert, Audit.
- Metrics: Prometheus on latency/error/SLOs; custom metrics for queue depth and scoring latency; Grafana dashboards.
- Tracing: OpenTelemetry into Jaeger; spans for ingestion -> scoring -> alert path.
- Alerting: on SLO burn, error spikes, HPA saturation, ingestion lag, Vault seal state.

## Demo Script (to earn marks)
- Commit triggers Jenkins: build/test/scan -> Docker Hub push -> Helm deploy via Argo Rollouts -> refresh React UI shows new build hash/version -> Kibana displays new logs.
- Run synthetic vitals to show real-time alerts and HPA scaling; show Vault secret injection; show Kibana dashboards and Grafana SLOs; toggle canary/rollback to prove live patching.

## Backlog (initial slices)
- Repos: scaffold backend (FastAPI), frontend (React/TS), infra (Helm/Kustomize/Ansible/Terraform optional), ops (dashboards, scripts).
- Define schemas: OpenAPI for services; Avro/Protobuf for Kafka messages; FHIR mappings.
- Implement service skeletons with OIDC, health, and mock model loader; add alert and care-plan flows.
- React shell with auth, alerts feed, patient timeline; WebSocket/SSE integration.
- Kafka + stream processor scaffold; synthetic data generator.
- Helm charts and Kustomize overlays; Ansible roles for platform deps; Jenkinsfile matching stages.
- Observability: ELK/Fluentbit, Prometheus, Jaeger, dashboards; HPA manifests; Argo Rollouts templates.
- Tests: unit/component, contract, E2E harness; synthetic load script for vitals.

## Risks and Mitigations
- Complexity of infra bring-up: use layered bring-up (dev namespace first), good defaults in Helm values, dry-run + kubeval.
- Security scan noise: maintain allowlist with expiry; pin base images; SBOM to track deps.
- Resource limits on demo hardware: allow compose-based fallback for local smoke; scale down resource requests in dev.
- Time: prioritize Jenkinsfile, Helm, Ansible roles, and a vertical slice (ingest -> scoring -> alert -> UI) for early demoability.
