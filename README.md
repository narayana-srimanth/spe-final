# SentinelCare (DevSecOps Final Project)

This repo scaffolds the SentinelCare healthcare project using FastAPI, React, K8s, Helm, Ansible, Jenkins, and Docker. It includes a mock sepsis model to keep CI/CD deterministic and to satisfy rubric requirements.

## Quick start (local)
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
MODEL_PATH=models/mock_artifacts/sepsis_mock_model.json uvicorn app.main:app --reload --app-dir backend
```

```bash
cd frontend
npm install
VITE_API_BASE=http://localhost:8000 npm run dev
```

Or run with Docker Compose:
```bash
docker-compose up --build
```

## Tests
```bash
PYTHONPATH=backend pytest backend/tests
cd frontend && npm test -- --watch=false
```

## CI/CD (Jenkins)
- GitHub webhook triggers Jenkinsfile.
- Stages: checkout -> lint/type check -> secrets/SAST/deps -> mock model validation -> tests -> docker build/scan (backend, frontend, patients, vitals, alerts, scoring) -> push -> helm deploy -> post-deploy smoke.

## K8s deploy
```bash
helm upgrade --install sentinelcare infra/helm/sentinelcare \
  --namespace sentinelcare --create-namespace \
  --set image.backend.repository=docker.io/your-org/sentinelcare-backend \
  --set image.frontend.repository=docker.io/your-org/sentinelcare-frontend
```

Kustomize overlays live in `infra/kustomize/overlays/{dev,stage,prod}` and Ansible roles in `infra/ansible`.

## Microservices
- API Gateway (backend) on port 8000 proxies to:
  - Patients service (8101) for CRUD and seed data.
  - Vitals service (8102) for ingest and logical generation.
  - Alerts service (8103) for alert feed/ack.
  - Scoring service (8104) using the mock model artifact.
- `docker-compose.yml` runs all services; the frontend calls the gateway.
- MongoDB (mongo:7) is added as a separate service for persistence (patients, vitals, alerts) with a volume (`mongo-data`).
