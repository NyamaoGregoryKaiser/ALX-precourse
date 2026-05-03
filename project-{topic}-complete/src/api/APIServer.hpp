```cpp
#ifndef MLTOOLKIT_APISERVER_HPP
#define MLTOOLKIT_APISERVER_HPP

#include <crow.h>
#include <string>
#include <memory>

#include "../common/Logger.hpp"
#include "../config/Config.hpp"
#include "../middleware/AuthMiddleware.hpp"
#include "../middleware/LoggingMiddleware.hpp"
#include "../middleware/ErrorHandler.hpp"
#include "../middleware/RateLimiter.hpp"

#include "handlers/AuthHandler.hpp"
#include "handlers/DatasetHandler.hpp"
#include "handlers/ModelHandler.hpp"
#include "handlers/PipelineHandler.hpp"

namespace MLToolkit {
namespace API {

class APIServer {
public:
    APIServer();
    ~APIServer() = default;

    void run(int port);
    void stop();

private:
    crow::App<
        Middleware::LoggingMiddleware,
        Middleware::AuthMiddleware,
        Middleware::RateLimiter // RateLimiter should be before Auth for unauthenticated clients
    > app_;

    void setup_routes();
};

} // namespace API
} // namespace MLToolkit

#endif // MLTOOLKIT_APISERVER_HPP
```