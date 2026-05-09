```cpp
#include "gtest/gtest.h"
#include "data/processor/DataProcessor.h"
#include "data/model/DataModels.h"
#include "core/common/Utils.h" // For DataTypeToString, etc.
#include "util/Logger.h"

// Initialize logger for tests
void init_test_logger() {
    static bool initialized = false;
    if (!initialized) {
        VisuFlow::Util::Logger::init("error", "test_visuflow.log"); // Log errors only during tests
        initialized = true;
    }
}

// Fixture for DataProcessor tests
class DataProcessorTest : public ::testing::Test {
protected:
    VisuFlow::Data::Processor::DataProcessor processor;
    VisuFlow::Data::Model::DataTable sampleData;

    void SetUp() override {
        init_test_logger();
        // Setup a common sample data table
        sampleData.columns = {
            {"Category", VisuFlow::Data::Model::DataType::STRING},
            {"Sales", VisuFlow::Data::Model::DataType::DOUBLE},
            {"Quantity", VisuFlow::Data::Model::DataType::INT},
            {"Region", VisuFlow::Data::Model::DataType::STRING}
        };
        sampleData.rows = {
            {"Electronics", 150.75, 5LL, "North"},
            {"Clothing", 75.20, 3LL, "South"},
            {"Electronics", 200.50, 8LL, "North"},
            {"Books", 45.99, 2LL, "East"},
            {"Clothing", 120.00, 6LL, "North"},
            {"Books", 60.00, 3LL, "South"},
            {"Electronics", 100.00, 4LL, "East"}
        };
    }
};

TEST_F(DataProcessorTest, ProcessData_SumAggregation) {
    VisuFlow::Data::Processor::ProcessingConfig config;
    config.groupByColumn = "Category";
    config.metricColumn = "Sales";
    config.aggregationType = "sum";

    VisuFlow::Data::Model::DataTable result = processor.processData(sampleData, config);

    // Expected columns: Category, Sales_sum
    ASSERT_EQ(result.columns.size(), 2);
    ASSERT_EQ(result.columns[0].name, "Category");
    ASSERT_EQ(result.columns[1].name, "Sales_sum");

    // Expected rows: Electronics, Clothing, Books
    ASSERT_EQ(result.rows.size(), 3);

    // Check aggregated values
    // Electronics: 150.75 + 200.50 + 100.00 = 451.25
    // Clothing: 75.20 + 120.00 = 195.20
    // Books: 45.99 + 60.00 = 105.99

    for (const auto& row : result.rows) {
        std::string category = std::get<std::string>(row[0]);
        double sales_sum = std::get<double>(row[1]);

        if (category == "Electronics") {
            ASSERT_NEAR(sales_sum, 451.25, 0.001);
        } else if (category == "Clothing") {
            ASSERT_NEAR(sales_sum, 195.20, 0.001);
        } else if (category == "Books") {
            ASSERT_NEAR(sales_sum, 105.99, 0.001);
        } else {
            FAIL() << "Unexpected category: " << category;
        }
    }
}

TEST_F(DataProcessorTest, ProcessData_AvgAggregation) {
    VisuFlow::Data::Processor::ProcessingConfig config;
    config.groupByColumn = "Category";
    config.metricColumn = "Sales";
    config.aggregationType = "avg";

    VisuFlow::Data::Model::DataTable result = processor.processData(sampleData, config);

    ASSERT_EQ(result.rows.size(), 3);

    for (const auto& row : result.rows) {
        std::string category = std::get<std::string>(row[0]);
        double sales_avg = std::get<double>(row[1]);

        if (category == "Electronics") {
            // (150.75 + 200.50 + 100.00) / 3 = 451.25 / 3 = 150.4166...
            ASSERT_NEAR(sales_avg, 150.4166, 0.001);
        } else if (category == "Clothing") {
            // (75.20 + 120.00) / 2 = 195.20 / 2 = 97.60
            ASSERT_NEAR(sales_avg, 97.60, 0.001);
        } else if (category == "Books") {
            // (45.99 + 60.00) / 2 = 105.99 / 2 = 52.995
            ASSERT_NEAR(sales_avg, 52.995, 0.001);
        }
    }
}

TEST_F(DataProcessorTest, ProcessData_CountAggregation) {
    VisuFlow::Data::Processor::ProcessingConfig config;
    config.groupByColumn = "Category";
    config.metricColumn = "Quantity"; // Metric column for count doesn't really matter, just need a column
    config.aggregationType = "count";

    VisuFlow::Data::Model::DataTable result = processor.processData(sampleData, config);

    ASSERT_EQ(result.rows.size(), 3);

    for (const auto& row : result.rows) {
        std::string category = std::get<std::string>(row[0]);
        double count = std::get<double>(row[1]); // Count is returned as double

        if (category == "Electronics") {
            ASSERT_EQ(count, 3.0);
        } else if (category == "Clothing") {
            ASSERT_EQ(count, 2.0);
        } else if (category == "Books") {
            ASSERT_EQ(count, 2.0);
        }
    }
}

TEST_F(DataProcessorTest, ProcessData_MinAggregation) {
    VisuFlow::Data::Processor::ProcessingConfig config;
    config.groupByColumn = "Category";
    config.metricColumn = "Sales";
    config.aggregationType = "min";

    VisuFlow::Data::Model::DataTable result = processor.processData(sampleData, config);

    ASSERT_EQ(result.rows.size(), 3);

    for (const auto& row : result.rows) {
        std::string category = std::get<std::string>(row[0]);
        double sales_min = std::get<double>(row[1]);

        if (category == "Electronics") {
            ASSERT_NEAR(sales_min, 100.00, 0.001);
        } else if (category == "Clothing") {
            ASSERT_NEAR(sales_min, 75.20, 0.001);
        } else if (category == "Books") {
            ASSERT_NEAR(sales_min, 45.99, 0.001);
        }
    }
}

TEST_F(DataProcessorTest, ProcessData_MaxAggregation) {
    VisuFlow::Data::Processor::ProcessingConfig config;
    config.groupByColumn = "Category";
    config.metricColumn = "Sales";
    config.aggregationType = "max";

    VisuFlow::Data::Model::DataTable result = processor.processData(sampleData, config);

    ASSERT_EQ(result.rows.size(), 3);

    for (const auto& row : result.rows) {
        std::string category = std::get<std::string>(row[0]);
        double sales_max = std::get<double>(row[1]);

        if (category == "Electronics") {
            ASSERT_NEAR(sales_max, 200.50, 0.001);
        } else if (category == "Clothing") {
            ASSERT_NEAR(sales_max, 120.00, 0.001);
        } else if (category == "Books") {
            ASSERT_NEAR(sales_max, 60.00, 0.001);
        }
    }
}

TEST_F(DataProcessorTest, ProcessData_WithFilter) {
    VisuFlow::Data::Processor::ProcessingConfig config;
    config.groupByColumn = "Category";
    config.metricColumn = "Sales";
    config.aggregationType = "sum";
    config.filters["Region"] = "North"; // Filter only for 'North' region

    VisuFlow::Data::Model::DataTable result = processor.processData(sampleData, config);

    // Expected rows: Electronics (150.75 + 200.50), Clothing (120.00)
    ASSERT_EQ(result.rows.size(), 2);

    for (const auto& row : result.rows) {
        std::string category = std::get<std::string>(row[0]);
        double sales_sum = std::get<double>(row[1]);

        if (category == "Electronics") {
            ASSERT_NEAR(sales_sum, 150.75 + 200.50, 0.001); // 351.25
        } else if (category == "Clothing") {
            ASSERT_NEAR(sales_sum, 120.00, 0.001);
        } else {
            FAIL() << "Unexpected category in filtered data: " << category;
        }
    }
}

TEST_F(DataProcessorTest, GetColumnIndex_ExistingColumn) {
    int index = processor.getColumnIndex(sampleData, "Category");
    ASSERT_EQ(index, 0);
    index = processor.getColumnIndex(sampleData, "Sales");
    ASSERT_EQ(index, 1);
}

TEST_F(DataProcessorTest, GetColumnIndex_NonExistingColumn) {
    ASSERT_THROW(processor.getColumnIndex(sampleData, "NonExistent"), VisuFlow::Util::APIException);
}

TEST_F(DataProcessorTest, EmptyInputTable) {
    VisuFlow::Data::Model::DataTable emptyTable;
    emptyTable.columns = sampleData.columns; // Still has columns, but no rows

    VisuFlow::Data::Processor::ProcessingConfig config;
    config.groupByColumn = "Category";
    config.metricColumn = "Sales";
    config.aggregationType = "sum";

    VisuFlow::Data::Model::DataTable result = processor.processData(emptyTable, config);
    ASSERT_TRUE(result.rows.empty());
    ASSERT_EQ(result.columns.size(), 2); // GroupBy column + Aggregated metric column
}

TEST_F(DataProcessorTest, ProcessData_NonNumericMetricColumn) {
    VisuFlow::Data::Processor::ProcessingConfig config;
    config.groupByColumn = "Category";
    config.metricColumn = "Region"; // Region is a string column
    config.aggregationType = "sum";

    VisuFlow::Data::Model::DataTable result = processor.processData(sampleData, config);

    // When metric column is non-numeric, it should fall back to 0 or similar,
    // or possibly error. Current implementation logs a warning and uses 0.0.
    ASSERT_EQ(result.rows.size(), 3); // Still groups by category

    for (const auto& row : result.rows) {
        double sum = std::get<double>(row[1]);
        ASSERT_NEAR(sum, 0.0, 0.001); // All sums should be 0 because Region is not numeric
    }
}

TEST_F(DataProcessorTest, ProcessData_InvalidGroupByColumn) {
    VisuFlow::Data::Processor::ProcessingConfig config;
    config.groupByColumn = "InvalidColumn";
    config.metricColumn = "Sales";
    config.aggregationType = "sum";

    ASSERT_THROW(processor.processData(sampleData, config), VisuFlow::Util::APIException);
}
```