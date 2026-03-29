```cpp
#ifndef PROJECT_SERVICE_HPP
#define PROJECT_SERVICE_HPP

#include <memory>
#include <string>
#include <vector>
#include <optional>
#include "../models/Project.hpp"
#include "../database/DatabaseManager.hpp"
#include "../utils/Logger.hpp"
#include "../exceptions/CustomExceptions.hpp"
#include "../models/DTOs.hpp" // For ProjectCreateDTO, ProjectUpdateDTO

class ProjectService {
public:
    ProjectService(std::shared_ptr<DatabaseManager> db_manager);

    Project createProject(const ProjectCreateDTO& project_dto, int auth_user_id);
    std::optional<Project> getProjectById(int id);
    std::vector<Project> getAllProjects();
    Project updateProject(int id, const ProjectUpdateDTO& project_dto);
    bool deleteProject(int id);
    bool isProjectOwner(int project_id, int user_id);

private:
    std::shared_ptr<DatabaseManager> db_manager_;
};

#endif // PROJECT_SERVICE_HPP
```