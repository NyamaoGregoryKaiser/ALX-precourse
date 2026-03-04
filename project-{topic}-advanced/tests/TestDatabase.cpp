```cpp
#include "gtest/gtest.h"
#include "Database.h"
#include "Models.h"
#include "Logger.h" // For ScopedLogDisabler
#include "ErrorHandling.h"
#include <filesystem>
#include <chrono>

namespace fs = std::filesystem;

class DatabaseTest : public ::testing::Test {
protected:
    std::string test_db_path = "test_visgenius.db";
    std::unique_ptr<VisGenius::Database> db;
    ScopedLogDisabler disabler; // Suppress log output during tests

    void SetUp() override {
        if (fs::exists(test_db_path)) {
            fs::remove(test_db_path);
        }
        db = std::make_unique<VisGenius::Database>(test_db_path);
        db->initialize();
    }

    void TearDown() override {
        db.reset(); // Close the database connection
        if (fs::exists(test_db_path)) {
            fs::remove(test_db_path);
        }
    }

    long long current_timestamp_ms() {
        return std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count();
    }
};

TEST_F(DatabaseTest, InitializeCreatesTables) {
    // Tables should be created in SetUp
    ASSERT_TRUE(fs::exists(test_db_path));
    // Try inserting to check if tables are functional
    VisGenius::DataSource ds;
    ds.name = "Test DS";
    ds.type = "csv";
    ds.connection_string = "test.csv";
    ds.created_at.timestamp_ms = current_timestamp_ms();
    ds.updated_at.timestamp_ms = ds.created_at.timestamp_ms;
    ds.schema = {{"col1", "int"}, {"col2", "string"}};
    int id = db->createDataSource(ds);
    ASSERT_GT(id, 0);
}

TEST_F(DatabaseTest, CreateAndGetDataSource) {
    VisGenius::DataSource ds;
    ds.name = "MyCSVData";
    ds.type = "csv";
    ds.connection_string = "/data/my_csv.csv";
    ds.created_at.timestamp_ms = current_timestamp_ms();
    ds.updated_at.timestamp_ms = ds.created_at.timestamp_ms;
    ds.schema = {{"headerA", "string"}, {"headerB", "double"}};

    int id = db->createDataSource(ds);
    ASSERT_GT(id, 0);

    std::unique_ptr<VisGenius::DataSource> retrieved_ds = db->getDataSource(id);
    ASSERT_TRUE(retrieved_ds != nullptr);
    ASSERT_EQ(retrieved_ds->id, id);
    ASSERT_EQ(retrieved_ds->name, ds.name);
    ASSERT_EQ(retrieved_ds->type, ds.type);
    ASSERT_EQ(retrieved_ds->connection_string, ds.connection_string);
    ASSERT_EQ(retrieved_ds->created_at.timestamp_ms, ds.created_at.timestamp_ms);
    ASSERT_EQ(retrieved_ds->updated_at.timestamp_ms, ds.updated_at.timestamp_ms);
    ASSERT_EQ(retrieved_ds->schema.size(), 2);
    ASSERT_EQ(retrieved_ds->schema[0].name, "headerA");
    ASSERT_EQ(retrieved_ds->schema[0].type, "string");
}

TEST_F(DatabaseTest, GetAllDataSources) {
    VisGenius::DataSource ds1;
    ds1.name = "DS1"; ds1.type = "csv"; ds1.connection_string = "1.csv";
    ds1.created_at.timestamp_ms = current_timestamp_ms(); ds1.updated_at.timestamp_ms = ds1.created_at.timestamp_ms;
    db->createDataSource(ds1);

    VisGenius::DataSource ds2;
    ds2.name = "DS2"; ds2.type = "sql"; ds2.connection_string = "db.sql";
    ds2.created_at.timestamp_ms = current_timestamp_ms(); ds2.updated_at.timestamp_ms = ds2.created_at.timestamp_ms;
    db->createDataSource(ds2);

    std::vector<VisGenius::DataSource> all_ds = db->getAllDataSources();
    ASSERT_EQ(all_ds.size(), 2);
    // Names might not be in order, check if both exist
    bool found1 = false, found2 = false;
    for(const auto& ds : all_ds) {
        if (ds.name == "DS1") found1 = true;
        if (ds.name == "DS2") found2 = true;
    }
    ASSERT_TRUE(found1);
    ASSERT_TRUE(found2);
}

TEST_F(DatabaseTest, UpdateDataSource) {
    VisGenius::DataSource ds;
    ds.name = "Original Name";
    ds.type = "csv";
    ds.connection_string = "original.csv";
    ds.created_at.timestamp_ms = current_timestamp_ms();
    ds.updated_at.timestamp_ms = ds.created_at.timestamp_ms;
    int id = db->createDataSource(ds);

    ds.id = id;
    ds.name = "Updated Name";
    ds.connection_string = "updated.csv";
    ds.updated_at.timestamp_ms = current_timestamp_ms() + 1000; // Simulate update time

    ASSERT_TRUE(db->updateDataSource(ds));

    std::unique_ptr<VisGenius::DataSource> updated_ds = db->getDataSource(id);
    ASSERT_TRUE(updated_ds != nullptr);
    ASSERT_EQ(updated_ds->name, "Updated Name");
    ASSERT_EQ(updated_ds->connection_string, "updated.csv");
    ASSERT_GT(updated_ds->updated_at.timestamp_ms, ds.created_at.timestamp_ms);
}

TEST_F(DatabaseTest, DeleteDataSource) {
    VisGenius::DataSource ds;
    ds.name = "ToDelete"; ds.type = "csv"; ds.connection_string = "delete.csv";
    ds.created_at.timestamp_ms = current_timestamp_ms(); ds.updated_at.timestamp_ms = ds.created_at.timestamp_ms;
    int id = db->createDataSource(ds);

    ASSERT_TRUE(db->getDataSource(id) != nullptr);
    ASSERT_TRUE(db->deleteDataSource(id));
    ASSERT_TRUE(db->getDataSource(id) == nullptr);
}

TEST_F(DatabaseTest, CreateAndGetVisualization) {
    // First, create a data source
    VisGenius::DataSource ds;
    ds.name = "VizDS"; ds.type = "csv"; ds.connection_string = "viz.csv";
    ds.created_at.timestamp_ms = current_timestamp_ms(); ds.updated_at.timestamp_ms = ds.created_at.timestamp_ms;
    int ds_id = db->createDataSource(ds);

    VisGenius::Visualization viz;
    viz.name = "Sales Bar Chart";
    viz.data_source_id = ds_id;
    viz.type = "bar";
    viz.config = {{"x_axis", "Product"}, {"y_axis", "Revenue"}};
    viz.created_at.timestamp_ms = current_timestamp_ms();
    viz.updated_at.timestamp_ms = viz.created_at.timestamp_ms;

    int viz_id = db->createVisualization(viz);
    ASSERT_GT(viz_id, 0);

    std::unique_ptr<VisGenius::Visualization> retrieved_viz = db->getVisualization(viz_id);
    ASSERT_TRUE(retrieved_viz != nullptr);
    ASSERT_EQ(retrieved_viz->id, viz_id);
    ASSERT_EQ(retrieved_viz->name, viz.name);
    ASSERT_EQ(retrieved_viz->data_source_id, viz.data_source_id);
    ASSERT_EQ(retrieved_viz->type, viz.type);
    ASSERT_EQ(retrieved_viz->config.at("x_axis"), "Product");
}

TEST_F(DatabaseTest, DeleteDataSourceCascadesVisualizations) {
    VisGenius::DataSource ds;
    ds.name = "ParentDS"; ds.type = "csv"; ds.connection_string = "parent.csv";
    ds.created_at.timestamp_ms = current_timestamp_ms(); ds.updated_at.timestamp_ms = ds.created_at.timestamp_ms;
    int ds_id = db->createDataSource(ds);

    VisGenius::Visualization viz;
    viz.name = "ChildViz"; viz.data_source_id = ds_id; viz.type = "line";
    viz.created_at.timestamp_ms = current_timestamp_ms(); viz.updated_at.timestamp_ms = viz.created_at.timestamp_ms;
    int viz_id = db->createVisualization(viz);

    ASSERT_TRUE(db->getVisualization(viz_id) != nullptr);
    ASSERT_TRUE(db->deleteDataSource(ds_id));
    ASSERT_TRUE(db->getVisualization(viz_id) == nullptr); // Should be cascaded
}

TEST_F(DatabaseTest, CreateAndGetDashboard) {
    VisGenius::Dashboard dash;
    dash.name = "Executive Summary";
    dash.description = "Key metrics for executives.";
    dash.visualization_ids = {101, 102, 103};
    dash.created_at.timestamp_ms = current_timestamp_ms();
    dash.updated_at.timestamp_ms = dash.created_at.timestamp_ms;

    int dash_id = db->createDashboard(dash);
    ASSERT_GT(dash_id, 0);

    std::unique_ptr<VisGenius::Dashboard> retrieved_dash = db->getDashboard(dash_id);
    ASSERT_TRUE(retrieved_dash != nullptr);
    ASSERT_EQ(retrieved_dash->id, dash_id);
    ASSERT_EQ(retrieved_dash->name, dash.name);
    ASSERT_EQ(retrieved_dash->description, dash.description);
    ASSERT_EQ(retrieved_dash->visualization_ids.size(), 3);
    ASSERT_EQ(retrieved_dash->visualization_ids[0], 101);
}

TEST_F(DatabaseTest, CreateAndGetUser) {
    VisGenius::User user;
    user.username = "testuser_db";
    user.hashed_password = "hashed_pass";
    user.role = "editor";
    user.created_at.timestamp_ms = current_timestamp_ms();
    user.updated_at.timestamp_ms = user.created_at.timestamp_ms;

    int user_id = db->createUser(user);
    ASSERT_GT(user_id, 0);

    std::unique_ptr<VisGenius::User> retrieved_user = db->getUser(user_id);
    ASSERT_TRUE(retrieved_user != nullptr);
    ASSERT_EQ(retrieved_user->id, user_id);
    ASSERT_EQ(retrieved_user->username, user.username);
    ASSERT_EQ(retrieved_user->hashed_password, user.hashed_password);
    ASSERT_EQ(retrieved_user->role, user.role);

    std::unique_ptr<VisGenius::User> retrieved_user_by_name = db->getUserByUsername("testuser_db");
    ASSERT_TRUE(retrieved_user_by_name != nullptr);
    ASSERT_EQ(retrieved_user_by_name->username, user.username);
}

TEST_F(DatabaseTest, UniqueConstraintViolation) {
    VisGenius::DataSource ds;
    ds.name = "UniqueDS"; ds.type = "csv"; ds.connection_string = "u.csv";
    ds.created_at.timestamp_ms = current_timestamp_ms(); ds.updated_at.timestamp_ms = ds.created_at.timestamp_ms;
    db->createDataSource(ds);

    // Attempt to create another with the same name
    VisGenius::DataSource ds2;
    ds2.name = "UniqueDS"; ds2.type = "csv"; ds2.connection_string = "u2.csv";
    ds2.created_at.timestamp_ms = current_timestamp_ms(); ds2.updated_at.timestamp_ms = ds2.created_at.timestamp_ms;

    ASSERT_THROW(db->createDataSource(ds2), VisGenius::DbException);
}
```