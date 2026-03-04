```cpp
#include "gtest/gtest.h"
#include "DataProcessor.h"
#include "Models.h"
#include "Logger.h"
#include <fstream>
#include <filesystem>

namespace fs = std::filesystem;

class DataProcessorTest : public ::testing::Test {
protected:
    VisGenius::DataProcessor processor;
    std::string test_csv_file = "test_sales_data.csv";
    ScopedLogDisabler disabler; // Suppress log output during tests

    void SetUp() override {
        // Create a test CSV file
        std::ofstream file(test_csv_file);
        file << "Year,Category,Value,Region\n";
        file << "2020,Electronics,1000,North\n";
        file << "2020,Clothing,500,South\n";
        file << "2021,Electronics,1200,North\n";
        file << "2021,Clothing,600,West\n";
        file << "2021,Food,300,East\n";
        file << "2022,Electronics,1500,South\n";
        file << "2022,Clothing,700,North\n";
        file.close();
    }

    void TearDown() override {
        if (fs::exists(test_csv_file)) {
            fs::remove(test_csv_file);
        }
    }
};

TEST_F(DataProcessorTest, InferSchemaFromCsv) {
    VisGenius::DataSource ds;
    ds.name = "TestSales";
    ds.type = "csv";
    ds.connection_string = test_csv_file;

    std::vector<VisGenius::FieldDefinition> schema = processor.inferSchema(ds);

    ASSERT_EQ(schema.size(), 4);
    ASSERT_EQ(schema[0].name, "Year");
    ASSERT_EQ(schema[0].type, "int");
    ASSERT_EQ(schema[1].name, "Category");
    ASSERT_EQ(schema[1].type, "string");
    ASSERT_EQ(schema[2].name, "Value");
    ASSERT_EQ(schema[2].type, "int"); // Initially infers as int from sample
    ASSERT_EQ(schema[3].name, "Region");
    ASSERT_EQ(schema[3].type, "string");

    // Modify CSV to have double values to test inference
    std::ofstream file(test_csv_file);
    file << "ColA,ColB\n";
    file << "1.1,hello\n";
    file << "2.2,world\n";
    file.close();
    schema = processor.inferSchema(ds);
    ASSERT_EQ(schema[0].type, "double");
}

TEST_F(DataProcessorTest, LoadDataFromCsv) {
    VisGenius::DataSource ds;
    ds.name = "TestSales";
    ds.type = "csv";
    ds.connection_string = test_csv_file;
    ds.schema = processor.inferSchema(ds); // Use inferred schema for loading

    VisGenius::DataTable data = processor.loadData(ds);

    ASSERT_EQ(data.column_names.size(), 4);
    ASSERT_EQ(data.rows.size(), 7); // 7 data rows + 1 header row

    ASSERT_EQ(data.column_names[0], "Year");
    ASSERT_EQ(std::get<int>(data.rows[0].at("Year")), 2020);
    ASSERT_EQ(std::get<std::string>(data.rows[0].at("Category")), "Electronics");
    ASSERT_EQ(std::get<int>(data.rows[0].at("Value")), 1000); // inferred as int
    ASSERT_EQ(std::get<std::string>(data.rows[0].at("Region")), "North");

    ASSERT_EQ(std::get<int>(data.rows[4].at("Year")), 2021);
    ASSERT_EQ(std::get<std::string>(data.rows[4].at("Category")), "Food");
    ASSERT_EQ(std::get<int>(data.rows[4].at("Value")), 300);
}

TEST_F(DataProcessorTest, FilterData) {
    VisGenius::DataSource ds;
    ds.name = "TestSales"; ds.type = "csv"; ds.connection_string = test_csv_file;
    ds.schema = processor.inferSchema(ds);
    VisGenius::DataTable raw_data = processor.loadData(ds);

    // Filter by category
    std::map<std::string, std::string> filter_config = {{"Category", "Electronics"}};
    VisGenius::DataTable filtered_data = processor.filterData(raw_data, filter_config);
    ASSERT_EQ(filtered_data.rows.size(), 3); // 2020 E, 2021 E, 2022 E

    // Filter by region
    filter_config = {{"Region", "North"}};
    filtered_data = processor.filterData(raw_data, filter_config);
    ASSERT_EQ(filtered_data.rows.size(), 3); // 2020 E, 2021 E, 2022 C

    // Filter by numeric value (using > operator)
    filter_config = {{"Value", ">1000"}};
    filtered_data = processor.filterData(raw_data, filter_config);
    ASSERT_EQ(filtered_data.rows.size(), 2); // 2021 E (1200), 2022 E (1500)
    ASSERT_EQ(std::get<int>(filtered_data.rows[0].at("Value")), 1200);

    // Combined filters (implicit AND)
    filter_config = {{"Category", "Electronics"}, {"Year", "=2021"}};
    filtered_data = processor.filterData(raw_data, filter_config);
    ASSERT_EQ(filtered_data.rows.size(), 1);
    ASSERT_EQ(std::get<int>(filtered_data.rows[0].at("Year")), 2021);
    ASSERT_EQ(std::get<std::string>(filtered_data.rows[0].at("Category")), "Electronics");
}

TEST_F(DataProcessorTest, AggregateDataSum) {
    VisGenius::DataSource ds;
    ds.name = "TestSales"; ds.type = "csv"; ds.connection_string = test_csv_file;
    ds.schema = processor.inferSchema(ds);
    VisGenius::DataTable raw_data = processor.loadData(ds);

    // Sum 'Value' grouped by 'Category'
    std::map<std::