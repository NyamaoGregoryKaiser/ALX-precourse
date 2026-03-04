```cpp
#include "Server.h"
#include "RateLimiting.h" // Include the RateLimiter header
#include <cstring> // For memset
#include <vector>
#include <algorithm> // For std::transform
#include <cctype>    // For std::tolower
#include <sstream>

namespace VisGenius {

Server::Server(int port, std::shared_ptr<Router> router, std::shared_ptr<RateLimiter> rate_limiter)
    : m_port(port), m_serverSocket(-1), m_router(router), m_rateLimiter(rate_limiter), m_running(false) {
    LOG_INFO("Server initialized on port {}", m_port);
}

Server::~Server() {
    stop();
    if (m_serverSocket != -1) {
        close(m_serverSocket);
        LOG_INFO("Server socket closed.");
    }
}

void Server::start() {
    if (m_running) {
        LOG_WARN("Server is already running.");
        return;
    }

    m_serverSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (m_serverSocket < 0) {
        LOG_FATAL("Failed to create server socket: {}", strerror(errno));
        throw std::runtime_error("Failed to create server socket.");
    }

    // Set SO_REUSEADDR option to allow reuse of local addresses
    int opt = 1;
    if (setsockopt(m_serverSocket, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
        LOG_WARN("Failed to set SO_REUSEADDR: {}", strerror(errno));
    }

    sockaddr_in server_addr;
    memset(&server_addr, 0, sizeof(server_addr));
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY; // Listen on all interfaces
    server_addr.sin_port = htons(m_port);

    if (bind(m_serverSocket, (sockaddr*)&server_addr, sizeof(server_addr)) < 0) {
        LOG_FATAL("Failed to bind server socket to port {}: {}", m_port, strerror(errno));
        close(m_serverSocket);
        throw std::runtime_error("Failed to bind server socket.");
    }

    if (listen(m_serverSocket, 10) < 0) { // Max 10 pending connections
        LOG_FATAL("Failed to listen on server socket: {}", strerror(errno));
        close(m_serverSocket);
        throw std::runtime_error("Failed to listen on server socket.");
    }

    m_running = true;
    m_listenerThread = std::thread(&Server::listenerLoop, this);
    LOG_INFO("Server started, listening on port {}", m_port);
}

void Server::stop() {
    if (!m_running) {
        LOG_WARN("Server is not running.");
        return;
    }
    m_running = false;
    // Attempt to unblock the listener thread by shutting down the socket
    // This isn't strictly necessary if join() waits, but can help
    shutdown(m_serverSocket, SHUT_RDWR);
    if (m_listenerThread.joinable()) {
        m_listenerThread.join();
    }
    LOG_INFO("Server stopped.");
}

void Server::listenerLoop() {
    LOG_DEBUG("Listener thread started.");
    while (m_running) {
        sockaddr_in client_addr;
        socklen_t client_len = sizeof(client_addr);
        int client_socket = accept(m_serverSocket, (sockaddr*)&client_addr, &client_len);

        if (client_socket < 0) {
            if (errno == EINVAL || errno == EBADF) { // Socket was closed, server stopping
                LOG_INFO("Server socket closed, listener stopping.");
                break;
            }
            LOG_ERROR("Error accepting client connection: {}", strerror(errno));
            continue;
        }

        // Each client connection handled in a new thread for simplicity.
        // For high performance, use a thread pool or asynchronous I/O (e.g., Boost.Asio).
        std::thread(&Server::handleClient, this, client_socket).detach();
        LOG_DEBUG("Accepted new client connection. Client socket: {}", client_socket);
    }
    LOG_DEBUG("Listener thread stopped.");
}

void Server::handleClient(int client_socket) {
    LOG_DEBUG("Handling client on socket {}", client_socket);
    std::vector<char> buffer(4096);
    std::string raw_request_str;

    // Read the request data
    ssize_t bytes_read;
    do {
        bytes_read = recv(client_socket, buffer.data(), buffer.size(), 0);
        if (bytes_read > 0) {
            raw_request_str.append(buffer.data(), bytes_read);
            // Simple check to detect end of HTTP headers for basic cases
            if (raw_request_str.find("\r\n\r\n") != std::string::npos) {
                // If Content-Length is present, need to read that many bytes for the body
                // For simplicity, we're assuming small bodies or a single read is enough for headers+small body.
                // A real server needs robust HTTP parsing to handle fragmented reads and content-length.
                break; 
            }
        } else if (bytes_read == 0) {
            LOG_DEBUG("Client disconnected from socket {}.", client_socket);
            break;
        } else {
            LOG_ERROR("Error reading from client socket {}: {}", client_socket, strerror(errno));
            break;
        }
    } while (bytes_read > 0);


    HttpResponse response;
    if (raw_request_str.empty()) {
        LOG_WARN("Received empty request from client {}.", client_socket);
        response.status_code = 400;
        response.status_message = "Bad Request";
        response.set_content_type("text/plain").set_body("Empty request.");
    } else {
        HttpRequest request = parse_http_request(raw_request_str);
        LOG_DEBUG("Parsed HTTP request (socket {}): Method={}, Path='{}', BodyLen={}", client_socket, request.method, request.path, request.body.length());

        // Rate Limiting Middleware (can be moved to Router or dedicated middleware layer)
        std::string client_ip = "127.0.0.1"; // Placeholder, derive from client_addr for real IP
        if (m_rateLimiter->isRateLimited(client_ip)) {
            response = handleRateLimit(request);
        } else {
            // Error handling middleware (try-catch block)
            try {
                response = m_router->handleRequest(request);
            } catch (const VisGeniusException& e) {
                LOG_ERROR("VisGeniusException caught in handleClient for {}{}: {} (Code: {})", request.method, request.path, e.what(), e.getErrorCodeString());
                response.status_code = 500; // Default to 500 for uncaught VisGeniusExceptions
                response.status_message = get_status_message(500);
                response.set_content_type("application/json")
                        .set_body("{\"code\":\"" + e.getErrorCodeString() + "\",\"message\":\"Internal server error: " + e.what() + "\"}");
            } catch (const std::exception& e) {
                LOG_ERROR("Unhandled std::exception caught in handleClient for {}{}: {}", request.method, request.path, e.what());
                response.status_code = 500;
                response.status_message = get_status_message(500);
                response.set_content_type("application/json")
                        .set_body("{\"code\":\"SERVER_ERROR\",\"message\":\"An unexpected server error occurred: " + std::string(e.what()) + "\"}");
            } catch (...) {
                LOG_FATAL("Unknown exception caught in handleClient for {}{}", request.method, request.path);
                response.status_code = 500;
                response.status_message = get_status_message(500);
                response.set_content_type("application/json")
                        .set_body("{\"code\":\"SERVER_ERROR\",\"message\":\"An unknown server error occurred.\"}");
            }
        }
    }

    std::string raw_response = response.to_string();
    if (send(client_socket, raw_response.c_str(), raw_response.length(), 0) < 0) {
        LOG_ERROR("Error sending response to client socket {}: {}", client_socket, strerror(errno));
    }
    
    close(client_socket);
    LOG_DEBUG("Client socket {} closed.", client_socket);
}

HttpResponse Server::handleRateLimit(const HttpRequest& request) {
    HttpResponse response;
    response.status_code = 429;
    response.status_message = "Too Many Requests";
    response.set_content_type("application/json")
            .set_body("{\"code\":\"TOO_MANY_REQUESTS\",\"message\":\"Rate limit exceeded. Please try again later.\"}");
    response.set_header("Retry-After", "60"); // Retry after 60 seconds
    LOG_WARN("Rate limit exceeded for client.");
    return response;
}

} // namespace VisGenius
```