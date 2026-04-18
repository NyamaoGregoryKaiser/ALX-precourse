#include <gtest/gtest.h>
#include <nlohmann/json.hpp>
#include "../../src/models/user.h"
#include "../../src/models/project.h"
#include "../../src/models/task.h"
#include "../../src/models/team.h"
#include <chrono>

// Helper to convert std::chrono::system_clock::time_point to string
extern std::string to_iso8601(const std::chrono::system_clock::time_point& tp);

TEST(UserModelTest, UserSerializationToJson) {
    User u;
    u.id = "test-user-id";
    u.username = "testuser";
    u.email = "test@example.com";
    u.password_hash = "hashed_password";
    u.created_at = std::chrono::system_clock::now();
    u.updated_at = std::chrono::system_clock::now();

    nlohmann::json j = u;

    ASSERT_EQ(j["id"], "test-user-id");
    ASSERT_EQ(j["username"], "testuser");
    ASSERT_EQ(j["email"], "test@example.com");
    ASSERT_FALSE(j.contains("password_hash")); // Should not expose password hash
    ASSERT_TRUE(j.contains("created_at"));
    ASSERT_TRUE(j.contains("updated_at"));
}

TEST(UserModelTest, UserDeserializationFromJson) {
    nlohmann::json j = {
        {"username", "newuser"},
        {"email", "new@example.com"},
        {"password", "mysecretpassword"},
        {"id", "should-be-ignored"}
    };

    User u;
    from_json(j, u);

    ASSERT_EQ(u.username, "newuser");
    ASSERT_EQ(u.email, "new@example.com");
    ASSERT_EQ(u.password_hash, "mysecretpassword"); // password_hash is temporary for service to hash
    ASSERT_TRUE(u.id.empty()); // ID should not be set from request JSON
}

TEST(ProjectModelTest, ProjectSerializationToJson) {
    Project p;
    p.id = "proj-id-1";
    p.name = "Test Project";
    p.description = "A detailed description.";
    p.start_date = "2023-01-01";
    p.end_date = "2023-12-31";
    p.status = "in-progress";
    p.owner_id = "user-id-1";
    p.team_id = "team-id-1";
    p.created_at = std::chrono::system_clock::now();
    p.updated_at = std::chrono::system_clock::now();

    nlohmann::json j = p;

    ASSERT_EQ(j["id"], "proj-id-1");
    ASSERT_EQ(j["name"], "Test Project");
    ASSERT_EQ(j["description"], "A detailed description.");
    ASSERT_EQ(j["start_date"], "2023-01-01");
    ASSERT_EQ(j["end_date"], "2023-12-31");
    ASSERT_EQ(j["status"], "in-progress");
    ASSERT_EQ(j["owner_id"], "user-id-1");
    ASSERT_EQ(j["team_id"], "team-id-1");
    ASSERT_TRUE(j.contains("created_at"));
    ASSERT_TRUE(j.contains("updated_at"));
}

TEST(ProjectModelTest, ProjectDeserializationFromJson) {
    nlohmann::json j = {
        {"name", "New Project"},
        {"description", "Another one."},
        {"status", "planning"},
        {"owner_id", "some-user-id"},
        {"team_id", nullptr} // Test nullopt
    };

    Project p;
    from_json(j, p);

    ASSERT_EQ(p.name, "New Project");
    ASSERT_TRUE(p.description.has_value());
    ASSERT_EQ(p.description.value(), "Another one.");
    ASSERT_EQ(p.status, "planning");
    ASSERT_EQ(p.owner_id, "some-user-id");
    ASSERT_FALSE(p.team_id.has_value());
}

TEST(TaskModelTest, TaskSerializationToJson) {
    Task t;
    t.id = "task-id-1";
    t.project_id = "proj-id-1";
    t.title = "Implement API";
    t.description = "Implement all CRUD endpoints.";
    t.due_date = "2023-05-30";
    t.status = "in-progress";
    t.assigned_to_id = "user-id-2";
    t.created_at = std::chrono::system_clock::now();
    t.updated_at = std::chrono::system_clock::now();

    nlohmann::json j = t;

    ASSERT_EQ(j["id"], "task-id-1");
    ASSERT_EQ(j["project_id"], "proj-id-1");
    ASSERT_EQ(j["title"], "Implement API");
    ASSERT_EQ(j["description"], "Implement all CRUD endpoints.");
    ASSERT_EQ(j["due_date"], "2023-05-30");
    ASSERT_EQ(j["status"], "in-progress");
    ASSERT_EQ(j["assigned_to_id"], "user-id-2");
    ASSERT_TRUE(j.contains("created_at"));
    ASSERT_TRUE(j.contains("updated_at"));
}

TEST(TaskModelTest, TaskDeserializationFromJson) {
    nlohmann::json j = {
        {"project_id", "proj-id-1"},
        {"title", "Refactor Code"},
        {"status", "todo"},
        {"assigned_to_id", nullptr} // Test nullopt
    };

    Task t;
    from_json(j, t);

    ASSERT_EQ(t.project_id, "proj-id-1");
    ASSERT_EQ(t.title, "Refactor Code");
    ASSERT_EQ(t.status, "todo");
    ASSERT_FALSE(t.assigned_to_id.has_value());
}

TEST(TeamModelTest, TeamSerializationToJson) {
    Team team;
    team.id = "team-id-1";
    team.name = "Team Alpha";
    team.description = "The best team.";
    team.created_at = std::chrono::system_clock::now();
    team.updated_at = std::chrono::system_clock::now();
    team.member_ids = {"user-id-1", "user-id-2"};

    nlohmann::json j = team;

    ASSERT_EQ(j["id"], "team-id-1");
    ASSERT_EQ(j["name"], "Team Alpha");
    ASSERT_EQ(j["description"], "The best team.");
    ASSERT_TRUE(j.contains("created_at"));
    ASSERT_TRUE(j.contains("updated_at"));
    ASSERT_TRUE(j.contains("member_ids"));
    ASSERT_EQ(j["member_ids"].size(), 2);
    ASSERT_EQ(j["member_ids"][0], "user-id-1");
}

TEST(TeamModelTest, TeamDeserializationFromJson) {
    nlohmann::json j = {
        {"name", "New Team"},
        {"description", "A cool team."}
    };

    Team team;
    from_json(j, team);

    ASSERT_EQ(team.name, "New Team");
    ASSERT_TRUE(team.description.has_value());
    ASSERT_EQ(team.description.value(), "A cool team.");
    ASSERT_TRUE(team.member_ids.empty()); // Should not be set from request body
}
```