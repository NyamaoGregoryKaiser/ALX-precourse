```cpp
#include "gtest/gtest.h"
#include "../../src/database/SQLiteDatabaseManager.hpp"
#include "../../src/models/User.hpp"
#include "../../src/models/Project.hpp"
#include "../../src/models/Task.hpp"
#include "../../src/exceptions/CustomExceptions.hpp"
#include "../../src/utils/Logger.hpp"
#include <filesystem>

namespace fs = std::filesystem;

class SQLiteDatabaseManagerTest : public ::testing::Test {
protected:
    std::string test_db_path_ = "test_db.db";
    std::unique_ptr<SQLiteDatabaseManager> db_manager_;

    void SetUp() override {
        // Clean up previous test database if it exists
        if (fs::exists(test_db_path_)) {
            fs::remove(test_db_path_);
        }
        db_manager_ = std::make_unique<SQLiteDatabaseManager>(test_db_path_);
        db_manager_->initializeSchema(); // Create tables
        Logger::init(LogLevel::DEBUG, "test_db_manager.log");
    }

    void TearDown() override {
        db_manager_->close();
        if (fs::exists(test_db_path_)) {
            fs::remove(test_db_path_);
        }
        Logger::close();
    }
};

TEST_F(SQLiteDatabaseManagerTest, DatabaseOpensAndCloses) {
    ASSERT_TRUE(db_manager_->isOpen());
    db_manager_->close();
    ASSERT_FALSE(db_manager_->isOpen());
    db_manager_->open();
    ASSERT_TRUE(db_manager_->isOpen());
}

// User CRUD Tests
TEST_F(SQLiteDatabaseManagerTest, CreateAndGetUser) {
    User newUser("testuser", "test@example.com", "hashed_password", UserRole::USER);
    int userId = db_manager_->createUser(newUser);
    ASSERT_GT(userId, 0);

    std::optional<User> retrievedUser = db_manager_->getUserById(userId);
    ASSERT_TRUE(retrievedUser.has_value());
    ASSERT_EQ(retrievedUser->username, "testuser");
    ASSERT_EQ(retrievedUser->email, "test@example.com");
    ASSERT_EQ(retrievedUser->password_hash, "hashed_password");
    ASSERT_EQ(retrievedUser->role, UserRole::USER);

    std::optional<User> retrievedUserByUsername = db_manager_->getUserByUsername("testuser");
    ASSERT_TRUE(retrievedUserByUsername.has_value());
    ASSERT_EQ(retrievedUserByUsername->id.value(), userId);

    std::optional<User> retrievedUserByEmail = db_manager_->getUserByEmail("test@example.com");
    ASSERT_TRUE(retrievedUserByEmail.has_value());
    ASSERT_EQ(retrievedUserByEmail->id.value(), userId);
}

TEST_F(SQLiteDatabaseManagerTest, CreateUserDuplicateUsernameAndEmail) {
    User user1("unique_user", "unique@example.com", "pass1", UserRole::USER);
    db_manager_->createUser(user1);

    User user2("unique_user", "another@example.com", "pass2", UserRole::USER); // Duplicate username
    ASSERT_THROW(db_manager_->createUser(user2), DatabaseException);

    User user3("another_user", "unique@example.com", "pass3", UserRole::USER); // Duplicate email
    ASSERT_THROW(db_manager_->createUser(user3), DatabaseException);
}

TEST_F(SQLiteDatabaseManagerTest, GetAllUsers) {
    db_manager_->createUser(User("user1", "user1@example.com", "pass1", UserRole::USER));
    db_manager_->createUser(User("user2", "user2@example.com", "pass2", UserRole::ADMIN));

    std::vector<User> users = db_manager_->getAllUsers();
    ASSERT_EQ(users.size(), 2);
}

TEST_F(SQLiteDatabaseManagerTest, UpdateUser) {
    User newUser("updateuser", "update@example.com", "old_pass", UserRole::USER);
    int userId = db_manager_->createUser(newUser);

    User updatedUser(userId, "updated_username", "updated@example.com", "new_pass", UserRole::ADMIN);
    ASSERT_TRUE(db_manager_->updateUser(updatedUser));

    std::optional<User> retrievedUser = db_manager_->getUserById(userId);
    ASSERT_TRUE(retrievedUser.has_value());
    ASSERT_EQ(retrievedUser->username, "updated_username");
    ASSERT_EQ(retrievedUser->email, "updated@example.com");
    ASSERT_EQ(retrievedUser->password_hash, "new_pass");
    ASSERT_EQ(retrievedUser->role, UserRole::ADMIN);
}

TEST_F(SQLiteDatabaseManagerTest, DeleteUser) {
    User newUser("deleteuser", "delete@example.com", "pass", UserRole::USER);
    int userId = db_manager_->createUser(newUser);

    ASSERT_TRUE(db_manager_->deleteUser(userId));
    ASSERT_FALSE(db_manager_->getUserById(userId).has_value());
}

// Project CRUD Tests
TEST_F(SQLiteDatabaseManagerTest, CreateAndGetProject) {
    User owner("owner", "owner@example.com", "pass", UserRole::USER);
    int ownerId = db_manager_->createUser(owner);

    Project newProject("Test Project", "Description for test project.", ownerId);
    int projectId = db_manager_->createProject(newProject);
    ASSERT_GT(projectId, 0);

    std::optional<Project> retrievedProject = db_manager_->getProjectById(projectId);
    ASSERT_TRUE(retrievedProject.has_value());
    ASSERT_EQ(retrievedProject->name, "Test Project");
    ASSERT_EQ(retrievedProject->description, "Description for test project.");
    ASSERT_EQ(retrievedProject->owner_id.value(), ownerId);
}

TEST_F(SQLiteDatabaseManagerTest, GetAllProjectsAndByOwner) {
    User owner1("owner1", "o1@example.com", "p1", UserRole::USER);
    int ownerId1 = db_manager_->createUser(owner1);
    User owner2("owner2", "o2@example.com", "p2", UserRole::USER);
    int ownerId2 = db_manager_->createUser(owner2);

    db_manager_->createProject(Project("Proj A", "Desc A", ownerId1));
    db_manager_->createProject(Project("Proj B", "Desc B", ownerId2));
    db_manager_->createProject(Project("Proj C", "Desc C", ownerId1));

    std::vector<Project> allProjects = db_manager_->getAllProjects();
    ASSERT_EQ(allProjects.size(), 3);

    std::vector<Project> projectsByOwner1 = db_manager_->getProjectsByOwnerId(ownerId1);
    ASSERT_EQ(projectsByOwner1.size(), 2);
}

TEST_F(SQLiteDatabaseManagerTest, UpdateProject) {
    User owner("owner", "o@ex.com", "p", UserRole::USER);
    int ownerId = db_manager_->createUser(owner);
    Project newProject("Original Name", "Original Desc", ownerId);
    int projectId = db_manager_->createProject(newProject);

    User newOwner("new_owner", "new_o@ex.com", "new_p", UserRole::USER);
    int newOwnerId = db_manager_->createUser(newOwner);

    Project updatedProject(projectId, "Updated Name", "Updated Desc", newOwnerId);
    ASSERT_TRUE(db_manager_->updateProject(updatedProject));

    std::optional<Project> retrievedProject = db_manager_->getProjectById(projectId);
    ASSERT_TRUE(retrievedProject.has_value());
    ASSERT_EQ(retrievedProject->name, "Updated Name");
    ASSERT_EQ(retrievedProject->description, "Updated Desc");
    ASSERT_EQ(retrievedProject->owner_id.value(), newOwnerId);
}

TEST_F(SQLiteDatabaseManagerTest, DeleteProject) {
    User owner("owner_del", "od@ex.com", "pd", UserRole::USER);
    int ownerId = db_manager_->createUser(owner);
    Project newProject("To Delete", "This will be deleted.", ownerId);
    int projectId = db_manager_->createProject(newProject);

    ASSERT_TRUE(db_manager_->deleteProject(projectId));
    ASSERT_FALSE(db_manager_->getProjectById(projectId).has_value());
}

// Task CRUD Tests
TEST_F(SQLiteDatabaseManagerTest, CreateAndGetTask) {
    User owner("t_owner", "to@ex.com", "tp", UserRole::USER);
    int ownerId = db_manager_->createUser(owner);
    Project project("Task Project", "Project for tasks", ownerId);
    int projectId = db_manager_->createProject(project);
    User assignee("assignee", "assign@ex.com", "ap", UserRole::USER);
    int assigneeId = db_manager_->createUser(assignee);

    Task newTask("Task 1", "Description for Task 1", TaskStatus::TODO, projectId, assigneeId);
    int taskId = db_manager_->createTask(newTask);
    ASSERT_GT(taskId, 0);

    std::optional<Task> retrievedTask = db_manager_->getTaskById(taskId);
    ASSERT_TRUE(retrievedTask.has_value());
    ASSERT_EQ(retrievedTask->title, "Task 1");
    ASSERT_EQ(retrievedTask->description, "Description for Task 1");
    ASSERT_EQ(retrievedTask->status, TaskStatus::TODO);
    ASSERT_EQ(retrievedTask->project_id, projectId);
    ASSERT_EQ(retrievedTask->assigned_user_id.value(), assigneeId);
}

TEST_F(SQLiteDatabaseManagerTest, GetAllTasksAndByProjectOrUser) {
    User owner("t_owner2", "to2@ex.com", "tp2", UserRole::USER);
    int ownerId = db_manager_->createUser(owner);
    Project project1("Proj Task 1", "P1", ownerId);
    int projectId1 = db_manager_->createProject(project1);
    Project project2("Proj Task 2", "P2", ownerId);
    int projectId2 = db_manager_->createProject(project2);

    User assignee1("assignee1", "a1@ex.com", "p1", UserRole::USER);
    int assigneeId1 = db_manager_->createUser(assignee1);
    User assignee2("assignee2", "a2@ex.com", "p2", UserRole::USER);
    int assigneeId2 = db_manager_->createUser(assignee2);

    db_manager_->createTask(Task("Task A", "Desc A", TaskStatus::TODO, projectId1, assigneeId1));
    db_manager_->createTask(Task("Task B", "Desc B", TaskStatus::IN_PROGRESS, projectId1, assigneeId2));
    db_manager_->createTask(Task("Task C", "Desc C", TaskStatus::DONE, projectId2, assigneeId1));
    db_manager_->createTask(Task("Task D", "Desc D", TaskStatus::TODO, projectId2, std::nullopt));

    std::vector<Task> allTasks = db_manager_->getAllTasks();
    ASSERT_EQ(allTasks.size(), 4);

    std::vector<Task> tasksByProject1 = db_manager_->getTasksByProjectId(projectId1);
    ASSERT_EQ(tasksByProject1.size(), 2);

    std::vector<Task> tasksByAssignee1 = db_manager_->getTasksByAssignedUserId(assigneeId1);
    ASSERT_EQ(tasksByAssignee1.size(), 2);
}

TEST_F(SQLiteDatabaseManagerTest, UpdateTask) {
    User owner("t_owner3", "to3@ex.com", "tp3", UserRole::USER);
    int ownerId = db_manager_->createUser(owner);
    Project project("Task Project Update", "Project for tasks update", ownerId);
    int projectId = db_manager_->createProject(project);
    User assignee("assignee_old", "assign_old@ex.com", "ao", UserRole::USER);
    int oldAssigneeId = db_manager_->createUser(assignee);

    Task oldTask("Old Title", "Old Desc", TaskStatus::TODO, projectId, oldAssigneeId);
    int taskId = db_manager_->createTask(oldTask);

    User newAssignee("assignee_new", "assign_new@ex.com", "an", UserRole::USER);
    int newAssigneeId = db_manager_->createUser(newAssignee);
    Project newProject("New Task Project", "New Project for tasks", ownerId);
    int newProjectId = db_manager_->createProject(newProject);


    Task updatedTask(taskId, "New Title", "New Desc", TaskStatus::IN_PROGRESS, newProjectId, newAssigneeId);
    ASSERT_TRUE(db_manager_->updateTask(updatedTask));

    std::optional<Task> retrievedTask = db_manager_->getTaskById(taskId);
    ASSERT_TRUE(retrievedTask.has_value());
    ASSERT_EQ(retrievedTask->title, "New Title");
    ASSERT_EQ(retrievedTask->description, "New Desc");
    ASSERT_EQ(retrievedTask->status, TaskStatus::IN_PROGRESS);
    ASSERT_EQ(retrievedTask->project_id, newProjectId);
    ASSERT_EQ(retrievedTask->assigned_user_id.value(), newAssigneeId);
}

TEST_F(SQLiteDatabaseManagerTest, DeleteTask) {
    User owner("t_owner_del", "tod@ex.com", "tpd", UserRole::USER);
    int ownerId = db_manager_->createUser(owner);
    Project project("Task Project Delete", "Project for task delete", ownerId);
    int projectId = db_manager_->createProject(project);

    Task taskToDelete("To Delete", "This task will be deleted.", TaskStatus::TODO, projectId, std::nullopt);
    int taskId = db_manager_->createTask(taskToDelete);

    ASSERT_TRUE(db_manager_->deleteTask(taskId));
    ASSERT_FALSE(db_manager_->getTaskById(taskId).has_value());
}

TEST_F(SQLiteDatabaseManagerTest, CascadeDeleteProjectTasks) {
    User owner("cascade_owner", "c_owner@ex.com", "c_pass", UserRole::USER);
    int ownerId = db_manager_->createUser(owner);
    Project project("Cascade Project", "Project for cascade delete", ownerId);
    int projectId = db_manager_->createProject(project);

    db_manager_->createTask(Task("Task 1", "", TaskStatus::TODO, projectId, std::nullopt));
    db_manager_->createTask(Task("Task 2", "", TaskStatus::DONE, projectId, std::nullopt));

    ASSERT_EQ(db_manager_->getTasksByProjectId(projectId).size(), 2);

    db_manager_->deleteProject(projectId);
    
    ASSERT_EQ(db_manager_->getTasksByProjectId(projectId).size(), 0); // Tasks should be gone
}

TEST_F(SQLiteDatabaseManagerTest, CascadeDeleteUserNullifyOwner) {
    User owner("cascade_user", "cu@ex.com", "cp", UserRole::USER);
    int ownerId = db_manager_->createUser(owner);
    Project project("User Cascade Project", "Project with user as owner", ownerId);
    int projectId = db_manager_->createProject(project);

    db_manager_->deleteUser(ownerId); // Delete user

    std::optional<Project> retrievedProject = db_manager_->getProjectById(projectId);
    ASSERT_TRUE(retrievedProject.has_value());
    ASSERT_FALSE(retrievedProject->owner_id.has_value()); // Owner should be nullified
}

TEST_F(SQLiteDatabaseManagerTest, CascadeDeleteUserNullifyAssignee) {
    User owner("cascade_task_owner", "cto@ex.com", "ctp", UserRole::USER);
    int ownerId = db_manager_->createUser(owner);
    Project project("User Cascade Task Project", "Project for task assignee cascade", ownerId);
    int projectId = db_manager_->createProject(project);

    User assignee("cascade_assignee", "ca@ex.com", "cap", UserRole::USER);
    int assigneeId = db_manager_->createUser(assignee);

    Task task("Task with Assignee", "", TaskStatus::TODO, projectId, assigneeId);
    int taskId = db_manager_->createTask(task);

    db_manager_->deleteUser(assigneeId); // Delete assignee user

    std::optional<Task> retrievedTask = db_manager_->getTaskById(taskId);
    ASSERT_TRUE(retrievedTask.has_value());
    ASSERT_FALSE(retrievedTask->assigned_user_id.has_value()); // Assignee should be nullified
}

```