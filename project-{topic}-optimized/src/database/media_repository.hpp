#ifndef CMS_MEDIA_REPOSITORY_HPP
#define CMS_MEDIA_REPOSITORY_HPP

#include <string>
#include <vector>
#include <optional>
#include <chrono>
#include <pqxx/pqxx>
#include "db_connection.hpp"
#include "../models/media.hpp"
#include "../common/logger.hpp"
#include "../common/uuid.hpp"
#include "../common/error.hpp"

namespace cms::database {

class MediaRepository {
public:
    MediaRepository() = default;

    std::optional<cms::models::MediaFile> find_by_id(const std::string& id) {
        auto conn = DBConnection::get_instance().get_connection();
        pqxx::nontransaction N(*conn);
        std::stringstream ss;
        ss << "SELECT id, filename, filepath, mimetype, filesize_bytes, uploaded_by, uploaded_at FROM media_files WHERE id = " << N.quote(id);
        
        pqxx::result R = N.exec(ss.str());

        if (R.empty()) {
            return std::nullopt;
        }
        return row_to_media(R[0]);
    }

    std::optional<cms::models::MediaFile> find_by_filepath(const std::string& filepath) {
        auto conn = DBConnection::get_instance().get_connection();
        pqxx::nontransaction N(*conn);
        std::stringstream ss;
        ss << "SELECT id, filename, filepath, mimetype, filesize_bytes, uploaded_by, uploaded_at FROM media_files WHERE filepath = " << N.quote(filepath);
        
        pqxx::result R = N.exec(ss.str());

        if (R.empty()) {
            return std::nullopt;
        }
        return row_to_media(R[0]);
    }

    std::vector<cms::models::MediaFile> find_all(int limit, int offset) {
        std::vector<cms::models::MediaFile> media_list;
        auto conn = DBConnection::get_instance().get_connection();
        pqxx::nontransaction N(*conn);
        
        std::stringstream ss;
        ss << "SELECT id, filename, filepath, mimetype, filesize_bytes, uploaded_by, uploaded_at FROM media_files "
           << "ORDER BY uploaded_at DESC LIMIT " << N.quote(limit) << " OFFSET " << N.quote(offset);

        pqxx::result R = N.exec(ss.str());

        for (const auto& row : R) {
            media_list.push_back(row_to_media(row));
        }
        return media_list;
    }

    cms::models::MediaFile create(const cms::models::MediaFile& media_file) {
        auto conn = DBConnection::get_instance().get_connection();
        pqxx::work W(*conn);
        
        std::stringstream ss;
        ss << "INSERT INTO media_files (filename, filepath, mimetype, filesize_bytes, uploaded_by) VALUES ("
           << W.quote(media_file.filename) << ", "
           << W.quote(media_file.filepath) << ", "
           << W.quote(media_file.mimetype) << ", "
           << W.quote(media_file.filesize_bytes) << ", "
           << W.quote(media_file.uploaded_by)
           << ") RETURNING id, filename, filepath, mimetype, filesize_bytes, uploaded_by, uploaded_at";
        
        pqxx::result R = W.exec(ss.str());
        W.commit();
        
        return row_to_media(R[0]);
    }

    bool remove(const std::string& id) {
        auto conn = DBConnection::get_instance().get_connection();
        pqxx::work W(*conn);
        std::stringstream ss;
        ss << "DELETE FROM media_files WHERE id = " << W.quote(id);
        pqxx::result R = W.exec(ss.str());
        W.commit();
        return R.affected_rows() > 0;
    }

private:
    cms::models::MediaFile row_to_media(const pqxx::row& row) {
        cms::models::MediaFile media_file;
        media_file.id = row["id"].as<std::string>();
        media_file.filename = row["filename"].as<std::string>();
        media_file.filepath = row["filepath"].as<std::string>();
        media_file.mimetype = row["mimetype"].as<std::string>();
        media_file.filesize_bytes = row["filesize_bytes"].as<long long>();
        media_file.uploaded_by = row["uploaded_by"].as<std::string>();
        media_file.uploaded_at = row["uploaded_at"].as<std::chrono::system_clock::time_point>();
        return media_file;
    }
};

} // namespace cms::database

#endif // CMS_MEDIA_REPOSITORY_HPP
```