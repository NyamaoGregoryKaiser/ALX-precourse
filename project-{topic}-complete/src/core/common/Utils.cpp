```cpp
#include "Utils.h"

namespace VisuFlow {
namespace Core {
namespace Common {

std::string Utils::dataTypeToString(Data::Model::DataType type) {
    switch (type) {
        case Data::Model::DataType::STRING: return "STRING";
        case Data::Model::DataType::INT: return "INT";
        case Data::Model::DataType::DOUBLE: return "DOUBLE";
        case Data::Model::DataType::BOOL: return "BOOL";
        case Data::Model::DataType::DATETIME: return "DATETIME";
        default: return "UNKNOWN";
    }
}

Data::Model::DataType Utils::stringToDataType(const std::string& typeString) {
    if (typeString == "STRING") return Data::Model::DataType::STRING;
    if (typeString == "INT") return Data::Model::DataType::INT;
    if (typeString == "DOUBLE") return Data::Model::DataType::DOUBLE;
    if (typeString == "BOOL") return Data::Model::DataType::BOOL;
    if (typeString == "DATETIME") return Data::Model::DataType::DATETIME;
    return Data::Model::DataType::UNKNOWN;
}

std::string Utils::sha256(const std::string& input) {
    // --- MOCK IMPLEMENTATION FOR DEMONSTRATION PURPOSES ---
    // In a real application, use a proper cryptographic library (e.g., OpenSSL, Crypto++).
    std::hash<std::string> hasher;
    size_t hashValue = hasher(input);
    std::stringstream ss;
    ss << std::hex << hashValue;
    // Pad with zeros and make it look like a SHA256 (64 hex characters)
    std::string hexHash = ss.str();
    if (hexHash.length() < 64) {
        hexHash = std::string(64 - hexHash.length(), '0') + hexHash;
    } else if (hexHash.length() > 64) {
        hexHash = hexHash.substr(0, 64);
    }
    return hexHash;
}

std::string Utils::get_current_timestamp() {
    auto now = std::chrono::system_clock::now();
    auto in_time_t = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    // Using std::put_time for ISO 8601 like format
    // Note: std::put_time requires C++11 and might not handle milliseconds.
    // For full ISO 8601 with milliseconds, manual formatting might be needed or a dedicated date/time library.
    ss << std::put_time(std::gmtime(&in_time_t), "%Y-%m-%dT%H:%M:%SZ");
    return ss.str();
}

} // namespace Common
} // namespace Core
} // namespace VisuFlow
```