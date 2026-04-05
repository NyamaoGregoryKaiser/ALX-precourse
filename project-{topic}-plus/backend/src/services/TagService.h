```cpp
#ifndef TAG_SERVICE_H
#define TAG_SERVICE_H

#include <drogon/drogon.h>
#include <drogon/orm/Mapper.h>
#include <json/json.h>
#include <string>
#include <vector>
#include <memory>
#include <algorithm> // For std::transform
#include "models/Tag.h"
#include "models/Task.h"
#include "models/TaskTag.h"
#include "utils/AppErrors.h"

namespace TaskManager {

/**
 * @brief Service class for tag related business logic.
 * Handles CRUD operations for tags and associating them with tasks.
 */
class TagService {
public:
    TagService(drogon::orm::DbClientPtr dbClient)
        : _dbClient(dbClient), _tagMapper(dbClient), _taskMapper(dbClient), _taskTagMapper(dbClient) {}

    /**
     * @brief Creates a new tag.
     * @param name The name of the tag.
     * @return The created Tag object.
     * @throws ValidationException if tag name is empty.
     * @throws ConflictException if tag with the same name already exists.
     * @throws InternalServerException on database errors.
     */
    Tag createTag(const std::string& name) {
        if (name.empty()) {
            throw ValidationException("Tag name cannot be empty.");
        }

        try {
            // Check for existing tag
            if (_tagMapper.count(drogon::orm::Criteria("name", drogon::orm::EQ, name)) > 0) {
                throw ConflictException("Tag with name '" + name + "' already exists.");
            }

            Tag newTag(_dbClient);
            newTag.setName(name);
            newTag.insert();
            LOG_INFO << "Tag created: " << name;
            return newTag;
        } catch (const drogon::orm::DrogonDbException& e) {
            LOG_ERROR << "Database error creating tag: " << e.what();
            throw InternalServerException("Database error creating tag.");
        } catch (const ConflictException& e) {
            throw; // Re-throw specific exception
        } catch (const ValidationException& e) {
            throw; // Re-throw specific exception
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error creating tag: " << e.what();
            throw InternalServerException("Failed to create tag due to an unexpected error.");
        }
    }

    /**
     * @brief Retrieves a tag by its ID.
     * @param tagId The ID of the tag.
     * @return The Tag object.
     * @throws NotFoundException if tag does not exist.
     * @throws InternalServerException on database errors.
     */
    Tag getTagById(int tagId) {
        try {
            return _tagMapper.findByPrimaryKey(tagId);
        } catch (const drogon::orm::DrogonDbException& e) {
            if (e.what() && std::string(e.what()).find("result is empty") != std::string::npos) {
                throw NotFoundException("Tag with ID " + std::to_string(tagId) + " not found.");
            }
            LOG_ERROR << "Database error fetching tag by ID: " << e.what();
            throw InternalServerException("Database error fetching tag.");
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error fetching tag by ID: " << e.what();
            throw InternalServerException("Failed to fetch tag due to an unexpected error.");
        }
    }

    /**
     * @brief Retrieves all tags.
     * @return A vector of Tag objects.
     * @throws InternalServerException on database errors.
     */
    std::vector<Tag> getAllTags() {
        try {
            return _tagMapper.findAll();
        } catch (const drogon::orm::DrogonDbException& e) {
            LOG_ERROR << "Database error fetching all tags: " << e.what();
            throw InternalServerException("Database error fetching tags.");
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error fetching all tags: " << e.what();
            throw InternalServerException("Failed to fetch tags due to an unexpected error.");
        }
    }

    /**
     * @brief Updates an existing tag.
     * @param tagId The ID of the tag to update.
     * @param name_opt Optional new name for the tag.
     * @return The updated Tag object.
     * @throws NotFoundException if tag does not exist.
     * @throws ConflictException if new tag name already exists.
     * @throws ValidationException if tag name is empty.
     * @throws InternalServerException on database errors.
     */
    Tag updateTag(int tagId, const std::optional<std::string>& name_opt) {
        try {
            Tag tag = _tagMapper.findByPrimaryKey(tagId);

            if (name_opt) {
                if (name_opt->empty()) {
                    throw ValidationException("Tag name cannot be empty.");
                }
                if (*name_opt != tag.getName()) { // Only check conflict if name changes
                    if (_tagMapper.count(drogon::orm::Criteria("name", drogon::orm::EQ, *name_opt)) > 0) {
                        throw ConflictException("Tag with name '" + *name_opt + "' already exists.");
                    }
                }
                tag.setName(*name_opt);
            }

            tag.update();
            LOG_INFO << "Tag ID " << tagId << " updated.";
            return tag;
        } catch (const drogon::orm::DrogonDbException& e) {
            if (e.what() && std::string(e.what()).find("result is empty") != std::string::npos) {
                throw NotFoundException("Tag with ID " + std::to_string(tagId) + " not found.");
            }
            LOG_ERROR << "Database error updating tag: " << e.what();
            throw InternalServerException("Database error updating tag.");
        } catch (const NotFoundException& e) {
            throw;
        } catch (const ConflictException& e) {
            throw;
        } catch (const ValidationException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error updating tag: " << e.what();
            throw InternalServerException("Failed to update tag due to an unexpected error.");
        }
    }

    /**
     * @brief Deletes a tag by its ID.
     * @param tagId The ID of the tag to delete.
     * @throws NotFoundException if tag does not exist.
     * @throws InternalServerException on database errors.
     */
    void deleteTag(int tagId) {
        try {
            auto rowsAffected = _tagMapper.deleteBy(drogon::orm::Criteria("id", drogon::orm::EQ, tagId));
            if (rowsAffected == 0) {
                throw NotFoundException("Tag with ID " + std::to_string(tagId) + " not found.");
            }
            LOG_INFO << "Tag ID " << tagId << " deleted.";
        } catch (const drogon::orm::DrogonDbException& e) {
            LOG_ERROR << "Database error deleting tag: " << e.what();
            throw InternalServerException("Database error deleting tag.");
        } catch (const NotFoundException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error deleting tag: " << e.what();
            throw InternalServerException("Failed to delete tag due to an unexpected error.");
        }
    }

    /**
     * @brief Retrieves all tags associated with a specific task.
     * @param taskId The ID of the task.
     * @return A vector of Tag objects.
     * @throws NotFoundException if task does not exist.
     * @throws InternalServerException on database errors.
     */
    std::vector<Tag> getTagsForTask(int taskId) {
        try {
            _taskMapper.findByPrimaryKey(taskId); // Check if task exists

            // This requires a custom query as Drogon ORM doesn't natively handle M:N joins easily
            auto result = _dbClient->execSqlSync(
                "SELECT t.id, t.name, t.created_at, t.updated_at FROM tags t "
                "JOIN task_tags tt ON t.id = tt.tag_id "
                "WHERE tt.task_id = $1", taskId
            );

            std::vector<Tag> tags;
            for (const auto& row : result) {
                tags.emplace_back(Tag(row));
            }
            return tags;
        } catch (const drogon::orm::DrogonDbException& e) {
            if (e.what() && std::string(e.what()).find("result is empty") != std::string::npos) {
                throw NotFoundException("Task with ID " + std::to_string(taskId) + " not found.");
            }
            LOG_ERROR << "Database error fetching tags for task: " << e.what();
            throw InternalServerException("Database error fetching tags for task.");
        } catch (const NotFoundException& e) {
            throw;
        } catch (const std::exception& e) {
            LOG_ERROR << "Unexpected error fetching tags for task: " << e.what();
            throw InternalServerException("Failed to fetch tags for task due to an unexpected error.");
        }
    }

private:
    drogon::orm::DbClientPtr _dbClient;
    drogon::orm::Mapper<Tag> _tagMapper;
    drogon::orm::Mapper<Task> _taskMapper;
    drogon::orm::Mapper<TaskTag> _taskTagMapper;
};

} // namespace TaskManager

#endif // TAG_SERVICE_H
```