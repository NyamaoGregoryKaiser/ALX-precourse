```cpp
#include <drogon/drogon.h>
#include <iostream>

int main() {
    // Set HTTP listener address and port
    drogon::app().addListener("0.0.0.0", 8080);

    // Set document root for static files (e.g., frontend HTML, CSS, JS)
    // This assumes 'web' directory is copied to the build directory.
    drogon::app().setDocumentRoot("./web");

    // Load configuration from config.json
    drogon::app().loadConfigFile("./config.json");

    // Enable logging
    drogon::app().setLogPath("./log");
    drogon::app().setLogLevel(trantor::LogLevel::kDebug);
    LOG_INFO << "Server started on 0.0.0.0:8080";

    // Set maximum number of connections (optional)
    // drogon::app().setMaxConnectionNum(1000);

    // Run the application
    drogon::app().run();

    return 0;
}
```