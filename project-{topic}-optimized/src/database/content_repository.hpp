#ifndef CMS_CONTENT_REPOSITORY_HPP
#define CMS_CONTENT_REPOSITORY_HPP

#include <string>
#include <vector>
#include <optional>
#include <chrono>
#include <pqxx/pqxx>
#include "db_connection.hpp"
#include "../models/content.hpp"
#include "../common/logger.hpp"
#include "../common/uuid.hpp"
#include "../common/error.hpp"

namespace cms::database {

class ContentRepository {
public:
    ContentRepository() = default;

    std::optional<cms::models::Content> find_by_id(const std::string& id) {
        auto conn = DBConnection::get_instance().get_connection();
        pqxx::nontransaction N(*conn);
        std::stringstream ss;
        ss << "SELECT id, title, slug, body, author_id, status, published_at, created_at, updated_at FROM content WHERE id = " << N.quote(id);
        
        pqxx::result R = N.exec(ss.str());

        if (R.empty()) {
            return std::nullopt;
        }
        return row_to_content(R[0]);
    }

    std::optional<cms::models::Content> find_by_slug(const std::string& slug) {
        auto conn = DBConnection::get_instance().get_connection();
        pqxx::nontransaction N(*conn);
        std::stringstream ss;
        ss << "SELECT id, title, slug, body, author_id, status, published_at, created_at, updated_at FROM content WHERE slug = " << N.quote(slug);
        
        pqxx::result R = N.exec(ss.str());

        if (R.empty()) {
            return std::nullopt;
        }
        return row_to_content(R[0]);
    }

    std::vector<cms::models::Content> find_all(int limit, int offset, const std::string& status_filter = "") {
        std::vector<cms::models::Content> content_list;
        auto conn = DBConnection::get_instance().get_connection();
        pqxx::nontransaction N(*conn);
        
        std::stringstream ss;
        ss << "SELECT id, title, slug, body, author_id, status, published_at, created_at, updated_at FROM content ";
        
        if (!status_filter.empty()) {
            ss << "WHERE status = " << N.quote(status_filter) << " ";
        }

        ss << "ORDER BY created_at DESC LIMIT " << N.quote(limit) << " OFFSET " << N.quote(offset);

        pqxx::result R = N.exec(ss.str());

        for (const auto& row : R) {
            content_list.push_back(row_to_content(row));
        }
        return content_list;
    }

    cms::models::Content create(const cms::models::Content& content) {
        auto conn = DBConnection::get_instance().get_connection();
        pqxx::work W(*conn);

        // Check for existing slug
        if (find_by_slug(content.slug)) {
            throw cms::common::ConflictException("Content with this slug already exists.");
        }
        
        std::stringstream ss;
        ss << "INSERT INTO content (title, slug, body, author_id, status, published_at) VALUES ("
           << W.quote(content.title) << ", "
           << W.quote(content.slug) << ", "
           << W.quote(content.body) << ", "
           << W.quote(content.author_id) << ", "
           << W.quote(cms::models::content_status_to_string(content.status)) << ", ";
        
        if (content.published_at) {
            ss << W.quote(*content.published_at);
        } else {
            ss << "NULL";
        }
        ss << ") RETURNING id, title, slug, body, author_id, status, published_at, created_at, updated_at";
        
        pqxx::result R = W.exec(ss.str());
        W.commit();
        
        return row_to_content(R[0]);
    }

    std::optional<cms::models::Content> update(const std::string& id, const cms::models::Content::UpdateFields& updates) {
        auto conn = DBConnection::get_instance().get_connection();
        pqxx::work W(*conn);
        
        std::string query_str = "UPDATE content SET ";
        bool first = true;

        if (updates.title) {
            if (!first) query_str += ", ";
            query_str += "title = " + W.quote(*updates.title);
            first = false;
        }
        if (updates.slug) {
            if (!first) query_str += ", ";
            query_str += "slug = " + W.quote(*updates.slug);
            first = false;
        }
        if (updates.body) {
            if (!first) query_str += ", ";
            query_str += "body = " + W.quote(*updates.body);
            first = false;
        }
        if (updates.status) {
            if (!first) query_str += ", ";
            query_str += "status = " + W.quote(cms::models::content_status_to_string(*updates.status));
            first = false;
        }
        if (updates.published_at) {
            if (!first) query_str += ", ";
            query_str += "published_at = " + W.quote(*updates.published_at);
            first = false;
        } else if (updates.published_at.has_value() && !updates.published_at.value()) { // Explicitly set to null
            if (!first) query_str += ", ";
            query_str += "published_at = NULL";
            first = false;
        }
        
        query_str += " WHERE id = " + W.quote(id) + " RETURNING id, title, slug, body, author_id, status, published_at, created_at, updated_at";
        
        if (first) { // No fields to update
            return find_by_id(id);
        }

        pqxx::result R = W.exec(query_str);
        W.commit();

        if (R.empty()) {
            return std::nullopt; // Content not found
        }
        return row_to_content(R[0]);
    }

    bool remove(const std::string& id) {
        auto conn = DBConnection::get_instance().get_connection();
        pqxx::work W(*conn);
        std::stringstream ss;
        ss << "DELETE FROM content WHERE id = " << W.quote(id);
        pqxx::result R = W.exec(ss.str());
        W.commit();
        return R.affected_rows() > 0;
    }

private:
    cms::models::Content row_to_content(const pqxx::row& row) {
        cms::models::Content content;
        content.id = row["id"].as<std::string>();
        content.title = row["title"].as<std::string>();
        content.slug = row["slug"].as<std::string>();
        content.body = row["body"].as<std::string>();
        content.author_id = row["author_id"].as<std::string>();
        content.status = cms::models::string_to_content_status(row["status"].as<std::string>());
        
        // Handle optional published_at
        if (!row["published_at"].is_null()) {
            content.published_at = row["published_at"].as<std::chrono::system_clock::time_point>();
        } else {
            content.published_at = std::nullopt;
        }

        content.created_at = row["created_at"].as<std::chrono::system_clock::time_point>();
        content.updated_at = row["updated_at"].as<std::chrono::system_clock::time_point>();
        return content;
    }
};

} // namespace cms::database

#endif // CMS_CONTENT_REPOSITORY_HPP
```