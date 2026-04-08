```cpp
#include "core/Application.hpp"
#include "utils/Logger.hpp"
#include <iostream>

int main(int argc, char** argv) {
    try {
        DB_OPTIMIZER_LOG_INFO("Starting DB-Optimizer application...");
        Application app;
        app.init(argc, argv);
        app.run();
    } catch (const Poco::Exception& e) {
        DB_OPTIMIZER_LOG_CRITICAL("Poco Exception: {}", e.displayText());
        return 1;
    } catch (const std::exception& e) {
        DB_OPTIMIZER_LOG_CRITICAL("Standard Exception: {}", e.what());
        return 1;
    } catch (...) {
        DB_OPTIMIZER_LOG_CRITICAL("Unknown exception occurred.");
        return 1;
    }
    return 0;
}
```