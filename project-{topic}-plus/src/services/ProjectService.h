```cpp
#ifndef PROJECT_SERVICE_H
#define PROJECT_SERVICE_H

#include <string>
#include <vector>
#include <optional>
#include "../models/Project.h"
#include "../database/Database.h"
#include "../utils/Logger.h"
#include "../exceptions/CustomExceptions.h"
#include "../cache/Cache.h"

namespace TaskManager {
namespace Services {

class ProjectService {
public:
    ProjectService(Database::Database& db, Cache::Cache& cache);

    // CRUD Operations
    Models::Project createProject(Models::Project project);
    std::optional<Models::Project> getProjectById(long long id);
    std::vector<Models::Project> getAllProjects(int limit = 100, int offset = 0);
    std::vector<Models::Project> getProjectsByOwner(long long owner_id, int limit = 100, int offset = 0);
    Models::Project updateProject(long long id, const Models::Project& project_updates);
    void deleteProject(long long id);

private:
    Database::Database& db_;
    Cache::Cache& cache_;

    std::optional<Models::Project> mapRowToProject(const Database::Row& row);
    std::string generateCacheKey(long long projectId);
    void invalidateProjectCache(long long projectId);
};

} // namespace Services
} // namespace TaskManager

#endif // PROJECT_SERVICE_H
```