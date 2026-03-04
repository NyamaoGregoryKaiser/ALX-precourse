#pragma once

#include <vector>
#include <map>
#include <string>
#include <nlohmann/json.hpp>

// Define a common data structure for processed data
using ProcessedData = std::vector<std::map<std::string, nlohmann::json>>; // Can hold various types

class DataProcessor {
public:
    DataProcessor();

    // Generic processing method based on configuration
    ProcessedData process(const std::vector<std::map<std::string, std::string>>& raw_data, const nlohmann::json& config);

    // Specific transformation examples
    ProcessedData applyFilter(const std::vector<std::map<std::string, std::string>>& data, const nlohmann::json& filter_config);
    ProcessedData applyAggregation(const std::vector<std::map<std::string, std::string>>& data, const nlohmann::json& aggregation_config);
    ProcessedData sortData(const std::vector<std::map<std::string, std::string>>& data, const nlohmann::json& sort_config);

private:
    // Helper to convert string to appropriate type based on schema/guess
    nlohmann::json convertToAppropriateType(const std::string& value);
};