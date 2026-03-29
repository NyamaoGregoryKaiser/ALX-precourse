```cpp
#include "gtest/gtest.h"
#include "../../src/database/SQLiteDatabaseManager.hpp"
#include "../../src/services/AuthService.hpp"
#include "../../src/services/UserService.hpp"
#include "../../src/services/ProjectService.hpp"
#include "../../src/services/TaskService.hpp"
#include "../../src/utils/JWTManager.hpp"
#include "../../src/utils/PasswordUtils.hpp"
#include "../../src/config/AppConfig.hpp"
#include <memory>
#include <filesystem>

namespace fs = std::filesystem;

class UserProjectIntegrationTest : public ::testing::Test {
protected:
    std::shared_ptr<SQLiteDatabaseManager> db_manager_;
    std::unique_ptr<JWTManager> jwt_manager_;
    std::unique_ptr<AuthService> auth_service_;
    std::unique_ptr<UserService> user_service_;
    std::unique_ptr<ProjectService> project_service_;
    std::unique_ptr<TaskService> task_service_;

    const std::string TEST_DB_PATH = "test_integration.db";
    const std::string JWT_TEST_SECRET = "integration_secret";
    const int JWT_TEST_EXPIRY = 5; // 5 minutes

    void SetUp() override {
        if (fs::exists(TEST_DB_PATH)) {
            fs::remove(TEST_DB_PATH);
        }

        AppConfig::loadConfig(".env"); // Assuming .env has been copied
        AppConfig::config_map["JWT_SECRET"] = JWT_TEST_SECRET;
        AppConfig::config_map["JWT_EXPIRY_MINUTES"] = std::to_string(JWT_TEST_EXPIRY);

        db_manager_ = std::make_shared<SQLiteDatabaseManager>(TEST_DB_PATH);
        db_manager_->initializeSchema(); // Create tables
        
        jwt_manager_ = std::make_unique<JWTManager>(JWT_TEST_SECRET, JWT_TEST_EXPIRY);
        auth_service_ = std::make_unique<AuthService>(db_manager_, *jwt_manager_);
        user_service_ = std::make_unique<UserService>(db_manager_);
        project_service_ = std::make_unique<ProjectService>(db_manager_);
        task_service_ = std::make_unique<TaskService>(db_manager_);

        Logger::init(LogLevel::DEBUG, "test_integration.log");
    }

    void TearDown() override {
        db_manager_->close();
        if (fs::exists(TEST_DB_PATH)) {
            fs::remove(TEST_DB_PATH);
        }
        Logger::close();
    }
};

TEST_F(UserProjectIntegrationTest, RegisterUserAndCreateProjectAndTask) {
    // 1. Register a user
    UserRegisterDTO register_dto;
    register_dto.username = "int_user";
    register_dto.email = "int@example.com";
    register_dto.password = "int_pass";
    AuthResponseDTO auth_response = auth_service_->registerUser(register_dto);
    ASSERT_TRUE(auth_response.user.id.has_value());
    int user_id = auth_response.user.id.value();
    
    // 2. Create a project owned by this user
    ProjectCreateDTO project_dto;
    project_dto.name = "Integration Project";
    project_dto.description = "Project for integration testing";
    project_dto.owner_id = user_id;
    Project created_project = project_service_->createProject(project_dto, user_id);
    ASSERT_TRUE(created_project.id.has_value());
    ASSERT_EQ(created_project.name, "Integration Project");
    ASSERT_EQ(created_project.owner_id.value(), user_id);
    int project_id = created_project.id.value();

    // 3. Create a task for this project, assigned to the same user
    TaskCreateDTO task_dto;
    task_dto.title = "Integration Task";
    task_dto.description = "Task to verify integration";
    task_dto.project_id = project_id;
    task_dto.assigned_user_id = user_id;
    Task created_task = task_service_->createTask(task_dto);
    ASSERT_TRUE(created_task.id.has_value());
    ASSERT_EQ(created_task.title, "Integration Task");
    ASSERT_EQ(created_task.project_id, project_id);
    ASSERT_EQ(created_task.assigned_user_id.value(), user_id);
    int task_id = created_task.id.value();

    // 4. Retrieve and verify the data
    std::optional<User> retrieved_user = user_service_->getUserById(user_id);
    ASSERT_TRUE(retrieved_user.has_value());
    ASSERT_EQ(retrieved_user->username, "int_user");

    std::optional<Project> retrieved_project = project_service_->getProjectById(project_id);
    ASSERT_TRUE(retrieved_project.has_value());
    ASSERT_EQ(retrieved_project->name, "Integration Project");
    ASSERT_EQ(retrieved_project->owner_id.value(), user_id);

    std::optional<Task> retrieved_task = task_service_->getTaskById(task_id);
    ASSERT_TRUE(retrieved_task.has_value());
    ASSERT_EQ(retrieved_task->title, "Integration Task");
    ASSERT_EQ(retrieved_task->project_id, project_id);
    ASSERT_EQ(retrieved_task->assigned_user_id.value(), user_id);

    // 5. Verify user is owner of project
    ASSERT_TRUE(project_service_->isProjectOwner(project_id, user_id));
}

TEST_F(UserProjectIntegrationTest, AdminCanManageOtherUsersProjectsTasks) {
    // 1. Create an admin user
    UserRegisterDTO admin_reg_dto;
    admin_reg_dto.username = "admin_int";
    admin_reg_dto.email = "admin@int.com";
    admin_reg_dto.password = "admin_pass";
    User admin_user = user_service_->createUser(admin_reg_dto, UserRole::ADMIN);
    ASSERT_TRUE(admin_user.id.has_value());
    int admin_id = admin_user.id.value();

    // 2. Create a regular user
    UserRegisterDTO regular_reg_dto;
    regular_reg_dto.username = "regular_int";
    regular_reg_dto.email = "regular@int.com";
    regular_reg_dto.password = "regular_pass";
    User regular_user = user_service_->createUser(regular_reg_dto, UserRole::USER);
    ASSERT_TRUE(regular_user.id.has_value());
    int regular_id = regular_user.id.value();

    // 3. Regular user creates a project
    ProjectCreateDTO project_dto;
    project_dto.name = "Regular User Project";
    project_dto.description = "Owned by regular user";
    project_dto.owner_id = regular_id;
    Project regular_user_project = project_service_->createProject(project_dto, regular_id);
    ASSERT_TRUE(regular_user_project.id.has_value());
    int project_id = regular_user_project.id.value();

    // 4. Admin tries to update the regular user's project
    ProjectUpdateDTO update_project_dto;
    update_project_dto.name = "Admin Updated Project Name";
    update_project_dto.description = "Admin changed this";
    // Admin also tries to change the owner to themselves (admin_id)
    update_project_dto.owner_id = admin_id;

    // Simulate AuthContext for admin (usually handled by middleware)
    AuthContext admin_ctx;
    admin_ctx.user_id = admin_id;
    admin_ctx.username = "admin_int";
    admin_ctx.role = UserRole::ADMIN;

    // No direct controller call, but project_service->updateProject should work if admin_id is valid
    // The access check for this is in the controller layer, but the service call itself should work.
    // We're testing if the service allows the update based on the DTO.
    Project updated_project = project_service_->updateProject(project_id, update_project_dto);
    ASSERT_EQ(updated_project.name, "Admin Updated Project Name");
    ASSERT_EQ(updated_project.owner_id.value(), admin_id); // Admin successfully changed owner

    // 5. Admin creates a task in the updated project and assigns it to the regular user
    TaskCreateDTO task_dto;
    task_dto.title = "Admin Created Task";
    task_dto.description = "Assigned by admin";
    task_dto.project_id = project_id;
    task_dto.assigned_user_id = regular_id;
    Task admin_created_task = task_service_->createTask(task_dto);
    ASSERT_TRUE(admin_created_task.id.has_value());
    ASSERT_EQ(admin_created_task.project_id, project_id);
    ASSERT_EQ(admin_created_task.assigned_user_id.value(), regular_id);
    int task_id = admin_created_task.id.value();

    // 6. Admin deletes the project, verifying cascade delete for tasks
    project_service_->deleteProject(project_id);
    ASSERT_FALSE(project_service_->getProjectById(project_id).has_value());
    ASSERT_FALSE(task_service_->getTaskById(task_id).has_value()); // Task should be deleted
}
```