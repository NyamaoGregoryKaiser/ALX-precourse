```cpp
#include "TaskController.h"
#include <json/json.h>
#include <vector>

// Helper to get user_id from request attributes set by AuthFilter
int getUserIdFromRequest(const drogon::HttpRequestPtr& req) {
    if (req->attributes()->find("user_id") != req->attributes()->end()) {
        return req->attributes()->get<int>("user_id");
    }
    return 0; // Should not happen if AuthFilter is properly applied
}

void TaskController::getTasks(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    int userId = getUserIdFromRequest(req);
    if (userId == 0) {
        return callback(ApiResponse::makeUnauthorizedResponse());
    }

    std::optional<Task::Status> statusFilter = std::nullopt;
    std::optional<int> categoryIdFilter = std::nullopt;

    // Parse query parameters
    if (req->getParameter("status").length() > 0) {
        std::string statusStr = req->getParameter("status");
        if (statusStr == "TODO") statusFilter = Task::Status::TODO;
        else if (statusStr == "IN_PROGRESS") statusFilter = Task::Status::IN_PROGRESS;
        else if (statusStr == "DONE") statusFilter = Task::Status::DONE;
        else {
            return callback(ApiResponse::makeErrorResponse("Invalid status filter. Must be TODO, IN_PROGRESS, or DONE.", drogon::k400BadRequest));
        }
    }
    if (req->getParameter("category_id").length() > 0) {
        try {
            categoryIdFilter = std::stoi(req->getParameter("category_id"));
        } catch (...) {
            return callback(ApiResponse::makeErrorResponse("Invalid category_id. Must be an integer.", drogon::k400BadRequest));
        }
    }

    drogon::app().getLoop()->queueInLoop([this, userId, statusFilter, categoryIdFilter, callback]() {
        drogon::Task<std::vector<Task>> task = taskService_.getTasksByUserId(userId, statusFilter, categoryIdFilter);
        std::weak_ptr<drogon::HttpRequest> weakReq = drogon::HttpRequest::currentRequest();

        task.then([callback, weakReq](std::vector<Task> tasks) {
            if (auto sharedReq = weakReq.lock()) {
                Json::Value dataArray;
                for (const auto& t : tasks) {
                    dataArray.append(t.toJson());
                }
                callback(ApiResponse::makeSuccessResponse(dataArray, "Tasks retrieved successfully"));
            }
        }).except([callback, weakReq](const drogon::HttpException& e) {
             if (auto sharedReq = weakReq.lock()) {
                callback(ApiResponse::makeErrorResponse(e.what(), e.statusCode()));
            }
        }).except([callback, weakReq](const std::exception& e) {
             if (auto sharedReq = weakReq.lock()) {
                LOG_ERROR << "Unhandled exception in getTasks: " << e.what();
                callback(ApiResponse::makeInternalServerErrorResponse());
            }
        });
    });
}

void TaskController::createTask(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    int userId = getUserIdFromRequest(req);
    if (userId == 0) {
        return callback(ApiResponse::makeUnauthorizedResponse());
    }

    if (req->contentType() != drogon::CT_APPLICATION_JSON) {
        return callback(ApiResponse::makeErrorResponse("Content-Type must be application/json", drogon::k400BadRequest));
    }

    try {
        const Json::Value& jsonBody = *req->getJsonObject();
        if (!jsonBody.isMember("title")) {
            return callback(ApiResponse::makeErrorResponse("Missing 'title' field", drogon::k400BadRequest));
        }

        drogon::app().getLoop()->queueInLoop([this, userId, jsonBody, callback]() {
            drogon::Task<Task> task = taskService_.createTask(userId, jsonBody);
            std::weak_ptr<drogon::HttpRequest> weakReq = drogon::HttpRequest::currentRequest();

            task.then([callback, weakReq](Task createdTask) {
                if (auto sharedReq = weakReq.lock()) {
                    callback(ApiResponse::makeSuccessResponse(createdTask.toJson(), "Task created successfully"));
                }
            }).except([callback, weakReq](const drogon::HttpException& e) {
                 if (auto sharedReq = weakReq.lock()) {
                    callback(ApiResponse::makeErrorResponse(e.what(), e.statusCode()));
                }
            }).except([callback, weakReq](const std::exception& e) {
                 if (auto sharedReq = weakReq.lock()) {
                    LOG_ERROR << "Unhandled exception in createTask: " << e.what();
                    callback(ApiResponse::makeInternalServerErrorResponse());
                }
            });
        });

    } catch (const Json::Exception& e) {
        return callback(ApiResponse::makeErrorResponse("Invalid JSON format", drogon::k400BadRequest));
    } catch (const std::exception& e) {
        LOG_ERROR << "Error in createTask: " << e.what();
        return callback(ApiResponse::makeInternalServerErrorResponse());
    }
}

void TaskController::getTaskById(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, int id) {
    int userId = getUserIdFromRequest(req);
    if (userId == 0) {
        return callback(ApiResponse::makeUnauthorizedResponse());
    }

    drogon::app().getLoop()->queueInLoop([this, id, userId, callback]() {
        drogon::Task<std::optional<Task>> task = taskService_.getTaskByIdAndUserId(id, userId);
        std::weak_ptr<drogon::HttpRequest> weakReq = drogon::HttpRequest::currentRequest();

        task.then([callback, weakReq](std::optional<Task> foundTask) {
            if (auto sharedReq = weakReq.lock()) {
                if (foundTask.has_value()) {
                    callback(ApiResponse::makeSuccessResponse(foundTask.value().toJson(), "Task retrieved successfully"));
                } else {
                    callback(ApiResponse::makeNotFoundResponse("Task"));
                }
            }
        }).except([callback, weakReq](const drogon::HttpException& e) {
             if (auto sharedReq = weakReq.lock()) {
                callback(ApiResponse::makeErrorResponse(e.what(), e.statusCode()));
            }
        }).except([callback, weakReq](const std::exception& e) {
             if (auto sharedReq = weakReq.lock()) {
                LOG_ERROR << "Unhandled exception in getTaskById: " << e.what();
                callback(ApiResponse::makeInternalServerErrorResponse());
            }
        });
    });
}

void TaskController::updateTask(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, int id) {
    int userId = getUserIdFromRequest(req);
    if (userId == 0) {
        return callback(ApiResponse::makeUnauthorizedResponse());
    }

    if (req->contentType() != drogon::CT_APPLICATION_JSON) {
        return callback(ApiResponse::makeErrorResponse("Content-Type must be application/json", drogon::k400BadRequest));
    }

    try {
        const Json::Value& jsonBody = *req->getJsonObject();
        if (jsonBody.empty()) {
            return callback(ApiResponse::makeErrorResponse("Request body cannot be empty for update", drogon::k400BadRequest));
        }

        drogon::app().getLoop()->queueInLoop([this, id, userId, jsonBody, callback]() {
            drogon::Task<Task> task = taskService_.updateTask(id, userId, jsonBody);
            std::weak_ptr<drogon::HttpRequest> weakReq = drogon::HttpRequest::currentRequest();

            task.then([callback, weakReq](Task updatedTask) {
                if (auto sharedReq = weakReq.lock()) {
                    callback(ApiResponse::makeSuccessResponse(updatedTask.toJson(), "Task updated successfully"));
                }
            }).except([callback, weakReq](const drogon::HttpException& e) {
                 if (auto sharedReq = weakReq.lock()) {
                    callback(ApiResponse::makeErrorResponse(e.what(), e.statusCode()));
                }
            }).except([callback, weakReq](const std::exception& e) {
                 if (auto sharedReq = weakReq.lock()) {
                    LOG_ERROR << "Unhandled exception in updateTask: " << e.what();
                    callback(ApiResponse::makeInternalServerErrorResponse());
                }
            });
        });

    } catch (const Json::Exception& e) {
        return callback(ApiResponse::makeErrorResponse("Invalid JSON format", drogon::k400BadRequest));
    } catch (const std::exception& e) {
        LOG_ERROR << "Error in updateTask: " << e.what();
        return callback(ApiResponse::makeInternalServerErrorResponse());
    }
}

void TaskController::deleteTask(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, int id) {
    int userId = getUserIdFromRequest(req);
    if (userId == 0) {
        return callback(ApiResponse::makeUnauthorizedResponse());
    }

    drogon::app().getLoop()->queueInLoop([this, id, userId, callback]() {
        drogon::Task<void> task = taskService_.deleteTask(id, userId);
        std::weak_ptr<drogon::HttpRequest> weakReq = drogon::HttpRequest::currentRequest();

        task.then([callback, weakReq]() {
            if (auto sharedReq = weakReq.lock()) {
                callback(ApiResponse::makeSuccessResponse(Json::Value(), "Task deleted successfully"));
            }
        }).except([callback, weakReq](const drogon::HttpException& e) {
             if (auto sharedReq = weakReq.lock()) {
                callback(ApiResponse::makeErrorResponse(e.what(), e.statusCode()));
            }
        }).except([callback, weakReq](const std::exception& e) {
             if (auto sharedReq = weakReq.lock()) {
                LOG_ERROR << "Unhandled exception in deleteTask: " << e.what();
                callback(ApiResponse::makeInternalServerErrorResponse());
            }
        });
    });
}
```