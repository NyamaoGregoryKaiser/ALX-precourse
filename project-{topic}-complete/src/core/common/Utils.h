```cpp
#ifndef VISUFLOW_UTILS_H
#define VISUFLOW_UTILS_H

#include "data/model/DataModels.h" // For DataType enum
#include <string>
#include <chrono>
#include <iomanip> // For std::put_time
#include <sstream> // For std::stringstream
#include <stdexcept>
#include <random> // For SHA256 mock

namespace VisuFlow {
namespace Core {
namespace Common {

/**
 * @brief A collection of general utility functions.
 */
class Utils {
public:
    Utils() = delete; // Static class, no instances

    /**
     * @brief Converts a DataType enum to its string representation.
     * @param type The DataType enum value.
     * @return The string representation (e.g., "INT", "STRING").
     */
    static std::string dataTypeToString(Data::Model::DataType type);

    /**
     * @brief Converts a string to its DataType enum representation.
     * @param typeString The string representation of the type.
     * @return The corresponding DataType enum value.
     */
    static Data::Model::DataType stringToDataType(const std::string& typeString);

    /**
     * @brief Generates a SHA256 hash of a given string.
     * (Mock implementation for demonstration purposes; use a cryptographic library for production).
     * @param input The string to hash.
     * @return A mock SHA256 hash string.
     */
    static std::string sha256(const std::string& input);

    /**
     * @brief Gets the current timestamp in ISO 8601 format (e.g., "YYYY-MM-DDTHH:MM:SSZ").
     * @return The current timestamp as a string.
     */
    static std::string get_current_timestamp();
};

} // namespace Common
} // namespace Core
} // namespace VisuFlow

#endif // VISUFLOW_UTILS_H
```