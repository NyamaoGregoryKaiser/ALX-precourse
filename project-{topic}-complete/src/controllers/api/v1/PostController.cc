```cpp
#include "PostController.h"
#include <drogon/drogon.h>
#include <json/json.h>
#include "utils/Cache.h"

namespace CMS::Controllers::API::V1 {

PostController::PostController() :
    postMapper_(drogon::app().getDbClient()),
    userMapper_(drogon::app().getDbClient()),
    categoryMapper_(drogon::app().getDbClient()),
    authService_(drogon::app().getDbClient()) {}

bool PostController::checkPostAuthorization(const drogon::HttpRequestPtr& req, drogon::HttpResponsePtr& resp, long long postAuthorId) {
    auto userId = req->attributes()->get<long long>("userId");
    auto userRole = req->attributes()->get<std::string>("userRole");

    // Admins can do anything
    if (authService_.hasRole(userRole, "admin")) {
        return true;
    }

    // Editors can create and update/delete any post
    if (authService_.hasRole(userRole, "editor")) {
        return true;
    }
    
    // Viewers cannot manage posts
    if (authService_.hasRole(userRole, "viewer")) {
        resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k403Forbidden);
        resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);
        resp->setBody("{\"error\":\"Forbidden: Insufficient permissions (viewer cannot manage posts)\"}");
        return false;
    }

    // A user can only manage their own posts if they are the author
    if (postAuthorId != 0 && userId == postAuthorId) {
        return true;
    }

    resp = drogon::HttpResponse::newHttpResponse();
    resp->setStatusCode(drogon::k403Forbidden);
    resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);
    resp->setBody("{\"error\":\"Forbidden: You can only manage your own posts\"}");
    return false;
}

void PostController::getPosts(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto resp = drogon::HttpResponse::newHttpResponse();
    resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);

    // Check cache first
    std::string cacheKey = "all_posts";
    if (CMS::Utils::Cache::get(cacheKey, resp)) {
        LOG_DEBUG << "Returning posts from cache.";
        callback(resp);
        return;
    }

    postMapper_.findAll().then([=](const std::vector<CMS::Models::Post>& posts) {
        Json::Value postsJsonArray;
        for (const auto& post : posts) {
            if (post.published) { // Only return published posts for public access
                postsJsonArray.append(post.toJson());
            }
        }
        resp->setStatusCode(drogon::k200OK);
        resp->setBody(postsJsonArray.toStyledString());
        CMS::Utils::Cache::set(cacheKey, resp); // Cache the response
        callback(resp);
    }).via(drogon::app().getIoLoop()).then([=](std::exception_ptr e) {
        try {
            if (e) std::rethrow_exception(e);
        } catch (const std::exception& ex) {
            LOG_ERROR << "Error fetching posts: " << ex.what();
            resp->setStatusCode(drogon::k500InternalServerError);
            resp->setBody(std::string("{\"error\":\"Internal server error: ") + ex.what() + "\"}");
            callback(resp);
        }
    });
}

void PostController::getPostById(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, long long id) {
    auto resp = drogon::HttpResponse::newHttpResponse();
    resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);

    std::string cacheKey = "post_" + std::to_string(id);
    if (CMS::Utils::Cache::get(cacheKey, resp)) {
        LOG_DEBUG << "Returning post " << id << " from cache.";
        callback(resp);
        return;
    }

    postMapper_.findById(id).then([=](const CMS::Models::Post& post) {
        if (!post.published) {
            // If not published, check if the requesting user is the author or an admin/editor
            // This requires AuthFilter to have run, but this endpoint is public.
            // For public access, only published posts are visible.
            auto userIdOpt = req->attributes()->getOptional<long long>("userId");
            auto userRoleOpt = req->attributes()->getOptional<std::string>("userRole");

            bool authorizedToViewUnpublished = false;
            if (userIdOpt && userRoleOpt) {
                if (authService_.hasAnyRole(userRoleOpt.value(), {"admin", "editor"})) {
                    authorizedToViewUnpublished = true;
                } else if (userIdOpt.value() == post.author_id) {
                    authorizedToViewUnpublished = true;
                }
            }

            if (!authorizedToViewUnpublished) {
                resp->setStatusCode(drogon::k404NotFound); // Return 404 to not reveal existence of unpublished posts
                resp->setBody("{\"error\":\"Post not found or not published\"}");
                callback(resp);
                return;
            }
        }
        resp->setStatusCode(drogon::k200OK);
        resp->setBody(post.toJson().toStyledString());
        CMS::Utils::Cache::set(cacheKey, resp); // Cache the response
        callback(resp);
    }).via(drogon::app().getIoLoop()).then([=](std::exception_ptr e) {
        try {
            if (e) std::rethrow_exception(e);
        } catch (const drogon::orm::UnexpectedRows& ex) {
            LOG_WARN << "Post not found with ID: " << id;
            resp->setStatusCode(drogon::k404NotFound);
            resp->setBody("{\"error\":\"Post not found\"}");
            callback(resp);
        } catch (const std::exception& ex) {
            LOG_ERROR << "Error fetching post by ID " << id << ": " << ex.what();
            resp->setStatusCode(drogon::k500InternalServerError);
            resp->setBody(std::string("{\"error\":\"Internal server error: ") + ex.what() + "\"}");
            callback(resp);
        }
    });
}

void PostController::createPost(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto resp = drogon::HttpResponse::newHttpResponse();
    resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);

    // Only "admin" or "editor" can create posts
    if (!checkPostAuthorization(req, resp)) { // postAuthorId=0 as it's a new post
        callback(resp);
        return;
    }

    Json::Value reqJson;
    try {
        reqJson = req->getJsonObject();
        if (!reqJson.isMember("title") || !reqJson.isMember("content") || !reqJson.isMember("category_id")) {
            resp->setStatusCode(drogon::k400BadRequest);
            resp->setBody("{\"error\":\"Title, content, and category_id are required\"}");
            callback(resp);
            return;
        }
    } catch (const std::exception& e) {
        resp->setStatusCode(drogon::k400BadRequest);
        resp->setBody(std::string("{\"error\":\"Invalid JSON format: ") + e.what() + "\"}");
        callback(resp);
        return;
    }

    CMS::Models::Post newPost;
    newPost.title = reqJson["title"].asString();
    newPost.content = reqJson["content"].asString();
    newPost.author_id = req->attributes()->get<long long>("userId"); // Author is the authenticated user
    newPost.category_id = reqJson["category_id"].asInt64();
    newPost.published = reqJson.isMember("published") ? reqJson["published"].asBool() : false;
    newPost.content_type = reqJson.isMember("content_type") ? reqJson["content_type"].asString() : "markdown";


    // Verify category exists
    categoryMapper_.findById(newPost.category_id).then([=](const CMS::Models::Category& category) {
        // Category exists, proceed to create post
        return postMapper_.create(newPost);
    }).then([=](const CMS::Models::Post& createdPost) {
        Json::Value payload;
        payload["message"] = "Post created successfully";
        payload["post"] = createdPost.toJson();
        resp->setStatusCode(drogon::k201Created);
        resp->setBody(payload.toStyledString());
        CMS::Utils::Cache::clear(); // Invalidate cache for posts
        callback(resp);
    }).via(drogon::app().getIoLoop()).then([=](std::exception_ptr e) {
        try {
            if (e) std::rethrow_exception(e);
        } catch (const drogon::orm::UnexpectedRows& ex) {
            if (std::string(ex.what()).find("Category not found") != std::string::npos) {
                LOG_WARN << "Category ID " << newPost.category_id << " not found for post creation.";
                resp->setStatusCode(drogon::k400BadRequest);
                resp->setBody("{\"error\":\"Invalid category_id\"}");
            } else {
                LOG_ERROR << "Error creating post: " << ex.what();
                resp->setStatusCode(drogon::k500InternalServerError);
                resp->setBody(std::string("{\"error\":\"Failed to create post: ") + ex.what() + "\"}");
            }
            callback(resp);
        } catch (const std::exception& ex) {
            LOG_ERROR << "Unexpected error creating post: " << ex.what();
            resp->setStatusCode(drogon::k500InternalServerError);
            resp->setBody(std::string("{\"error\":\"Internal server error: ") + ex.what() + "\"}");
            callback(resp);
        }
    });
}

void PostController::updatePost(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, long long id) {
    auto resp = drogon::HttpResponse::newHttpResponse();
    resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);

    Json::Value reqJson;
    try {
        reqJson = req->getJsonObject();
    } catch (const std::exception& e) {
        resp->setStatusCode(drogon::k400BadRequest);
        resp->setBody(std::string("{\"error\":\"Invalid JSON format: ") + e.what() + "\"}");
        callback(resp);
        return;
    }

    postMapper_.findById(id).then([=, reqJson = std::move(reqJson)](CMS::Models::Post postToUpdate) mutable {
        if (!checkPostAuthorization(req, resp, postToUpdate.author_id)) {
            // Callback already handled by checkPostAuthorization
            throw drogon::orm::UnexpectedRows("Auth failure", 0); // Propagate error
        }

        if (reqJson.isMember("title")) postToUpdate.title = reqJson["title"].asString();
        if (reqJson.isMember("content")) postToUpdate.content = reqJson["content"].asString();
        if (reqJson.isMember("published")) postToUpdate.published = reqJson["published"].asBool();
        if (reqJson.isMember("content_type")) postToUpdate.content_type = reqJson["content_type"].asString();

        // If category_id is updated, verify it exists
        if (reqJson.isMember("category_id")) {
            long long newCategoryId = reqJson["category_id"].asInt64();
            return categoryMapper_.findById(newCategoryId).then([&postToUpdate, newCategoryId](const CMS::Models::Category& category) {
                postToUpdate.category_id = newCategoryId;
                return postToUpdate; // Return updated post to the next chain
            });
        }
        return drogon::orm::make_ready_future(postToUpdate); // No category update
    }).then([=](const CMS::Models::Post& postToUpdate) {
        return postMapper_.update(postToUpdate);
    }).then([=](const CMS::Models::Post& updatedPost) {
        Json::Value payload;
        payload["message"] = "Post updated successfully";
        payload["post"] = updatedPost.toJson();
        resp->setStatusCode(drogon::k200OK);
        resp->setBody(payload.toStyledString());
        CMS::Utils::Cache::clear(); // Invalidate cache for posts
        callback(resp);
    }).via(drogon::app().getIoLoop()).then([=](std::exception_ptr e) {
        try {
            if (e) std::rethrow_exception(e);
        } catch (const drogon::orm::UnexpectedRows& ex) {
            if (std::string(ex.what()).find("Auth failure") != std::string::npos) {
                // If auth failed, response already set, just return
                callback(resp);
                return;
            }
            if (std::string(ex.what()).find("Category not found") != std::string::npos) {
                LOG_WARN << "Invalid category ID during post update for post " << id;
                resp->setStatusCode(drogon::k400BadRequest);
                resp->setBody("{\"error\":\"Invalid category_id for post update\"}");
            } else {
                LOG_WARN << "Post not found for update with ID: " << id;
                resp->setStatusCode(drogon::k404NotFound);
                resp->setBody("{\"error\":\"Post not found\"}");
            }
            callback(resp);
        } catch (const std::exception& ex) {
            LOG_ERROR << "Error updating post with ID " << id << ": " << ex.what();
            resp->setStatusCode(drogon::k500InternalServerError);
            resp->setBody(std::string("{\"error\":\"Internal server error: ") + ex.what() + "\"}");
            callback(resp);
        }
    });
}

void PostController::deletePost(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, long long id) {
    auto resp = drogon::HttpResponse::newHttpResponse();
    resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);

    postMapper_.findById(id).then([=](const CMS::Models::Post& postToDelete) {
        if (!checkPostAuthorization(req, resp, postToDelete.author_id)) {
            throw drogon::orm::UnexpectedRows("Auth failure", 0);
        }
        return postMapper_.remove(id);
    }).then([=]() {
        resp->setStatusCode(drogon::k204NoContent);
        CMS::Utils::Cache::clear(); // Invalidate cache for posts
        callback(resp);
    }).via(drogon::app().getIoLoop()).then([=](std::exception_ptr e) {
        try {
            if (e) std::rethrow_exception(e);
        } catch (const drogon::orm::UnexpectedRows& ex) {
            if (std::string(ex.what()).find("Auth failure") != std::string::npos) {
                callback(resp);
                return;
            }
            LOG_WARN << "Post not found for deletion with ID: " << id;
            resp->setStatusCode(drogon::k404NotFound);
            resp->setBody("{\"error\":\"Post not found\"}");
            callback(resp);
        } catch (const std::exception& ex) {
            LOG_ERROR << "Error deleting post with ID " << id << ": " << ex.what();
            resp->setStatusCode(drogon::k500InternalServerError);
            resp->setBody(std::string("{\"error\":\"Internal server error: ") + ex.what() + "\"}");
            callback(resp);
        }
    });
}

} // namespace CMS::Controllers::API::V1
```