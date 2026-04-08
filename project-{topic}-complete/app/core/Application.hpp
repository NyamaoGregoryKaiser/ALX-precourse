```cpp
#ifndef APPLICATION_HPP
#define APPLICATION_HPP

#include "Poco/Util/ServerApplication.h"
#include "Poco/Net/HTTPServer.h"
#include "Poco/Data/SessionPool.h"
#include <memory>
#include <vector>

#include "config/ConfigManager.hpp"
#include "db/DBConnectionPool.hpp"
#include "http/HTTPServer.hpp"
#include "services/DBMonitorService.hpp"
#include "utils/Logger.hpp"

class Application : public Poco::Util::ServerApplication {
public:
    Application();
    ~Application();

protected:
    void initialize(Poco::Util::Application& self) override;
    void uninitialize() override;
    void defineOptions(Poco::Util::OptionSet& options) override;
    void handleOption(const std::string& name, const std::string& value) override;
    int main(const std::vector<std::string>& args) override;

private:
    std::unique_ptr<ConfigManager> configManager;
    std::unique_ptr<DBConnectionPool> dbPool;
    std::unique_ptr<HTTPServer> httpServer;
    std::unique_ptr<DBMonitorService> dbMonitorService;

    bool _helpRequested;
};

#endif // APPLICATION_HPP
```