from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import Appointment, Inquiry


def test_public_appointment_tool_records_request(monkeypatch):
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    try:
        from app.agent.tools import book_appointment_request
        result = book_appointment_request.invoke({
            "name": "Test Visitor",
            "email": "visitor@example.com",
            "preferred_time": "Friday afternoon",
            "purpose": "Portfolio consultation",
        })
        assert "recorded" in result.lower()
        db = Session()
        try:
            rows = db.query(Appointment).all()
            assert len(rows) == 1
            assert rows[0].email == "visitor@example.com"
        finally:
            db.close()
    finally:
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


def test_admin_dashboard_routes_remain_available():
    paths = {route.path for route in app.routes}
    assert "/admin/login" in paths
    assert "/admin/me" in paths
    assert "/admin/inquiries" in paths
    assert "/admin/appointments" in paths
    assert "/admin/jobs" not in paths
    assert "/admin/jobs/search-now" not in paths
