from fastapi.testclient import TestClient

from app.main import API_VERSION, create_app

client = TestClient(create_app())


def test_health_v1_returns_ok_and_security_headers() -> None:
    response = client.get("/v1/health")

    assert response.status_code == 200
    assert response.headers.get("cache-control") == "no-store"
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert response.headers.get("x-frame-options") == "DENY"
    assert response.headers.get("referrer-policy") == "no-referrer"
    assert response.json() == {
        "status": "ok",
        "service": "luca-api",
        "version": API_VERSION,
        "vision_provider": "simple-border",
    }


def test_health_root_alias_returns_ok() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.headers.get("cache-control") == "no-store"
    assert response.json()["status"] == "ok"


def test_openapi_schema_exposed_at_v1_includes_vision() -> None:
    response = client.get("/v1/openapi.json")

    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "Luca API"
    assert "/v1/health" in schema["paths"]
    assert "/v1/vision/analyze" in schema["paths"]
