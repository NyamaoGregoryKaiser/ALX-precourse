#ifndef CMS_MEDIA_HPP
#define CMS_MEDIA_HPP

#include <string>
#include <chrono>
#include <optional>
#include <nlohmann/json.hpp>
#include "../common/json_utils.hpp"

namespace cms::models {

struct MediaFile {
    std::string id;
    std::string filename;
    std::string filepath; // Relative path, e.g., "uploads/image.jpg"
    std::string mimetype;
    long long filesize_bytes;
    std::string uploaded_by; // User ID
    std::chrono::system_clock::time_point uploaded_at;

    nlohmann::json to_json() const {
        nlohmann::json j;
        j["id"] = id;
        j["filename"] = filename;
        j["filepath"] = filepath;
        j["mimetype"] = mimetype;
        j["filesize_bytes"] = filesize_bytes;
        j["uploaded_by"] = uploaded_by;
        j["uploaded_at"] = common::format_iso8601(uploaded_at);
        return j;
    }

    // For simplicity, MediaFile creation will be handled internally by the service
    // based on actual file upload and user data, not directly from JSON.
    // UpdateFields might be added if media metadata could be updated via API.
};

} // namespace cms::models

#endif // CMS_MEDIA_HPP
```