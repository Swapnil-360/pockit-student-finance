"""
Test savings goals and streak system.
"""
from fastapi.testclient import TestClient
from main import app
from database import db

client = TestClient(app)

def test_goals_and_streaks():
    user_id = "demo_student_001"

    # 1. Check streak
    res = client.get(f"/api/streak/{user_id}")
    assert res.status_code == 200, f"Streak failed: {res.text}"
    streak_data = res.json()
    assert "on_track_streak" in streak_data
    print(f"Streak for {user_id}: {streak_data['on_track_streak']} days")

    # 2. Check get active goals
    res = client.get(f"/api/goals/{user_id}")
    assert res.status_code == 200, f"Get goals failed: {res.text}"
    goals = res.json()
    assert len(goals) > 0
    active_goal = goals[0]
    goal_id = active_goal["id"]
    print(f"Active goal: {active_goal['title']}, Progress: {active_goal['progress_pct']}%, Saved: ৳{active_goal['current_saved']}")

    # 3. Test Boost Goal
    boost_res = client.put(f"/api/goals/{goal_id}/boost", json={"user_id": user_id, "amount": 500.0})
    assert boost_res.status_code == 200, f"Boost failed: {boost_res.text}"
    boosted = boost_res.json()
    assert boosted["current_saved"] == active_goal["current_saved"] + 500.0
    print(f"Boosted goal to ৳{boosted['current_saved']}, New Estimated Months Left: {boosted['estimated_months_left']}")

    # 4. Test Toggle Pause
    pause_res = client.put(f"/api/goals/{goal_id}/toggle-pause", json={"user_id": user_id})
    assert pause_res.status_code == 200, f"Toggle pause failed: {pause_res.text}"
    paused = pause_res.json()
    assert paused["is_paused"] is True
    print(f"Paused status: {paused['is_paused']}, Note: {paused.get('timeline_shift_note_en')}")

    # Unpause
    unpause_res = client.put(f"/api/goals/{goal_id}/toggle-pause", json={"user_id": user_id})
    assert unpause_res.status_code == 200
    unpaused = unpause_res.json()
    assert unpaused["is_paused"] is False

    # 5. Test Sweep Leftover
    sweep_res = client.post(f"/api/goals/{goal_id}/sweep", json={"user_id": user_id, "amount": 350.0})
    assert sweep_res.status_code == 200, f"Sweep failed: {sweep_res.text}"
    swept = sweep_res.json()
    print(f"Swept ৳350. New Saved: ৳{swept['current_saved']}")

    # 6. Check Dashboard has active_goal and on_track_streak
    dash_res = client.get(f"/api/dashboard/{user_id}")
    assert dash_res.status_code == 200
    dash = dash_res.json()
    assert dash.get("active_goal") is not None
    assert dash.get("on_track_streak") is not None
    print(f"Dashboard integrated with Goal: {dash['active_goal']['title']} and Streak: {dash['on_track_streak']} days")
    print("ALL GOAL TESTS PASSED!")

if __name__ == "__main__":
    test_goals_and_streaks()

