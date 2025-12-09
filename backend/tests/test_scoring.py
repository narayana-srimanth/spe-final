from pathlib import Path

from app.services.mock_model import MockRiskModel


def test_mock_model_golden_scores_high():
    artifact = Path(__file__).resolve().parents[2] / "models" / "mock_artifacts" / "sepsis_mock_model.json"
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
    assert label == "high"


def test_mock_model_golden_scores_normal():
    artifact = Path(__file__).resolve().parents[2] / "models" / "mock_artifacts" / "sepsis_mock_model.json"
    model = MockRiskModel(artifact)
    payload = {
        "heart_rate": 80,
        "respiratory_rate": 16,
        "systolic_bp": 125,
        "diastolic_bp": 75,
        "spo2": 98,
        "temperature_c": 36.8,
    }
    score, label = model.score(payload)
    assert 0 <= score <= 1
    assert label == "normal"
