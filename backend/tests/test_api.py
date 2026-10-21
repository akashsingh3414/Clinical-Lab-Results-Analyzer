"""Tests for the FastAPI endpoints (/health and /analyze_labs).

The LLM is monkeypatched so these tests do not make network calls.
"""

import pytest
from fastapi.testclient import TestClient

from app.api import app


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def patch_llm(monkeypatch):
    """Stub out the LLM so API tests do not make network calls."""
    import app.services.llm_client as llm_mod

    # LLM stub — return a deterministic explanation
    async def _fake_explanation(test_name, value, unit, ref_low, ref_high, status, timeout=10):
        return {
            "explanation": f"Stub explanation for {test_name} ({status}).",
            "next_step": "Stub next step.",
        }

    monkeypatch.setattr(llm_mod, "get_explanation_async", _fake_explanation)


@pytest.fixture
def client():
    """TestClient triggers the startup / shutdown lifecycle."""
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------

class TestHealthEndpoint:
    def test_returns_200(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_returns_ok_status(self, client):
        resp = client.get("/health")
        assert resp.json() == {"status": "ok"}

    def test_api_prefixed_health_route(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# /analyze_labs — input format variants
# ---------------------------------------------------------------------------

class TestAnalyzeLabsEndpoint:
    NORMAL_HGB = {"test_name": "Hemoglobin", "value": 15.0, "unit": "g/dL"}
    CRITICAL_HGB = {"test_name": "Hemoglobin", "value": 6.5, "unit": "g/dL"}
    WARNING_GLU = {"test_name": "Glucose", "value": 105.0, "unit": "mg/dL"}
    NORMAL_WBC = {"test_name": "WBC", "value": 7.5, "unit": "x10^9/L"}

    # ── raw_results wrapper ──────────────────────────────────────────────

    def test_raw_results_200(self, client):
        resp = client.post("/analyze_labs", json={"raw_results": [self.NORMAL_HGB]})
        assert resp.status_code == 200

    def test_api_prefixed_route(self, client):
        resp = client.post("/api/analyze_labs", json={"raw_results": [self.NORMAL_HGB]})
        assert resp.status_code == 200

    def test_raw_results_response_shape(self, client):
        resp = client.post("/analyze_labs", json={"raw_results": [self.NORMAL_HGB]})
        body = resp.json()
        assert body["status"] == "ok"
        assert "results" in body
        routed = body["results"]
        for bucket in ("Critical", "Warning", "Normal", "Unknown"):
            assert bucket in routed

    def test_normal_hemoglobin_lands_in_normal_bucket(self, client):
        resp = client.post("/analyze_labs", json={"raw_results": [self.NORMAL_HGB]})
        normal = resp.json()["results"]["Normal"]
        names = [r["test_name"] for r in normal]
        assert "Hemoglobin" in names

    def test_critical_hemoglobin_lands_in_critical_bucket(self, client):
        resp = client.post("/analyze_labs", json={"raw_results": [self.CRITICAL_HGB]})
        critical = resp.json()["results"]["Critical"]
        names = [r["test_name"] for r in critical]
        assert "Hemoglobin" in names

    def test_warning_glucose_lands_in_warning_bucket(self, client):
        resp = client.post("/analyze_labs", json={"raw_results": [self.WARNING_GLU]})
        warning = resp.json()["results"]["Warning"]
        names = [r["test_name"] for r in warning]
        assert "Glucose" in names

    # ── labs wrapper ─────────────────────────────────────────────────────

    def test_labs_wrapper_200(self, client):
        resp = client.post("/analyze_labs", json={"labs": [self.NORMAL_HGB]})
        assert resp.status_code == 200

    def test_labs_wrapper_same_result_as_raw_results(self, client):
        r1 = client.post("/analyze_labs", json={"raw_results": [self.NORMAL_HGB]}).json()
        r2 = client.post("/analyze_labs", json={"labs": [self.NORMAL_HGB]}).json()
        # Both should classify Hemoglobin as Normal
        names1 = [r["test_name"] for r in r1["results"]["Normal"]]
        names2 = [r["test_name"] for r in r2["results"]["Normal"]]
        assert "Hemoglobin" in names1
        assert "Hemoglobin" in names2

    # ── multi-item batch ─────────────────────────────────────────────────

    def test_batch_of_three_results(self, client):
        payload = {"raw_results": [self.CRITICAL_HGB, self.WARNING_GLU, self.NORMAL_WBC]}
        resp = client.post("/analyze_labs", json=payload)
        assert resp.status_code == 200
        results = resp.json()["results"]
        total = sum(len(v) for v in results.values())
        assert total == 3

    def test_batch_correct_bucket_counts(self, client):
        payload = {"raw_results": [self.CRITICAL_HGB, self.WARNING_GLU, self.NORMAL_WBC]}
        results = client.post("/analyze_labs", json=payload).json()["results"]
        assert len(results["Critical"]) == 1
        assert len(results["Warning"])  == 1
        assert len(results["Normal"])   == 1

    # ── edge cases ───────────────────────────────────────────────────────

    def test_empty_raw_results_returns_empty_buckets(self, client):
        resp = client.post("/analyze_labs", json={"raw_results": []})
        assert resp.status_code == 200
        results = resp.json()["results"]
        assert all(len(v) == 0 for v in results.values())

    def test_result_has_explanation_and_next_step(self, client):
        resp = client.post("/analyze_labs", json={"raw_results": [self.NORMAL_HGB]})
        results = resp.json()["results"]
        all_items = [item for bucket in results.values() for item in bucket]
        assert len(all_items) == 1
        item = all_items[0]
        assert "explanation" in item
        assert "next_step" in item
