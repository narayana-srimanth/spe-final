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
            // Define your variables clearly
            def imageTag = env.GIT_COMMIT // Ensure this matches the Push stage logic!
            def org = "docker.io/narayanasrimanth" // <--- UPDATE THIS
            
            // Build Backend
            sh "docker build -f backend/Dockerfile -t ${org}/sentinelcare-backend:${imageTag} ."
            
            // Build Frontend
            sh "docker build -f frontend/Dockerfile -t ${org}/sentinelcare-frontend:${imageTag} ."
            
            // Build All Other Microservices
            def services = [
                'auth', 'patients', 'vitals', 'alerts', 
                'scoring', 'tasks', 'audit', 'simulator', 'notifications'
            ]
            
            services.each { service ->
                sh "docker build -f services/${service}/Dockerfile -t ${org}/sentinelcare-${service}:${imageTag} ."
            }
        }
    }
}

stage('Image Scan') {
    steps {
        script {
            echo "--- STARTING TRIVY SECURITY SCAN ---"
            
            // Define the list of images to scan
            // TIP: Use the same tag variable you used in the Build stage
            def imageTag = env.GIT_COMMIT // ideally use env.GIT_COMMIT
            def org = "docker.io/narayanasrimanth"
            
            def images = [
                "${org}/sentinelcare-backend:${imageTag}",
                "${org}/sentinelcare-frontend:${imageTag}",
                "${org}/sentinelcare-auth:${imageTag}",
                "${org}/sentinelcare-patients:${imageTag}",
                "${org}/sentinelcare-vitals:${imageTag}",
                "${org}/sentinelcare-alerts:${imageTag}",
                "${org}/sentinelcare-scoring:${imageTag}",
                "${org}/sentinelcare-tasks:${imageTag}",
                "${org}/sentinelcare-audit:${imageTag}",
                "${org}/sentinelcare-simulator:${imageTag}",
                "${org}/sentinelcare-notifications:${imageTag}"
            ]

            images.each { image ->
                echo "Scanning ${image}..."
                // --exit-code 0: Shows vulnerabilities but DOES NOT fail the build
                // --severity HIGH,CRITICAL: Only reports serious issues
                sh "trivy image --severity HIGH,CRITICAL --no-progress --exit-code 0 ${image}"
            }
        }
    }
}

stage('Push Images') {
    // Only run this on the main branch (or remove 'when' to run everywhere)
    steps {
        script {
            echo "--- PUSHING IMAGES TO DOCKER HUB ---"
            
            // 1. Log in to Docker Hub using the credentials ID 'docker-hub-creds'
            withCredentials([usernamePassword(credentialsId: 'docker-creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
                
                // 2. Define your images (Ensure 'your-org' is replaced with your Docker Hub username!)
                def imageTag = env.GIT_COMMIT ?: "latest" // OR use env.GIT_COMMIT if you have it setup
                def org = "docker.io/narayanasrimanth" // <--- CHANGE THIS TO YOUR DOCKER HUB USERNAME
                
                def images = [
                    "${org}/sentinelcare-backend:${imageTag}",
                    "${org}/sentinelcare-frontend:${imageTag}",
                    "${org}/sentinelcare-auth:${imageTag}",
                    "${org}/sentinelcare-patients:${imageTag}",
                    "${org}/sentinelcare-vitals:${imageTag}",
                    "${org}/sentinelcare-alerts:${imageTag}",
                    "${org}/sentinelcare-scoring:${imageTag}",
                    "${org}/sentinelcare-tasks:${imageTag}",
                    "${org}/sentinelcare-audit:${imageTag}",
                    "${org}/sentinelcare-simulator:${imageTag}",
                    "${org}/sentinelcare-notifications:${imageTag}"
                ]

                // 3. Push each image
                images.each { image ->
                    echo "Pushing ${image}..."
                    sh "docker push ${image}"
                }
            }
        }
    }
}

stage('Pull & Deploy to K8s') {
    // We removed the 'when' block so this always runs
    steps {
        script {
            echo "--- DEPLOYING TO KUBERNETES ---"
            
            def imageTag = env.GIT_COMMIT // Ensure this matches previous stages
            def org = "docker.io/narayanasrimanth"
            
            // This requires the 'Kubernetes CLI' plugin in Jenkins
            withKubeConfig([credentialsId: 'k8s-kubeconfig']) {
                
                // 1. Create the namespace if it doesn't exist
                sh 'kubectl create namespace sentinelcare || true'
                
                // 2. Add Helm repos and build dependencies
                sh 'helm repo add bitnami https://charts.bitnami.com/bitnami || true'
                sh 'helm repo add elastic https://helm.elastic.co || true'
                sh 'helm repo update'
                sh 'helm dependency build ./infra/helm/sentinelcare'

                // 3. Deploy using Helm
                // --set global.image.tag overwrites the tag in your values.yaml with the new one
                // --set global.image.repository sets your Docker Hub username
                sh """
                    helm upgrade --install sentinelcare ./infra/helm/sentinelcare \
                    --namespace sentinelcare \
                    --set global.image.tag=${imageTag} \
                    --set global.image.repository=${org} \
                    --wait
                """
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
