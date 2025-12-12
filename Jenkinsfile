pipeline {
  agent any

  environment {
    REGISTRY         = "docker.io/your-org"
    IMAGE_TAG        = "${env.GIT_COMMIT ?: 'dev'}"
    APP_NAME         = "sentinelcare"
    MODEL_PATH       = "models/mock_artifacts/sepsis_mock_model.json"
    COMPOSE_SERVICES = "backend frontend patients vitals alerts scoring auth tasks audit simulator notifications mongo"
    K8S_NAMESPACE    = "sentinelcare"
    HELM_CHART_PATH  = "infra/helm/sentinelcare"
    MICROSERVICES    = "patients vitals alerts scoring simulator auth tasks audit notifications"
    SONAR_HOST_URL   = "https://sonarqube.example.com"
  }

  options {
    timestamps()
    ansiColor('xterm')
    buildDiscarder(logRotator(numToKeepStr: '15'))
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh 'git status -sb'
      }
    }

    stage('Preparation') {
      steps {
        script {
          echo "--- DETECTING CHANGED SERVICES ---"
          def changed = []
          
          // Helper to check changes
          def checkChange = { path ->
            return sh(script: "git diff --name-only HEAD~1 HEAD | grep '^${path}' || true", returnStdout: true).trim() != ""
          }

          if (checkChange("backend/")) changed.add("backend")
          if (checkChange("frontend/")) changed.add("frontend")

          def microservices = ["patients", "vitals", "alerts", "scoring", "simulator", "auth", "tasks", "audit", "notifications"]
          microservices.each { svc ->
            if (checkChange("services/${svc}/")) changed.add(svc)
          }

          env.CHANGED_SERVICES = changed.join(" ")
          echo "Services to rebuild/deploy: ${env.CHANGED_SERVICES}"
        }
      }
    }

    stage('Static Analysis') {
      steps {
        sh '''
          python -m venv .venv
          . .venv/bin/activate
          pip install --upgrade pip
          pip install -r backend/requirements.txt ruff black mypy bandit pip-audit
          ruff check backend
          black --check backend
          mypy backend || true        # allow partial typing while we evolve
          bandit -r backend || true   # best-effort SAST
          pip-audit -r backend/requirements.txt || true
          cd frontend && corepack enable && pnpm install --frozen-lockfile && pnpm run lint
        '''
    }
  }

    stage('Unit Tests') {
      steps {
        sh '''
          . .venv/bin/activate
          pip install pytest pytest-asyncio
          PYTHONPATH=backend python -m pytest backend/tests
          cd frontend && pnpm test -- --watch=false
        '''
      }
    }

    stage('SonarQube Analysis') {
        steps {
            // This tells Jenkins to use the tool named 'sonar-scanner' we set up in Phase 3
            script {
                def scannerHome = tool 'sonar-scanner'
                withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                    sh """
                        ${scannerHome}/bin/sonar-scanner \
                        -Dsonar.projectKey=sentinelcare \
                        -Dsonar.sources=. \
                        -Dsonar.host.url=http://localhost:9000 \
                        -Dsonar.token=$SONAR_TOKEN
                    """
                }
            }
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
          . .venv/bin/activate
          PYTHONPATH=backend python - <<PY
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

stage('Build & Up (Compose)') {
    steps {
        script {
            echo "--- STARTING PORT-BASED CLEANUP ---"
            
            // Added 8081 and 8082 to cover Frontend and any other services
            def ports = [8000, 8001, 8002, 8080, 8081, 8082, 27017] + (8100..8110).toList()
            
            ports.each { port ->
                sh "docker ps -q --filter publish=${port} | xargs -r docker rm -f"
            }

            sh 'docker ps -aq --filter name=serenealcare | xargs -r docker rm -f'
            sh 'docker compose down -v --remove-orphans || true'
            sh 'docker network prune -f || true'

            echo "--- CLEANUP COMPLETE, STARTING BUILD ---"

            sh 'docker compose build backend frontend patients vitals alerts scoring auth tasks audit simulator notifications mongo'
            sh 'docker compose up -d backend frontend patients vitals alerts scoring auth tasks audit simulator notifications mongo'
        }
    }
}

stage('Smoke Tests') {
    steps {
        script {
            // Wait up to 60 seconds for the backend to start
            timeout(time: 60, unit: 'SECONDS') {
                waitUntil {
                    script {
                        // Added '|| echo "000"' to catch connection failures
                        def r = sh(script: 'curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/health || echo "000"', returnStdout: true).trim()
                        
                        echo "Backend Status: ${r}" // Print status for debugging
                        
                        return r == "200"
                    }
                }
            }
        }
    }
}
stage('Build Images (for registry)') {
      steps {
        script {
            def imageTag = env.GIT_COMMIT
            def org = "docker.io/narayanasrimanth"
            def changedServices = env.CHANGED_SERVICES.split(" ").findAll { it }

            if (changedServices.isEmpty()) {
                echo "No services changed. Skipping build."
            } else {
                changedServices.each { svc ->
                    echo "Building ${svc}..."
                    def dockerfile = (svc == "backend" || svc == "frontend") ? "${svc}/Dockerfile" : "services/${svc}/Dockerfile"
                    sh "docker build -f ${dockerfile} -t ${org}/sentinelcare-${svc}:${imageTag} ."
                }
            }
        }
      }
    }

    stage('Image Scan') {
      steps {
        script {
            echo "--- STARTING TRIVY SECURITY SCAN ---"
            def imageTag = env.GIT_COMMIT
            def org = "docker.io/narayanasrimanth"
            def changedServices = env.CHANGED_SERVICES.split(" ").findAll { it }

            if (changedServices.isEmpty()) {
                echo "No services changed. Skipping scan."
            } else {
                changedServices.each { svc ->
                    def image = "${org}/sentinelcare-${svc}:${imageTag}"
                    echo "Scanning ${image}..."
                    sh "trivy image --severity HIGH,CRITICAL --no-progress --timeout 15m --exit-code 0 ${image}"
                }
            }
        }
      }
    }

    stage('Push Images') {
      steps {
        script {
            echo "--- PUSHING IMAGES TO DOCKER HUB ---"
            
            withCredentials([usernamePassword(credentialsId: 'docker-creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
                
                def imageTag = env.GIT_COMMIT ?: "latest"
                def org = "docker.io/narayanasrimanth"
                def changedServices = env.CHANGED_SERVICES.split(" ").findAll { it }

                if (changedServices.isEmpty()) {
                    echo "No services changed. Skipping push."
                } else {
                    changedServices.each { svc ->
                        def image = "${org}/sentinelcare-${svc}:${imageTag}"
                        echo "Pushing ${image}..."
                        sh "docker push ${image}"
                    }
                }
            }
        }
      }
    }

    stage('Pull & Deploy to K8s') {
      steps {
        script {
            echo "--- DEPLOYING TO KUBERNETES ---"
            def imageTag = env.GIT_COMMIT
            def org = "docker.io/narayanasrimanth"
            def changedServices = env.CHANGED_SERVICES.split(" ").findAll { it }

            withKubeConfig([credentialsId: 'k8s-kubeconfig']) {
                sh 'kubectl create namespace sentinelcare || true'
                sh 'chmod +x ./infra/scripts/setup_vault.sh && ./infra/scripts/setup_vault.sh'
                sh 'helm repo add bitnami https://charts.bitnami.com/bitnami || true'
                sh 'helm repo add elastic https://helm.elastic.co || true'
                sh 'helm repo update'
                sh 'helm dependency build ./infra/helm/sentinelcare'

                def helmCmd = "helm upgrade --install sentinelcare ./infra/helm/sentinelcare --namespace sentinelcare --timeout 20m --wait"
                
                // Check if release exists
                def releaseExists = sh(script: "helm status sentinelcare -n sentinelcare", returnStatus: true) == 0
                
                if (releaseExists) {
                    helmCmd += " --reuse-values"
                    if (changedServices.isEmpty()) {
                         echo "No services changed. Helm upgrade will just apply chart changes."
                    } else {
                         changedServices.each { svc ->
                             helmCmd += " --set image.${svc}.tag=${imageTag}"
                         }
                    }
                } else {
                     // First deploy: set global tag
                     helmCmd += " --set global.image.tag=${imageTag} --set global.image.repository=${org}"
                }
                
                echo "Executing: ${helmCmd}"
                sh helmCmd
            }
        }
      }
    }
  }

  post {
    always {
      sh 'docker compose down -v || true'
    }
  }
}
