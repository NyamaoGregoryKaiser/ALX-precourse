#ifndef CMS_CONTENT_HPP
#define CMS_CONTENT_HPP

#include <string>
#include <chrono>
#include <optional>
#include <nlohmann/json.hpp>
#include "../common/json_utils.hpp"

namespace cms::models {

enum class ContentStatus {
    DRAFT,
    PUBLISHED,
    ARCHIVED
};

inline std::string content_status_to_string(ContentStatus status) {
    switch (status) {
        case ContentStatus::DRAFT: return "draft";
        case ContentStatus::PUBLISHED: return "published";
        case ContentStatus::ARCHIVED: return "archived";
        default: return "unknown";
    }
}

inline ContentStatus string_to_content_status(const std::string& status_str) {
    if (status_str == "published") return ContentStatus::PUBLISHED;
    if (status_str == "archived") return ContentStatus::ARCHIVED;
    return ContentStatus::DRAFT; // Default or 'draft'
}

struct Content {
    std::string id;
    std::string title;
    std::string slug;
    std::string body;
    std::string author_id;
    ContentStatus status;
    std::optional<std::chrono::system_clock::time_point> published_at;
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point updated_at;

    struct UpdateFields {
        std::optional<std::string> title;
        std::optional<std::string> slug;
        std::optional<std::string> body;
        std::optional<ContentStatus> status;
        std::optional<std::chrono::system_clock::time_point> published_at; // Can be nullopt to clear
    };

    nlohmann::json to_json() const {
        nlohmann::json j;
        j["id"] = id;
        j["title"] = title;
        j["slug"] = slug;
        j["body"] = body;
        j["author_id"] = author_id;
        j["status"] = content_status_to_string(status);
        if (published_at) {
            j["published_at"] = common::format_iso8601(*published_at);
        } else {
            j["published_at"] = nullptr;
        }
        j["created_at"] = common::format_iso8601(created_at);
        j["updated_at"] = common::format_iso8601(updated_at);
        return j;
    }

    static Content from_json_create(const nlohmann::json& j, const std::string& author_id) {
        Content content;
        content.title = common::get_json_string_required(j, "title");
        content.slug = common::get_json_string_required(j, "slug");
        content.body = common::get_json_string_required(j, "body");
        content.author_id = author_id; // Set by authenticated user
        content.status = string_to_content_status(common::get_json_string(j, "status").value_or("draft"));
        
        if (auto pub_at_str = common::get_json_string(j, "published_at")) {
            content.published_at = common::parse_iso8601(*pub_at_str);
        }
        return content;
    }

    static UpdateFields update_from_json(const nlohmann::json& j) {
        UpdateFields updates;
        if (auto val = common::get_json_string(j, "title")) updates.title = val;
        if (auto val = common::get_json_string(j, "slug")) updates.slug = val;
        if (auto val = common::get_json_string(j, "body")) updates.body = val;

        if (j.contains("status") && j["status"].is_string()) {
            updates.status = string_to_content_status(j["status"].get<std::string>());
        }

        if (j.contains("published_at")) {
            if (j["published_at"].is_null()) {
                updates.published_at = std::nullopt; // Clear published_at
            } else if (j["published_at"].is_string()) {
                updates.published_at = common::parse_iso8601(j["published_at"].get<std::string>());
            }
        }
        return updates;
    }
};

} // namespace cms::models

#endif // CMS_CONTENT_HPP
```