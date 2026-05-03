```cpp
#include "PipelineHandler.hpp"

namespace MLToolkit {
namespace API {
namespace Handlers {

// Initialize the global cache for pipeline results
// Capacity can be configured from Config, e.g., Config::get_instance().get_int("CACHE_CAPACITY", 100)
Middleware::LRUCache<std::string, std::string> pipeline_result_cache(100);

} // namespace Handlers
} // namespace API
} // namespace MLToolkit
```