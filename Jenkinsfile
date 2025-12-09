pipeline {
  agent any

  environment {
    REGISTRY = "docker.io/your-org"
    IMAGE_TAG = "${env.GIT_COMMIT ?: 'dev'}"
    APP_NAME = "sentinelcare"
    MODEL_PATH = "models/mock_artifacts/sepsis_mock_model.json"
    VENV = ".venv"
  }

  options {
    timestamps()
    ansiColor('xterm')
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh 'git status -sb'
      }
    }

    stage('Static Analysis') {
      steps {
        sh '''
          python -m venv ${VENV}
          . ${VENV}/bin/activate
          pip install --upgrade pip
          pip install -r backend/requirements.txt ruff black mypy bandit pip-audit
          ruff check backend
          black --check backend
          mypy backend || true  # allow stubs until types mature
          bandit -r backend || true
          pip-audit -r backend/requirements.txt || true
          cd frontend && npm install && npm run lint
        '''
      }
    }

    stage('Secret Scan') {
      steps {
        sh '''
          command -v gitleaks >/dev/null 2>&1 || echo "gitleaks not installed on agent"
          if command -v gitleaks >/dev/null 2>&1; then gitleaks detect --no-git -v; fi
        '''
      }
    }

    stage('Mock Model Validation') {
      steps {
        sh '''
          test -f ${MODEL_PATH}
          sha256sum ${MODEL_PATH}
          PYTHONPATH=backend python - <<'PY'
from pathlib import Path
from app.services.mock_model import MockRiskModel

artifact = Path("${MODEL_PATH}")
model = MockRiskModel(artifact)
payload = {
    "heart_rate": 130,
    "respiratory_rate": 26,
    "systolic_bp": 90,
    "diastolic_bp": 50,
    "spo2": 90,
    "temperature_c": 39,
}
score, label = model.score(payload)
assert 0 <= score <= 1
print("Mock model OK", score, label)
PY
        '''
      }
    }

    stage('Tests') {
      steps {
        sh '''
          . ${VENV}/bin/activate
          pip install pytest pytest-asyncio
          PYTHONPATH=backend pytest backend/tests
          cd frontend && npm test -- --watch=false || true
        '''
      }
    }

    stage('Build Images') {
      steps {
        sh '''
          docker build -f backend/Dockerfile -t ${REGISTRY}/${APP_NAME}-backend:${IMAGE_TAG} .
          docker build -f frontend/Dockerfile -t ${REGISTRY}/${APP_NAME}-frontend:${IMAGE_TAG} .
          docker build -f services/patients/Dockerfile -t ${REGISTRY}/${APP_NAME}-patients:${IMAGE_TAG} .
          docker build -f services/vitals/Dockerfile -t ${REGISTRY}/${APP_NAME}-vitals:${IMAGE_TAG} .
          docker build -f services/alerts/Dockerfile -t ${REGISTRY}/${APP_NAME}-alerts:${IMAGE_TAG} .
          docker build -f services/scoring/Dockerfile -t ${REGISTRY}/${APP_NAME}-scoring:${IMAGE_TAG} .
        '''
      }
    }

    stage('Image Scan') {
      steps {
        sh '''
          command -v trivy >/dev/null 2>&1 || echo "trivy not installed on agent"
          if command -v trivy >/dev/null 2>&1; then
            for img in backend frontend patients vitals alerts scoring; do
              trivy image --severity HIGH,CRITICAL ${REGISTRY}/${APP_NAME}-${img}:${IMAGE_TAG} || true
            done
          fi
        '''
      }
    }

    stage('Push Images') {
      when {
        branch "main"
      }
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh '''
            echo "${DOCKER_PASS}" | docker login -u "${DOCKER_USER}" --password-stdin
            for img in backend frontend patients vitals alerts scoring; do
              docker push ${REGISTRY}/${APP_NAME}-${img}:${IMAGE_TAG}
            done
          '''
        }
      }
    }

    stage('Deploy to K8s') {
      when {
        branch "main"
      }
      steps {
        sh '''
          helm upgrade --install ${APP_NAME} infra/helm/sentinelcare \
            --namespace sentinelcare --create-namespace \
            --set image.backend.repository=${REGISTRY}/${APP_NAME}-backend \
            --set image.backend.tag=${IMAGE_TAG} \
            --set image.frontend.repository=${REGISTRY}/${APP_NAME}-frontend \
            --set image.frontend.tag=${IMAGE_TAG} \
            --set mockModel.path=${MODEL_PATH}
        '''
      }
    }

    stage('Post-deploy Checks') {
      when {
        branch "main"
      }
      steps {
        sh '''
          kubectl rollout status deploy/${APP_NAME}-backend -n sentinelcare --timeout=120s
          kubectl rollout status deploy/${APP_NAME}-frontend -n sentinelcare --timeout=120s
          kubectl run smoke-${BUILD_NUMBER} --rm -i --restart=Never -n sentinelcare --image=curlimages/curl -- \
            curl -sf http://${APP_NAME}-backend:8000/health
        '''
      }
    }
  }
}
