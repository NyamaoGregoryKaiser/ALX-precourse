```cpp
#include "AdminController.h"
#include <drogon/drogon.h>
#include <json/json.h>

namespace CMS::Controllers::Web {

AdminController::AdminController() :
    authService_(drogon::app().getDbClient()),
    postMapper_(drogon::app().getDbClient()),
    categoryMapper_(drogon::app().getDbClient()) {}

void AdminController::showLogin(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto resp = drogon::HttpResponse::newHttpViewResponse("login.csp");
    callback(resp);
}

void AdminController::adminLogin(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto resp = drogon::HttpResponse::newRedirectionResponse("/admin/login"); // Default to redirect back to login

    std::string email = req->getParameter("email");
    std::string password = req->getParameter("password");

    if (email.empty() || password.empty()) {
        resp->setStatusCode(drogon::k400BadRequest);
        resp->addHeader("Location", "/admin/login?error=Email and password required");
        callback(resp);
        return;
    }

    authService_.authenticate(email, password).then([=](std::tuple<std::string, CMS::Models::User> authResult) {
        std::string token = std::get<0>(authResult);
        CMS::Models::User user = std::get<1>(authResult);

        // For web login, store JWT in session or as a cookie (for simple SSR)
        // For production, use secure, http-only cookies.
        auto session = req->session();
        session->insert("jwt_token", token);
        session->insert("userId", user.id);
        session->insert("userRole", user.role);

        if (authService_.hasAnyRole(user.role, {"admin", "editor"})) {
            resp->setStatusCode(drogon::k302Found);
            resp->addHeader("Location", "/admin/dashboard");
        } else {
            resp->setStatusCode(drogon::k403Forbidden);
            resp->addHeader("Location", "/admin/login?error=Access+denied");
        }
        callback(resp);
    }).via(drogon::app().getIoLoop()).then([=](std::exception_ptr e) {
        try {
            if (e) std::rethrow_exception(e);
        } catch (const drogon::orm::UnexpectedRows& ex) {
            LOG_WARN << "Admin login failed for email " << email << ": " << ex.what();
            resp->addHeader("Location", "/admin/login?error=Invalid+credentials");
            resp->setStatusCode(drogon::k302Found); // Redirect with error
            callback(resp);
        } catch (const std::exception& ex) {
            LOG_ERROR << "Error during admin login for email " << email << ": " << ex.what();
            resp->addHeader("Location", "/admin/login?error=Internal+server+error");
            resp->setStatusCode(drogon::k302Found); // Redirect with error
            callback(resp);
        }
    });
}

void AdminController::adminDashboard(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto resp = drogon::HttpResponse::newHttpResponse();
    
    auto userId = req->attributes()->get<long long>("userId");
    auto userRole = req->attributes()->get<std::string>("userRole");

    if (!authService_.hasAnyRole(userRole, {"admin", "editor", "viewer"})) {
        resp = drogon::HttpResponse::newRedirectionResponse("/admin/login?error=Access+denied");
        callback(resp);
        return;
    }

    Json::Value data;
    data["username"] = req->session()->getOptional<std::string>("username").value_or("Guest");
    data["user_role"] = userRole;

    drogon::app().getLoop()->queueInLoop([=, data=std::move(data)]() mutable { // Ensure data is moved
        auto view = drogon::HttpViewData();
        view.insert("title", "Admin Dashboard");
        view.insert("username", data["username"].asString());
        view.insert("role", data["user_role"].asString());

        // Example data to display on dashboard
        long long totalPosts = 0;
        long long publishedPosts = 0;
        long long totalUsers = 0;
        long long totalCategories = 0;

        // Fetch counts for dashboard
        drogon::app().getDbClient()->execSqlAsync("SELECT COUNT(*) FROM posts").then([&totalPosts](const drogon::orm::Result& r){ totalPosts = r[0][0].as<long long>(); })
        .then([&publishedPosts](){ return drogon::app().getDbClient()->execSqlAsync("SELECT COUNT(*) FROM posts WHERE published = TRUE"); })
        .then([&publishedPosts](const drogon::orm::Result& r){ publishedPosts = r[0][0].as<long long>(); })
        .then([&totalUsers](){ return drogon::app().getDbClient()->execSqlAsync("SELECT COUNT(*) FROM users"); })
        .then([&totalUsers](const drogon::orm::Result& r){ totalUsers = r[0][0].as<long long>(); })
        .then([&totalCategories](){ return drogon::app().getDbClient()->execSqlAsync("SELECT COUNT(*) FROM categories"); })
        .then([&totalCategories](const drogon::orm::Result& r){ totalCategories = r[0][0].as<long long>(); })
        .then([&, view](...) mutable { // Capture by value for view
            view.insert("totalPosts", totalPosts);
            view.insert("publishedPosts", publishedPosts);
            view.insert("totalUsers", totalUsers);
            view.insert("totalCategories", totalCategories);
            auto dashboardResp = drogon::HttpResponse::newHttpViewResponse("admin_dashboard.csp", view);
            callback(dashboardResp);
        }).handleExcept([&](const std::exception_ptr &e){
            LOG_ERROR << "Error fetching dashboard stats: " << (e ? drogon::utils::formattedException(e) : "Unknown error");
            view.insert("error_message", "Failed to load dashboard data.");
            auto dashboardResp = drogon::HttpResponse::newHttpViewResponse("admin_dashboard.csp", view);
            callback(dashboardResp);
        });
    });
}


void AdminController::managePosts(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto resp = drogon::HttpResponse::newHttpResponse();
    
    auto userId = req->attributes()->get<long long>("userId");
    auto userRole = req->attributes()->get<std::string>("userRole");

    if (!authService_.hasAnyRole(userRole, {"admin", "editor"})) {
        resp = drogon::HttpResponse::newRedirectionResponse("/admin/dashboard?error=Access+denied");
        callback(resp);
        return;
    }

    // Fetch all posts for display
    postMapper_.findAll().then([=](const std::vector<CMS::Models::Post>& posts) {
        Json::Value postsJsonArray;
        for (const auto& post : posts) {
            postsJsonArray.append(post.toJson());
        }

        auto view = drogon::HttpViewData();
        view.insert("title", "Manage Posts");
        view.insert("username", req->session()->getOptional<std::string>("username").value_or("Guest"));
        view.insert("role", userRole);
        view.insert("posts", postsJsonArray); // Pass JSON array to the view

        auto postsResp = drogon::HttpResponse::newHttpViewResponse("admin_dashboard.csp", view); // Re-using dashboard template for simplicity
        callback(postsResp);
    }).via(drogon::app().getIoLoop()).then([=](std::exception_ptr e) {
        try {
            if (e) std::rethrow_exception(e);
        } catch (const std::exception& ex) {
            LOG_ERROR << "Error fetching posts for admin: " << ex.what();
            auto view = drogon::HttpViewData();
            view.insert("title", "Manage Posts Error");
            view.insert("username", req->session()->getOptional<std::string>("username").value_or("Guest"));
            view.insert("role", userRole);
            view.insert("error_message", std::string("Failed to load posts: ") + ex.what());
            auto errorResp = drogon::HttpResponse::newHttpViewResponse("admin_dashboard.csp", view);
            callback(errorResp);
        }
    });
}

void AdminController::logout(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    req->session()->erase("jwt_token");
    req->session()->erase("userId");
    req->session()->erase("userRole");
    req->session()->erase("username"); // Clear any other session data

    auto resp = drogon::HttpResponse::newRedirectionResponse("/admin/login?message=Logged+out+successfully");
    callback(resp);
}

} // namespace CMS::Controllers::Web
```