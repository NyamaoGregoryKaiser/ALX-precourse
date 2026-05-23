```cpp
#pragma once

#include <drogon/HttpController.h>
#include "models/Post.h"
#include "services/AuthService.h"

namespace CMS::Controllers::API::V1 {

class PostController : public drogon::HttpController<PostController> {
public:
    METHOD_LIST_BEGIN
    // Public access for viewing posts
    METHOD_ADD(PostController::getPosts, "/posts", drogon::Get);
    METHOD_ADD(PostController::getPostById, "/posts/{id}", drogon::Get);

    // Authenticated access for managing posts
    METHOD_ADD(PostController::createPost, "/posts", drogon::Post, "AuthFilter", "RateLimitFilter");
    METHOD_ADD(PostController::updatePost, "/posts/{id}", drogon::Put, "AuthFilter", "RateLimitFilter");
    METHOD_ADD(PostController::deletePost, "/posts/{id}", drogon::Delete, "AuthFilter", "RateLimitFilter");
    METHOD_LIST_END

    PostController();

    void getPosts(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getPostById(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, long long id);
    void createPost(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void updatePost(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, long long id);
    void deletePost(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, long long id);

private:
    CMS::Models::PostMapper postMapper_;
    CMS::Models::UserMapper userMapper_; // To verify author_id
    CMS::Models::CategoryMapper categoryMapper_; // To verify category_id
    CMS::Services::AuthService authService_;

    // Helper to check authorization for post management (editor, admin)
    bool checkPostAuthorization(const drogon::HttpRequestPtr& req, drogon::HttpResponsePtr& resp, long long postAuthorId = 0);
};

} // namespace CMS::Controllers::API::V1
```