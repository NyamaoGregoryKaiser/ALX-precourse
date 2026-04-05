```cpp
#include "TagController.h"
#include <json/json.h>

using namespace TaskManager;

TagController::TagController() {
    auto dbClient = drogon::app().getDbClient();
    if (!dbClient) {
        LOG_FATAL << "Database client not available!";
        throw std::runtime_error("Database client not available for TagController.");
    }
    _tagService = std::make_shared<TagService>(dbClient);
}

void TagController::createTag(const HttpRequestPtr& req,
                               std::function<void(const HttpResponsePtr&)>&& callback) {
    Json::Value reqJson;
    try {
        reqJson = *req->get  >jsonObject();
    } catch (const std::exception& e) {
        callback(createErrorResponse("Invalid JSON body: " + std::string(e.what()), k400BadRequest));
        return;
    }

    try {
        std::string name = JsonUtils::getString(reqJson, "name");

        Tag newTag = _tagService->createTag(name);

        Json::Value respJson;
        respJson["message"] = "Tag created successfully";
        respJson["tag"] = tagToJson(newTag);
        auto resp = HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(k201Created);
        callback(resp);

    } catch (const ValidationException& e) {
        callback(createErrorResponse(e.what(), k400BadRequest));
    } catch (const ConflictException& e) {
        callback(createErrorResponse(e.what(), k409Conflict));
    } catch (const InternalServerException& e) {
        callback(createErrorResponse(e.what(), k500InternalServerError));
    } catch (const std::exception& e) {
        LOG_ERROR << "Unhandled exception in createTag: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}

void TagController::getAllTags(const HttpRequestPtr& req,
                                std::function<void(const HttpResponsePtr&)>&& callback) {
    try {
        std::vector<Tag> tags = _tagService->getAllTags();

        Json::Value respJsonArray(Json::arrayValue);
        for (const auto& tag : tags) {
            respJsonArray.append(tagToJson(tag));
        }
        auto resp = HttpResponse::newHttpJsonResponse(respJsonArray);
        resp->setStatusCode(k200OK);
        callback(resp);

    } catch (const InternalServerException& e) {
        callback(createErrorResponse(e.what(), k500InternalServerError));
    } catch (const std::exception& e) {
        LOG_ERROR << "Unhandled exception in getAllTags: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}

void TagController::getTagById(const HttpRequestPtr& req,
                                std::function<void(const HttpResponsePtr&)>&& callback,
                                int id) {
    try {
        Tag tag = _tagService->getTagById(id);

        Json::Value respJson = tagToJson(tag);
        auto resp = HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(k200OK);
        callback(resp);

    } catch (const NotFoundException& e) {
        callback(createErrorResponse(e.what(), k404NotFound));
    } catch (const InternalServerException& e) {
        callback(createErrorResponse(e.what(), k500InternalServerError));
    } catch (const std::exception& e) {
        LOG_ERROR << "Unhandled exception in getTagById: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}

void TagController::updateTag(const HttpRequestPtr& req,
                               std::function<void(const HttpResponsePtr&)>&& callback,
                               int id) {
    Json::Value reqJson;
    try {
        reqJson = *req->get  >jsonObject();
    } catch (const std::exception& e) {
        callback(createErrorResponse("Invalid JSON body: " + std::string(e.what()), k400BadRequest));
        return;
    }

    try {
        // AdminFilter already ensures only admins reach here
        std::optional<std::string> name_opt = JsonUtils::getOptionalString(reqJson, "name");

        if (!name_opt) {
            callback(createErrorResponse("No fields provided for update.", k400BadRequest));
            return;
        }

        Tag updatedTag = _tagService->updateTag(id, name_opt);

        Json::Value respJson;
        respJson["message"] = "Tag updated successfully";
        respJson["tag"] = tagToJson(updatedTag);
        auto resp = HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(k200OK);
        callback(resp);

    } catch (const ValidationException& e) {
        callback(createErrorResponse(e.what(), k400BadRequest));
    } catch (const ConflictException& e) {
        callback(createErrorResponse(e.what(), k409Conflict));
    } catch (const NotFoundException& e) {
        callback(createErrorResponse(e.what(), k404NotFound));
    } catch (const InternalServerException& e) {
        callback(createErrorResponse(e.what(), k500InternalServerError));
    } catch (const std::exception& e) {
        LOG_ERROR << "Unhandled exception in updateTag: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}

void TagController::deleteTag(const HttpRequestPtr& req,
                               std::function<void(const HttpResponsePtr&)>&& callback,
                               int id) {
    try {
        // AdminFilter already ensures only admins reach here
        _tagService->deleteTag(id);

        Json::Value respJson;
        respJson["message"] = "Tag deleted successfully";
        auto resp = HttpResponse::newHttpJsonResponse(respJson);
        resp->setStatusCode(k200OK);
        callback(resp);

    } catch (const NotFoundException& e) {
        callback(createErrorResponse(e.what(), k404NotFound));
    } catch (const InternalServerException& e) {
        callback(createErrorResponse(e.what(), k500InternalServerError));
    } catch (const std::exception& e) {
        LOG_ERROR << "Unhandled exception in deleteTag: " << e.what();
        callback(createErrorResponse("An unexpected error occurred.", k500InternalServerError));
    }
}
```