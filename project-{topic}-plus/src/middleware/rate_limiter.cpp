#include "rate_limiter.h"

RateLimiter::RateLimiter(int window_seconds, int max_requests)
    : window_seconds_(window_seconds), max_requests_(max_requests) {
    LOG_INFO("RateLimiter initialized: " + std::to_string(max_requests_) + " requests per " + std::to_string(window_seconds_) + " seconds.");
}

std::string RateLimiter::get_client_ip(const Pistache::Rest::Request& request) const {
    // Attempt to get IP from X-Forwarded-For header (common in reverse proxy setups)
    auto x_forwarded_for = request.headers().tryGet<Pistache::Http::Header::X_Forwarded_For>();
    if (x_forwarded_for) {
        return x_forwarded_for->addr();
    }
    // Fallback to connection's peer address
    return request.address().host();
}

void RateLimiter::limit(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response, std::function<void(const Pistache::Rest::Request&, Pistache::Http::ResponseWriter)> next) {
    std::string client_ip = get_client_ip(request);
    long current_timestamp = std::chrono::duration_cast<std::chrono::seconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();

    std::lock_guard<std::mutex> lock(mutex_);

    auto& client_data = clients_[client_ip]; // Creates new entry if IP not seen

    if (client_data.current_window_start == 0 || (current_timestamp - client_data.current_window_start) >= window_seconds_) {
        // Start a new window
        client_data.current_window_start = current_timestamp;
        client_data.request_count = 1;
        LOG_DEBUG("Rate limiter: New window for IP " + client_ip);
    } else {
        // Increment count within current window
        client_data.request_count++;
        LOG_DEBUG("Rate limiter: IP " + client_ip + " count: " + std::to_string(client_data.request_count));
    }

    if (client_data.request_count > max_requests_) {
        LOG_WARN("Rate limit exceeded for IP: " + client_ip);
        response.headers().add<Pistache::Http::Header::Retry_After>(std::to_string(window_seconds_ - (current_timestamp - client_data.current_window_start)));
        throw ForbiddenException("Too many requests. Please try again later.");
    }

    // Set X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers
    response.headers().add<Pistache::Http::Header::Custom>("X-RateLimit-Limit", std::to_string(max_requests_));
    response.headers().add<Pistache::Http::Header::Custom>("X-RateLimit-Remaining", std::to_string(max_requests_ - client_data.request_count));
    response.headers().add<Pistache::Http::Header::Custom>("X-RateLimit-Reset", std::to_string(client_data.current_window_start + window_seconds_));

    next(request, std::move(response));
}
```