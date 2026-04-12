#pragma once

#include <pistache/http.h>
#include <pistache/router.h>
#include <json/json.h>

#include "src/models/task.h"
#include "src/auth/jwt_middleware.h" // For AuthContext
#include "src/utils/logger.h"
#include "src/utils/json_util.h"
#include "src/utils/exceptions.h"
#include "src/utils/cache.h" // For caching tasks

class TaskController {
public:
    TaskController();

    // Endpoint handlers
    Pistache::Rest::RouteCallback get_all_tasks();
    Pistache::Rest::RouteCallback get_task_by_id();
    Pistache::Rest::RouteCallback create_task();
    Pistache::Rest::RouteCallback update_task();
    Pistache::Rest::RouteCallback delete_task();

private:
    Utils::Cache<Task> task_cache_; // Simple in-memory cache for tasks
};
```