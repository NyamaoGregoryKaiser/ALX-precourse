```cpp
#pragma once

#include "models/Task.h"
#include <string>
#include <vector>
#include <optional>
#include <map>
#include <mutex>
#include <chrono>

class TaskService {
public:
    static Task createTask(const Task& newTask);
    static std::optional<Task> getTaskById(long taskId, long userId);
    static std::vector<Task> getTasksByUserId(long userId);
    static Task updateTask(long taskId, long userId, const Task& updatedTaskData);
    static bool deleteTask(long taskId, long userId);

private:
    // Simple in-memory cache for tasks
    static std::map<long, Task> s_task_cache;
    static std::mutex s_cache_mutex;
    static const std::chrono::seconds s_cache_ttl; // Time-to-live for cache entries

    static void addToCache(const Task& task);
    static void updateCache(const Task& task);
    static void removeFromCache(long taskId);
    static void clearCacheForUser(long userId); // Clear all tasks for a user
};
```