#pragma once

#include <string>
#include <vector>
#include <map>
#include <fstream>
#include <sstream>

// Represents a row of data as a map from header name to string value
using CsvRow = std::map<std::string, std::string>;
using CsvData = std::vector<CsvRow>;

class CsvParser {
public:
    CsvParser(char delimiter = ',');
    CsvData parseFile(const std::string& filepath);
    CsvData parseString(const std::string& csv_content);

private:
    char delimiter_;
    std::vector<std::string> parseHeader(std::istream& is);
    CsvRow parseRow(const std::vector<std::string>& headers, std::istream& is);
    std::vector<std::string> splitLine(const std::string& line);
};