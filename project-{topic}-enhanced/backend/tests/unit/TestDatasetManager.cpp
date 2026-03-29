```cpp
#include "gtest/gtest.h"
#include "../../src/data/DatasetManager.h"
#include <filesystem>
#include <fstream>

namespace fs = std::filesystem;

class DatasetManagerTest : public ::testing::Test {
protected:
    const std::string TEST_STORAGE_PATH = "./test_data_storage";
    const std::string TEST_CSV_CONTENT =
        "Header1,Header2,Header3\n"
        "val1a,val1b,100\n"
        "val2a,val2b,200.5\n"
        "val3a,val3b,invalid"; // Test mixed types/errors
    const std::string TEST_CSV_FILENAME = "test_sample.csv";
    std::string full_test_csv_path;

    void SetUp() override {
        // Create a temporary directory for testing
        fs::create_directories(TEST_STORAGE_PATH);
        full_test_csv_path = fs::path(TEST_STORAGE_PATH) / TEST_CSV_FILENAME;

        // Write a sample CSV file
        std::ofstream ofs(full_test_csv_path);
        ofs << TEST_CSV_CONTENT;
        ofs.close();
    }

    void TearDown() override {
        // Clean up the temporary directory
        fs::remove_all(TEST_STORAGE_PATH);
    }
};

TEST_F(DatasetManagerTest, ConstructorCreatesStoragePath) {
    fs::remove_all(TEST_STORAGE_PATH); // Ensure it doesn't exist before test
    DatasetManager dm(TEST_STORAGE_PATH);
    ASSERT_TRUE(fs::exists(TEST_STORAGE_PATH));
}

TEST_F(DatasetManagerTest, SaveFileSuccessfully) {
    DatasetManager dm(TEST_STORAGE_PATH);
    std::string new_file_name = "new_data.txt";
    std::string new_content = "This is new data.";
    std::string saved_path = dm.saveFile(new_file_name, new_content);

    ASSERT_FALSE(saved_path.empty());
    ASSERT_TRUE(fs::exists(saved_path));

    std::ifstream ifs(saved_path);
    std::stringstream buffer;
    buffer << ifs.rdbuf();
    ASSERT_EQ(buffer.str(), new_content);
}

TEST_F(DatasetManagerTest, SaveFileFailsWithEmptyContent) {
    DatasetManager dm(TEST_STORAGE_PATH);
    std::string new_file_name = "empty.txt";
    std::string new_content = "";
    std::string saved_path = dm.saveFile(new_file_name, new_content);

    ASSERT_TRUE(saved_path.empty()); // Should return empty on failure
    ASSERT_FALSE(fs::exists(fs::path(TEST_STORAGE_PATH) / new_file_name));
}


TEST_F(DatasetManagerTest, LoadCsvFileSuccessfully) {
    DatasetManager dm(TEST_STORAGE_PATH);
    auto data_opt = dm.loadCsvFile(full_test_csv_path);

    ASSERT_TRUE(data_opt.has_value());
    DataTable data = *data_opt;

    ASSERT_EQ(data.size(), 3); // 3 data rows
    ASSERT_EQ(data[0].size(), 3); // 3 columns

    ASSERT_EQ(data[0]["Header1"], "val1a");
    ASSERT_EQ(data[0]["Header3"], "100");
    ASSERT_EQ(data[1]["Header3"], "200.5");
    ASSERT_EQ(data[2]["Header3"], "invalid");
}

TEST_F(DatasetManagerTest, LoadCsvFileFailsForNonExistentFile) {
    DatasetManager dm(TEST_STORAGE_PATH);
    auto data_opt = dm.loadCsvFile("./non_existent_file.csv");
    ASSERT_FALSE(data_opt.has_value());
}

TEST_F(DatasetManagerTest, InferColumnsCorrectly) {
    DatasetManager dm(TEST_STORAGE_PATH);
    auto data_opt = dm.loadCsvFile(full_test_csv_path);
    ASSERT_TRUE(data_opt.has_value());

    auto columns = dm.inferColumns(*data_opt);

    ASSERT_EQ(columns.size(), 3);
    ASSERT_EQ(columns[0].name, "Header1");
    ASSERT_EQ(columns[0].type, "string");
    ASSERT_TRUE(columns[0].is_dimension);
    ASSERT_FALSE(columns[0].is_measure);

    ASSERT_EQ(columns[1].name, "Header2");
    ASSERT_EQ(columns[1].type, "string"); // Assuming 'val1b' won't be inferred as numeric
    ASSERT_TRUE(columns[1].is_dimension);
    ASSERT_FALSE(columns[1].is_measure);

    ASSERT_EQ(columns[2].name, "Header3");
    // Should infer 'number' based on '100' and '200.5' even if 'invalid' exists
    ASSERT_EQ(columns[2].type, "number"); 
    ASSERT_FALSE(columns[2].is_dimension);
    ASSERT_TRUE(columns[2].is_measure);
}

TEST_F(DatasetManagerTest, GetOrLoadDataCaches) {
    DatasetManager dm(TEST_STORAGE_PATH);
    
    // First load, should load from file
    auto data1 = dm.getOrLoadData(1, full_test_csv_path);
    ASSERT_TRUE(data1.has_value());
    ASSERT_EQ(data1->size(), 3);

    // Modify the original file
    std::ofstream ofs(full_test_csv_path);
    ofs << "Header1\nchanged";
    ofs.close();

    // Second load, should come from cache (not reflect file changes)
    auto data2 = dm.getOrLoadData(1, full_test_csv_path);
    ASSERT_TRUE(data2.has_value());
    ASSERT_EQ(data2->size(), 3); // Still 3 rows from cache

    // Clear cache
    dm.clearCache(1);

    // Third load, should load from the modified file
    auto data3 = dm.getOrLoadData(1, full_test_csv_path);
    ASSERT_TRUE(data3.has_value());
    ASSERT_EQ(data3->size(), 1); // Now 1 row from the changed file
}

TEST_F(DatasetManagerTest, GetOrInferColumnsCaches) {
    DatasetManager dm(TEST_STORAGE_PATH);
    
    // First inference, should infer from data
    auto cols1 = dm.getOrInferColumns(1, full_test_csv_path);
    ASSERT_TRUE(cols1.has_value());
    ASSERT_EQ(cols1->size(), 3);

    // Modify the original file to change column structure (this won't be reflected without cache clear)
    std::ofstream ofs(full_test_csv_path);
    ofs << "NewCol1,NewCol2\nvalA,valB";
    ofs.close();

    // Second inference, should come from cache
    auto cols2 = dm.getOrInferColumns(1, full_test_csv_path);
    ASSERT_TRUE(cols2.has_value());
    ASSERT_EQ(cols2->size(), 3); // Still 3 columns from cache

    // Clear cache
    dm.clearCache(1);

    // Third inference, should infer from the modified file
    auto cols3 = dm.getOrInferColumns(1, full_test_csv_path);
    ASSERT_TRUE(cols3.has_value());
    ASSERT_EQ(cols3->size(), 2); // Now 2 columns from the changed file
}
```