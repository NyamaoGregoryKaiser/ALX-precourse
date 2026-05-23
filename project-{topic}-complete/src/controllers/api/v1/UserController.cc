```cpp
#include "UserController.h"
#include <drogon/drogon.h>
#include <json/json.h>

namespace CMS::Controllers::API::V1 {

UserController::UserController() :
    userMapper_(drogon::app().getDbClient()),
    authService_(drogon::app().getDbClient()) {}

bool UserController::checkAuthorization(const drogon::HttpRequestPtr& req, const std::string& requiredRole, drogon::HttpResponsePtr& resp) {
    auto userId = req->attributes()->get<long long>("userId");
    auto userRole = req->attributes()->get<std::string>("userRole");

    if (!authService_.hasRole(userRole, requiredRole)) {
        resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k403Forbidden);
        resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);
        resp->setBody("{\"error\":\"Forbidden: Insufficient permissions\"}");
        return false;
    }
    return true;
}

void UserController::createUser(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto resp = drogon::HttpResponse::newHttpResponse();
    resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);

    Json::Value reqJson;
    try {
        reqJson = req->getJsonObject();
        if (!reqJson.isMember("username") || !reqJson.isMember("email") || !reqJson.isMember("password")) {
            resp->setStatusCode(drogon::k400BadRequest);
            resp->setBody("{\"error\":\"Username, email, and password are required\"}");
            callback(resp);
            return;
        }
    } catch (const std::exception& e) {
        resp->setStatusCode(drogon::k400BadRequest);
        resp->setBody(std::string("{\"error\":\"Invalid JSON format: ") + e.what() + "\"}");
        callback(resp);
        return;
    }

    CMS::Models::User newUser;
    newUser.username = reqJson["username"].asString();
    newUser.email = reqJson["email"].asString();
    newUser.password_hash = CMS::Models::UserMapper::hashPassword(reqJson["password"].asString());
    newUser.role = reqJson.isMember("role") ? reqJson["role"].asString() : "viewer"; // Default role

    userMapper_.create(newUser).then([=](const CMS::Models::User& createdUser) {
        Json::Value payload;
        payload["message"] = "User created successfully";
        payload["user"] = createdUser.toJson();
        resp->setStatusCode(drogon::k201Created);
        resp->setBody(payload.toStyledString());
        callback(resp);
    }).via(drogon::app().getIoLoop()).then([=](std::exception_ptr e) {
        try {
            if (e) std::rethrow_exception(e);
        } catch (const drogon::orm::DrogonDbException& ex) {
            LOG_ERROR << "Error creating user: " << ex.what();
            resp->setStatusCode(drogon::k409Conflict); // Example: email/username already exists
            resp->setBody(std::string("{\"error\":\"Failed to create user, possibly duplicate data: ") + ex.what() + "\"}");
            callback(resp);
        } catch (const std::exception& ex) {
            LOG_ERROR << "Unexpected error creating user: " << ex.what();
            resp->setStatusCode(drogon::k500InternalServerError);
            resp->setBody(std::string("{\"error\":\"Internal server error: ") + ex.what() + "\"}");
            callback(resp);
        }
    });
}

void UserController::getUsers(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto resp = drogon::HttpResponse::newHttpResponse();
    resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);

    if (!checkAuthorization(req, "admin", resp)) {
        callback(resp);
        return;
    }

    userMapper_.findAll().then([=](const std::vector<CMS::Models::User>& users) {
        Json::Value usersJsonArray;
        for (const auto& user : users) {
            usersJsonArray.append(user.toJson());
        }
        resp->setStatusCode(drogon::k200OK);
        resp->setBody(usersJsonArray.toStyledString());
        callback(resp);
    }).via(drogon::app().getIoLoop()).then([=](std::exception_ptr e) {
        try {
            if (e) std::rethrow_exception(e);
        } catch (const std::exception& ex) {
            LOG_ERROR << "Error fetching users: " << ex.what();
            resp->setStatusCode(drogon::k500InternalServerError);
            resp->setBody(std::string("{\"error\":\"Internal server error: ") + ex.what() + "\"}");
            callback(resp);
        }
    });
}

void UserController::getUserById(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, long long id) {
    auto resp = drogon::HttpResponse::newHttpResponse();
    resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);

    long long currentUserId = req->attributes()->get<long long>("userId");
    std::string currentUserRole = req->attributes()->get<std::string>("userRole");

    // A user can view their own profile, or an admin can view any profile
    if (!(currentUserId == id || authService_.hasRole(currentUserRole, "admin"))) {
        resp->setStatusCode(drogon::k403Forbidden);
        resp->setBody("{\"error\":\"Forbidden: You can only view your own user profile unless you are an admin\"}");
        callback(resp);
        return;
    }

    userMapper_.findById(id).then([=](const CMS::Models::User& user) {
        resp->setStatusCode(drogon::k200OK);
        resp->setBody(user.toJson().toStyledString());
        callback(resp);
    }).via(drogon::app().getIoLoop()).then([=](std::exception_ptr e) {
        try {
            if (e) std::rethrow_exception(e);
        } catch (const drogon::orm::UnexpectedRows& ex) {
            LOG_WARN << "User not found with ID: " << id;
            resp->setStatusCode(drogon::k404NotFound);
            resp->setBody("{\"error\":\"User not found\"}");
            callback(resp);
        } catch (const std::exception& ex) {
            LOG_ERROR << "Error fetching user by ID " << id << ": " << ex.what();
            resp->setStatusCode(drogon::k500InternalServerError);
            resp->setBody(std::string("{\"error\":\"Internal server error: ") + ex.what() + "\"}");
            callback(resp);
        }
    });
}

void UserController::updateUser(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, long long id) {
    auto resp = drogon::HttpResponse::newHttpResponse();
    resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);

    long long currentUserId = req->attributes()->get<long long>("userId");
    std::string currentUserRole = req->attributes()->get<std::string>("userRole");

    if (!(currentUserId == id || authService_.hasRole(currentUserRole, "admin"))) {
        resp->setStatusCode(drogon::k403Forbidden);
        resp->setBody("{\"error\":\"Forbidden: You can only update your own user profile unless you are an admin\"}");
        callback(resp);
        return;
    }

    Json::Value reqJson;
    try {
        reqJson = req->getJsonObject();
    } catch (const std::exception& e) {
        resp->setStatusCode(drogon::k400BadRequest);
        resp->setBody(std::string("{\"error\":\"Invalid JSON format: ") + e.what() + "\"}");
        callback(resp);
        return;
    }

    userMapper_.findById(id).then([=, reqJson = std::move(reqJson)](CMS::Models::User userToUpdate) mutable {
        if (reqJson.isMember("username")) userToUpdate.username = reqJson["username"].asString();
        if (reqJson.isMember("email")) userToUpdate.email = reqJson["email"].asString();
        if (reqJson.isMember("password")) userToUpdate.password_hash = CMS::Models::UserMapper::hashPassword(reqJson["password"].asString());
        
        // Only admin can change roles
        if (reqJson.isMember("role") && authService_.hasRole(currentUserRole, "admin")) {
            userToUpdate.role = reqJson["role"].asString();
        } else if (reqJson.isMember("role") && !authService_.hasRole(currentUserRole, "admin")) {
            LOG_WARN << "User " << currentUserId << " attempted to change role without admin privileges.";
            // Optionally, return 403 here, or just ignore the role change. Ignoring for now.
        }

        return userMapper_.update(userToUpdate);
    }).then([=](const CMS::Models::User& updatedUser) {
        Json::Value payload;
        payload["message"] = "User updated successfully";
        payload["user"] = updatedUser.toJson();
        resp->setStatusCode(drogon::k200OK);
        resp->setBody(payload.toStyledString());
        callback(resp);
    }).via(drogon::app().getIoLoop()).then([=](std::exception_ptr e) {
        try {
            if (e) std::rethrow_exception(e);
        } catch (const drogon::orm::UnexpectedRows& ex) {
            LOG_WARN << "User not found for update with ID: " << id;
            resp->setStatusCode(drogon::k404NotFound);
            resp->setBody("{\"error\":\"User not found\"}");
            callback(resp);
        } catch (const std::exception& ex) {
            LOG_ERROR << "Error updating user with ID " << id << ": " << ex.what();
            resp->setStatusCode(drogon::k500InternalServerError);
            resp->setBody(std::string("{\"error\":\"Internal server error: ") + ex.what() + "\"}");
            callback(resp);
        }
    });
}

void UserController::deleteUser(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, long long id) {
    auto resp = drogon::HttpResponse::newHttpResponse();
    resp->setContentTypeCode(drogon::CT_APPLICATION_JSON);

    // Only admin can delete users
    if (!checkAuthorization(req, "admin", resp)) {
        callback(resp);
        return;
    }

    userMapper_.remove(id).then([=]() {
        resp->setStatusCode(drogon::k204NoContent);
        callback(resp);
    }).via(drogon::app().getIoLoop()).then([=](std::exception_ptr e) {
        try {
            if (e) std::rethrow_exception(e);
        } catch (const drogon::orm::UnexpectedRows& ex) {
            LOG_WARN << "User not found for deletion with ID: " << id;
            resp->setStatusCode(drogon::k404NotFound);
            resp->setBody("{\"error\":\"User not found\"}");
            callback(resp);
        } catch (const std::exception& ex) {
            LOG_ERROR << "Error deleting user with ID " << id << ": " << ex.what();
            resp->setStatusCode(drogon::k500InternalServerError);
            resp->setBody(std::string("{\"error\":\"Internal server error: ") + ex.what() + "\"}");
            callback(resp);
        }
    });
}

} // namespace CMS::Controllers::API::V1
```