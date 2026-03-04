#include "RateLimiter.h"

RateLimiter::RateLimiter(int max_requests_per_window, std::chrono::seconds window_duration)
    : max_requests_per_window_(max_requests_per_window), window_duration_(window_duration) {
    Logger::info("RateLimiter initialized: " + std::to_string(max_requests_per_window) + " requests per " + std::to_string(window_duration.count()) + " seconds.");
}

HttpResponse RateLimiter::handle(HttpRequest& request) {
    std::string client_ip = getClientIp(request);
    auto now = std::chrono::steady_clock::now();

    std::lock_guard<std::mutex> lock(mutex_);

    auto& state = client_states_[client_ip]; // Creates if not exists

    // If current window is old, reset it
    if (now - state.window_start > window_duration_) {
        state.count = 0;
        state.window_start = now;
    }

    state.count++;

    if (state.count > max_requests_per_window_) {
        Logger::warn("Rate limit exceeded for IP: " + client_ip);
        HttpResponse res(http::status::too_many_requests, nlohmann::json({{"error", "Too Many Requests"}}).dump());
        // Calculate retry-after header
        auto next_reset_time = state.window_start + window_duration_;
        auto remaining_seconds = std::chrono::duration_cast<std::chrono::seconds>(next_reset_time - now).count();
        res.headers["Retry-After"] = std::to_string(std::max(0LL, remaining_seconds));
        return res;
    }

    return HttpResponse(http::status::continue_status); // Continue
}

std::string RateLimiter::getClientIp(const HttpRequest& request) {
    // In a production setup behind a proxy (like Nginx), the client IP
    // would be in the "X-Forwarded-For" header. If direct, use remote_endpoint.
    auto it = request.headers.find("X-Forwarded-For");
    if (it != request.headers.end()) {
        return it->second; // Return the first IP in the list if multiple
    }
    // Fallback if no X-Forwarded-For (e.g., direct connection or testing)
    // This requires access to the socket's remote endpoint, which isn't
    // directly available in the HttpRequest struct here.
    // For a real implementation, the Session or HttpServer would need to pass this.
    return "unknown_ip"; // Placeholder
}