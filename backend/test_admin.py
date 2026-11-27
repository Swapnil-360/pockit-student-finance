"""
Integration tests for Pockit Admin Panel API, Auth Guard, Streak Offers, and CSV Exports.
"""
from fastapi.testclient import TestClient

import admin_routes
from main import app

client = TestClient(app)


def test_admin_suite():
    if not admin_routes.ADMIN_PASSWORD:
        admin_routes.ADMIN_PASSWORD = "test-admin-password"
    test_email = admin_routes.ADMIN_EMAIL
    test_password = admin_routes.ADMIN_PASSWORD

    # 1. Unauthorized access blocked
    res_unauth = client.get("/api/admin/overview")
    assert res_unauth.status_code == 401, f"Expected 401, got {res_unauth.status_code}"

    # 2. Invalid login rejected
    res_bad = client.post("/api/admin/login", json={"email": test_email, "password": "wrong"})
    assert res_bad.status_code == 401

    # 3. Valid login succeeds
    res_ok = client.post("/api/admin/login", json={"email": test_email, "password": test_password})
    assert res_ok.status_code == 200, res_ok.text
    token = res_ok.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 4. Overview KPIs
    ov = client.get("/api/admin/overview", headers=headers)
    assert ov.status_code == 200, ov.text
    ov_data = ov.json()
    assert "total_users" in ov_data and "first_100_remaining" in ov_data

    # 5. Users list
    users_res = client.get("/api/admin/users", headers=headers)
    assert users_res.status_code == 200
    assert "users" in users_res.json()

    # 6. Streak offers & leaderboard
    lb_res = client.get("/api/streak/leaderboard")
    assert lb_res.status_code == 200, lb_res.text
    lb_data = lb_res.json()
    assert "top_10" in lb_data and "offers" in lb_data
    assert len(lb_data["offers"]) >= 1

    # 7. CSV export
    csv_res = client.get("/api/admin/export/users?format=csv", headers=headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")

    # 8. Model info
    mi_res = client.get("/api/admin/model-info", headers=headers)
    assert mi_res.status_code == 200
    assert mi_res.json()["model_exists"] is True

    # 9. Public announcements endpoint
    ann_res = client.get("/api/announcements")
    assert ann_res.status_code == 200
    assert "announcements" in ann_res.json()

    print("ALL ADMIN PANEL TESTS PASSED!")


if __name__ == "__main__":
    test_admin_suite()
