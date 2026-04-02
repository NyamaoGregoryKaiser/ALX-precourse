```cpp
#ifndef TIME_UTIL_H
#define TIME_UTIL_H

#include <string>
#include <chrono>
#include <ctime>
#include <iomanip>
#include <sstream>

namespace TaskManager {
namespace Utils {

class TimeUtil {
public:
    static std::string getCurrentTimestamp() {
        auto now = std::chrono::system_clock::now();
        auto in_time_t = std::chrono::system_clock::to_time_t(now);

        std::stringstream ss;
        ss << std::put_time(std::gmtime(&in_time_t), "%Y-%m-%d %H:%M:%S");
        return ss.str();
    }

    static long long getCurrentUnixTimestamp() {
        return std::chrono::duration_cast<std::chrono::seconds>(
                   std::chrono::system_clock::now().time_since_epoch()
               ).count();
    }
};

} // namespace Utils
} // namespace TaskManager

#endif // TIME_UTIL_H
```