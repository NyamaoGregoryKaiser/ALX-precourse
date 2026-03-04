```cpp
#include "gtest/gtest.h"
#include "Models.h"
#include <vector>
#include <map>

// Helper to disable logging output during tests for cleaner console
class ScopedLogDisabler {
public:
    ScopedLogDisabler() {
        // Redirect stdout to /dev/null
        // This is a basic approach and might not catch all logging to stderr
        // For spdlog, you'd change sinks.
        std::cout.rdbuf(null_buffer.rdbuf());
        std::cerr.rdbuf(null_buffer.rdbuf());
    }
    ~ScopedLogDisabler() {
        // Restore stdout/stderr
        std::cout.rdbuf(cout_buffer);
        std::cerr.rdbuf(cerr_buffer);
    }
private:
    std::ofstream null_stream;
    std::streambuf* cout_buffer = std::cout.rdbuf();
    std::streambuf* cerr_buffer = std::cerr.rdbuf();
};

TEST(ModelsTest, DataSourceToString) {
    VisGenius::DataSource ds;
    ds.id = 1;
    ds.name = "Test DS";
    ds.type = "csv";
    ds.connection_string = "/path/to/data.csv";
    ds.created_at.timestamp_ms = 1678886400000; // March 15, 2023 00:00:00 UTC
    ds.updated_at.timestamp_ms = 1678886400000;
    ds.schema = {{"col1", "int"}, {"col2", "string"}};

    std::string expected = "DataSource(ID: 1, Name: Test DS, Type: csv, Connection: /path/to/data.csv, Created: 1678886400000, Updated: 1678886400000)\nSchema:\n  - col1 (int)\n  - col2 (string)\n";
    ASSERT_EQ(ds.to_string(), expected);
}

TEST(ModelsTest, VisualizationToString) {
    VisGenius::Visualization viz;
    viz.id = 2;
    viz.name = "Bar Chart";
    viz.data_source_id = 1;
    viz.type = "bar";
    viz.config = {{"x_axis", "category"}, {"y_axis", "value"}};
    viz.created_at.timestamp_ms = 1678886400000;
    viz.updated_at.timestamp_ms = 1678886400000;

    std::string expected = "Visualization(ID: 2, Name: Bar Chart, Type: bar, DataSourceID: 1, Created: 1678886400000, Updated: 1678886400000)\nConfig:\n  - x_axis: category\n  - y_axis: value\n";
    ASSERT_EQ(viz.to_string(), expected);
}

TEST(ModelsTest, DashboardToString) {
    VisGenius::Dashboard dash;
    dash.id = 3;
    dash.name = "My Dashboard";
    dash.description = "A dashboard of sales data.";
    dash.visualization_ids = {2, 4};
    dash.created_at.timestamp_ms = 1678886400000;
    dash.updated_at.timestamp_ms = 1678886400000;

    std::string expected = "Dashboard(ID: 3, Name: My Dashboard, Desc: A dashboard of sales data., Created: 1678886400000, Updated: 1678886400000)\nVisualizations: [2, 4]\n";
    ASSERT_EQ(dash.to_string(), expected);
}

TEST(ModelsTest, UserToString) {
    VisGenius::User user;
    user.id = 1;
    user.username = "testuser";
    user.hashed_password = "hashedpassword";
    user.role = "editor";
    user.created_at.timestamp_ms = 1678886400000;
    user.updated_at.timestamp_ms = 1678886400000;

    std::string expected = "User(ID: 1, Username: testuser, Role: editor)";
    ASSERT_EQ(user.to_string(), expected);
}
```