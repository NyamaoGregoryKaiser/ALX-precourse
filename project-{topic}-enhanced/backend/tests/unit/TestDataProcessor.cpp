#include <catch2/catch_test_macros.hpp>
#include "core/DataProcessor.h"
#include "nlohmann/json.hpp"
#include <vector>
#include <map>
#include <string>

// Helper to convert CsvRow to JSON map for comparison with ProcessedData
std::vector<std::map<std::string, nlohmann::json>> convert_csv_to_json_data(const std::vector<std::map<std::string, std::string>>& data) {
    std::vector<std::map<std::string, nlohmann::json>> json_data;
    for (const auto& row : data) {
        std::map<std::string, nlohmann::json> json_row;
        for (const auto& [key, value] : row) {
            try { // Attempt conversion to number
                size_t pos;
                int i_val = std::stoi(value, &pos);
                if (pos == value.length()) { json_row[key] = i_val; continue; }
            } catch(...) {}
            try {
                size_t pos;
                double d_val = std::stod(value, &pos);
                if (pos == value.length()) { json_row[key] = d_val; continue; }
            } catch(...) {}
            json_row[key] = value; // Default to string
        }
        json_data.push_back(json_row);
    }
    return json_data;
}


SCENARIO("DataProcessor can filter data", "[DataProcessor][Unit]") {
    GIVEN("A list of raw string data and a filter configuration") {
        std::vector<std::map<std::string, std::string>> raw_data = {
            {{"name", "Alice"}, {"age", "30"}, {"city", "NY"}},
            {{"name", "Bob"}, {"age", "25"}, {"city", "LA"}},
            {{"name", "Charlie"}, {"age", "35"}, {"city", "NY"}}
        };

        DataProcessor processor;

        WHEN("Filtering by age > 28") {
            nlohmann::json filter_config = {
                {"field", "age"},
                {"operator", ">"},
                {"value", 28}
            };
            auto filtered_data = processor.applyFilter(raw_data, filter_config);

            THEN("Only Alice and Charlie should remain") {
                REQUIRE(filtered_data.size() == 2);
                REQUIRE(filtered_data[0]["name"] == "Alice");
                REQUIRE(filtered_data[1]["name"] == "Charlie");
            }
        }

        WHEN("Filtering by city = NY") {
            nlohmann::json filter_config = {
                {"field", "city"},
                {"operator", "="},
                {"value", "NY"}
            };
            auto filtered_data = processor.applyFilter(raw_data, filter_config);

            THEN("Alice and Charlie should remain") {
                REQUIRE(filtered_data.size() == 2);
                REQUIRE(filtered_data[0]["name"] == "Alice");
                REQUIRE(filtered_data[1]["name"] == "Charlie");
            }
        }

        WHEN("Filtering by non-existent field") {
            nlohmann::json filter_config = {
                {"field", "country"},
                {"operator", "="},
                {"value", "USA"}
            };
            auto filtered_data = processor.applyFilter(raw_data, filter_config);

            THEN("No data should be returned") {
                REQUIRE(filtered_data.empty());
            }
        }
    }
}

SCENARIO("DataProcessor can aggregate data by sum", "[DataProcessor][Unit]") {
    GIVEN("A list of raw string data and an aggregation configuration") {
        std::vector<std::map<std::string, std::string>> raw_data = {
            {{"category", "Fruits"}, {"item", "Apple"}, {"sales", "100"}},
            {{"category", "Vegetables"}, {"item", "Carrot"}, {"sales", "150"}},
            {{"category", "Fruits"}, {"item", "Banana"}, {"sales", "50"}},
            {{"category", "Vegetables"}, {"item", "Potato"}, {"sales", "200"}}
        };

        DataProcessor processor;

        WHEN("Aggregating sales by category") {
            nlohmann::json aggregation_config = {
                {"group_by", "category"},
                {"aggregate_field", "sales"},
                {"operation", "sum"}
            };
            auto aggregated_data = processor.applyAggregation(raw_data, aggregation_config);

            THEN("Results should be correct sums per category") {
                REQUIRE(aggregated_data.size() == 2);
                
                // Find fruits total
                auto fruits_it = std::find_if(aggregated_data.begin(), aggregated_data.end(), 
                                                [](const auto& row){ return row.at("category") == "Fruits"; });
                REQUIRE(fruits_it != aggregated_data.end());
                REQUIRE(fruits_it->at("sales_sum") == 150.0);

                // Find vegetables total
                auto veggies_it = std::find_if(aggregated_data.begin(), aggregated_data.end(),
                                                [](const auto& row){ return row.at("category") == "Vegetables"; });
                REQUIRE(veggies_it != aggregated_data.end());
                REQUIRE(veggies_it->at("sales_sum") == 350.0);
            }
        }
    }
}

SCENARIO("DataProcessor can sort data", "[DataProcessor][Unit]") {
    GIVEN("A list of raw string data and a sort configuration") {
        std::vector<std::map<std::string, std::string>> raw_data = {
            {{"id", "1"}, {"value", "30"}},
            {{"id", "2"}, {"value", "10"}},
            {{"id", "3"}, {"value", "20"}}
        };

        DataProcessor processor;
        
        // Convert raw_data to ProcessedData equivalent for direct comparison later
        std::vector<std::map<std::string, nlohmann::json>> expected_asc = {
            {{"id", "2"}, {"value", 10}},
            {{"id", "3"}, {"value", 20}},
            {{"id", "1"}, {"value", 30}}
        };
        std::vector<std::map<std::string, nlohmann::json>> expected_desc = {
            {{"id", "1"}, {"value", 30}},
            {{"id", "3"}, {"value", 20}},
            {{"id", "2"}, {"value", 10}}
        };

        WHEN("Sorting by value ascending") {
            nlohmann::json sort_config = {
                {"field", "value"},
                {"order", "asc"}
            };
            auto sorted_data = processor.sortData(raw_data, sort_config);

            THEN("Data should be sorted by value in ascending order") {
                REQUIRE(sorted_data.size() == 3);
                REQUIRE(sorted_data[0]["value"] == 10);
                REQUIRE(sorted_data[1]["value"] == 20);
                REQUIRE(sorted_data[2]["value"] == 30);
            }
        }

        WHEN("Sorting by value descending") {
            nlohmann::json sort_config = {
                {"field", "value"},
                {"order", "desc"}
            };
            auto sorted_data = processor.sortData(raw_data, sort_config);

            THEN("Data should be sorted by value in descending order") {
                REQUIRE(sorted_data.size() == 3);
                REQUIRE(sorted_data[0]["value"] == 30);
                REQUIRE(sorted_data[1]["value"] == 20);
                REQUIRE(sorted_data[2]["value"] == 10);
            }
        }
    }
}