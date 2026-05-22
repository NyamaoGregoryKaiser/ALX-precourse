```cpp
#pragma once

#include "pistache/http.h"
#include "pistache/endpoint.h"
#include "pistache/router.h"

class TaskController {
public:
    static void getTasks(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
    static void createTask(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
    static void getTaskById(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
    static void updateTask(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);
    static void deleteTask(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response);

private:
    static long getAuthenticatedUserId(const Pistache::Rest::Request& request);
};
```