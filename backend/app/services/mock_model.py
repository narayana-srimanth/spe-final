import json
import math
from pathlib import Path
from typing import Dict, Tuple

from ..core.config import get_settings


class MockRiskModel:
    """
    Loads a fixed mock model artifact and performs a simple logistic scoring.

    Artifact format:
    {
      "version": "v1",
      "intercept": -3.0,
      "weights": {"heart_rate": 0.03, ...},
      "threshold": 0.5
    }
    """

    def __init__(self, artifact_path: Path):
        self.artifact_path = artifact_path
        self.version = "unknown"
        self.intercept = 0.0
        self.weights: Dict[str, float] = {}
        self.threshold = 0.5
        self._load()

    def _load(self) -> None:
        payload = json.loads(self.artifact_path.read_text())
        self.version = payload.get("version", "unknown")
        self.intercept = float(payload.get("intercept", 0.0))
        self.weights = {k: float(v) for k, v in payload.get("weights", {}).items()}
        self.threshold = float(payload.get("threshold", 0.5))

    def score(self, features: Dict[str, float]) -> Tuple[float, str]:
        z = self.intercept
        for name, weight in self.weights.items():
            z += weight * float(features.get(name, 0.0))
        prob = 1 / (1 + math.exp(-z))
        label = "high" if prob >= self.threshold else "normal"
        return prob, label


def get_model() -> MockRiskModel:
    settings = get_settings()
    return MockRiskModel(settings.model_path)
