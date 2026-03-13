#ifndef CMS_UUID_HPP
#define CMS_UUID_HPP

#include <string>
#include <random>
#include <sstream>
#include <iomanip>
#include <array>

namespace cms::common {

// A simple UUID v4 generator for demonstration purposes.
// For production, consider using Boost.UUID or a more robust library.
class UUID {
public:
    static std::string generate_v4() {
        static std::random_device rd;
        static std::mt19937 gen(rd());
        static std::uniform_int_distribution<> dis(0, 15);
        static std::uniform_int_distribution<> dis_byte(8, 11); // For the variant field

        std::stringstream ss;
        std::array<int, 16> h;

        // Generate 32 hex characters
        for (int i = 0; i < 16; ++i) {
            h[i] = dis(gen);
        }

        // Set the UUID version (4) and variant (RFC 4122)
        h[6] = (h[6] & 0x3) | 0x4; // bits 12-15 of time_hi_and_version to 0100
        h[8] = (h[8] & 0xb) | 0x8; // bits 6-7 of clock_seq_hi_and_reserved to 10

        ss << std::hex << std::setfill('0');

        // Format as xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        for (int i = 0; i < 16; ++i) {
            ss << std::setw(1) << h[i];
            if (i == 3 || i == 5 || i == 7 || i == 9) {
                ss << "-";
            }
        }
        return ss.str();
    }

    // Helper to validate a UUID string format (basic check)
    static bool is_valid(const std::string& uuid_str) {
        if (uuid_str.length() != 36) return false;
        // Check hyphens positions
        if (uuid_str[8] != '-' || uuid_str[13] != '-' || uuid_str[18] != '-' || uuid_str[23] != '-') return false;
        // Check if all other characters are hexadecimal digits
        for (size_t i = 0; i < uuid_str.length(); ++i) {
            if (i == 8 || i == 13 || i == 18 || i == 23) continue;
            if (!std::isxdigit(uuid_str[i])) return false;
        }
        return true;
    }
};

} // namespace cms::common

#endif // CMS_UUID_HPP
```