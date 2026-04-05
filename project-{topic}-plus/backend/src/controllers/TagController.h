```cpp
#ifndef TAG_CONTROLLER_H
#define TAG_CONTROLLER_H

#include <drogon/HttpController.h>
#include <drogon/orm/DbClient.h>
#include "services/TagService.h"
#include "utils/AppErrors.h"
#include "utils/JsonUtils.h"
#include "filters/AuthFilter.h"
#include "filters/AdminFilter.h" // For some tag management ops

using namespace drogon;
using namespace drogon::orm;
using namespace TaskManager;

/**
 * @brief Controller for tag management endpoints.
 * Authentication required. Some operations may require admin role.
 */
class TagController : public drogon::HttpController<TagController> {
public:
    METHOD_LIST_BEGIN
    // POST /tags - Create a new tag (Auth required)
    ADD_METHOD_TO(TagController::createTag, "/tags", Post, "AuthFilter");
    // GET /tags - Get all tags (Auth required)
    ADD_METHOD_TO(TagController::getAllTags, "/tags", Get, "AuthFilter");
    // GET /tags/{id} - Get a specific tag by ID (Auth required)
    ADD_METHOD_TO(TagController::getTagById, "/tags/{id}", Get, "AuthFilter");
    // PATCH /tags/{id} - Update a specific tag by ID (Auth required, Admin only)
    ADD_METHOD_TO(TagController::updateTag, "/tags/{id}", Patch, "AuthFilter", "AdminFilter");
    // DELETE /tags/{id} - Delete a specific tag by ID (Auth required, Admin only)
    ADD_METHOD_TO(TagController::deleteTag, "/tags/{id}", Delete, "AuthFilter", "AdminFilter");
    METHOD_LIST_END

    TagController();

    /**
     * @brief Creates a new tag.
     * POST /tags
     * Request Body: { "name": "..." }
     * Response: { "message": "Tag created", "tag": { "id": ..., "name": "..." } }
     */
    void createTag(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback);

    /**
     * @brief Retrieves all tags.
     * GET /tags
     * Response: [ { "id": ..., "name": "..." }, ... ]
     */
    void getAllTags(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback);

    /**
     * @brief Retrieves a specific tag by ID.
     * GET /tags/{id}
     * Response: { "id": ..., "name": "..." }
     */
    void getTagById(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, int id);

    /**
     * @brief Updates a specific tag by ID. (Admin only)
     * PATCH /tags/{id}
     * Request Body: { "name": "..." }
     * Response: { "message": "Tag updated", "tag": { "id": ..., "name": "..." } }
     */
    void updateTag(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, int id);

    /**
     * @brief Deletes a specific tag by ID. (Admin only)
     * DELETE /tags/{id}
     * Response: { "message": "Tag deleted successfully" }
     */
    void deleteTag(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback, int id);

private:
    std::shared_ptr<TagService> _tagService;

    // Helper for sending error responses
    HttpResponsePtr createErrorResponse(const std::string& message, HttpStatusCode code) {
        Json::Value respJson;
        respJson["message"] = message;
        auto resp = HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(code);
        return resp;
    }

    // Helper to convert Tag model to JSON
    Json::Value tagToJson(const Tag& tag) {
        Json::Value tagJson;
        tagJson["id"] = tag.getId();
        tagJson["name"] = tag.getName();
        tagJson["created_at"] = tag.getCreatedAt().toFormattedString(false);
        tagJson["updated_at"] = tag.getUpdatedAt().toFormattedString(false);
        return tagJson;
    }
};

} // namespace TaskManager

#endif // TAG_CONTROLLER_H
```