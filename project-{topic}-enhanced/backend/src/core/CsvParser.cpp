#include "CsvParser.h"
#include "utils/Logger.h"
#include <stdexcept>
#include <algorithm> // For std::find

CsvParser::CsvParser(char delimiter) : delimiter_(delimiter) {}

CsvData CsvParser::parseFile(const std::string& filepath) {
    std::ifstream file(filepath);
    if (!file.is_open()) {
        Logger::error("Failed to open CSV file: " + filepath);
        throw std::runtime_error("Failed to open CSV file: " + filepath);
    }
    Logger::debug("Parsing CSV file: " + filepath);
    return parseStream(file);
}

CsvData CsvParser::parseString(const std::string& csv_content) {
    std::istringstream iss(csv_content);
    Logger::debug("Parsing CSV string content.");
    return parseStream(iss);
}

CsvData CsvParser::parseStream(std::istream& is) {
    CsvData data;
    std::vector<std::string> headers = parseHeader(is);
    if (headers.empty()) {
        Logger::warn("CSV file has no headers or is empty.");
        return data; // Return empty data if no headers
    }

    CsvRow row;
    while (is.good() && (row = parseRow(headers, is), !row.empty())) {
        data.push_back(row);
    }
    Logger::debug("Finished parsing CSV. Rows parsed: " + std::to_string(data.size()));
    return data;
}


std::vector<std::string> CsvParser::parseHeader(std::istream& is) {
    std::string line;
    if (std::getline(is, line)) {
        return splitLine(line);
    }
    return {};
}

CsvRow CsvParser::parseRow(const std::vector<std::string>& headers, std::istream& is) {
    std::string line;
    CsvRow row;
    if (std::getline(is, line)) {
        std::vector<std::string> values = splitLine(line);
        if (values.size() != headers.size()) {
            Logger::warn("Row value count mismatch with headers. Headers: " + std::to_string(headers.size()) + ", Values: " + std::to_string(values.size()));
            // Depending on desired behavior, could throw, log, or skip this row
            // For now, we'll try to match as many as possible
            // throw std::runtime_error("CSV row has incorrect number of columns.");
        }
        for (size_t i = 0; i < std::min(headers.size(), values.size()); ++i) {
            row[headers[i]] = values[i];
        }
    }
    return row;
}

std::vector<std::string> CsvParser::splitLine(const std::string& line) {
    std::vector<std::string> result;
    std::string current_field;
    bool in_quote = false;

    for (size_t i = 0; i < line.length(); ++i) {
        char c = line[i];

        if (c == '"') {
            if (in_quote && i + 1 < line.length() && line[i+1] == '"') {
                // Escaped quote
                current_field += '"';
                i++; // Skip next quote
            } else {
                in_quote = !in_quote;
            }
        } else if (c == delimiter_ && !in_quote) {
            result.push_back(current_field);
            current_field.clear();
        } else {
            current_field += c;
        }
    }
    result.push_back(current_field); // Add the last field
    return result;
}