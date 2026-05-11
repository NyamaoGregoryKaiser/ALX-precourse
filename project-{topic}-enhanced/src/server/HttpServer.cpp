#include "HttpServer.h"
#include "RequestHandler.h"
#include "utils/Logger.h"

#include <utility>

namespace beast = boost::beast; // from <boost/beast.hpp>

// --- HttpSession Implementation ---
HttpSession::HttpSession(tcp::socket socket, RequestHandler& handler)
    : socket_(std::move(socket)), handler_(handler) {}

void HttpSession::start() {
    do_read();
}

void HttpSession::do_read() {
    request_ = {}; // Clear previous request
    // Set a timeout for reading.
    socket_.expires_after(std::chrono::seconds(30));

    http::async_read(socket_, buffer_, request_,
        beast::bind_front_handler(&HttpSession::on_read, shared_from_this()));
}

void HttpSession::on_read(boost::system::error_code ec, std::size_t bytes_transferred) {
    boost::ignore_unused(bytes_transferred);

    if (ec == http::error::end_of_stream) {
        return socket_.shutdown(tcp::socket::shutdown_send, ec);
    }
    if (ec) {
        LOG_ERROR("HTTP Read Error: {}", ec.message());
        return;
    }

    handle_request(std::move(request_));
}

void HttpSession::handle_request(http::request<http::string_body>&& req) {
    LOG_DEBUG("Received request: {} {}", req.method_string(), req.target());
    auto self = shared_from_this(); // Keep shared_ptr alive for async operations

    // Delegate to RequestHandler
    handler_.handleRequest(std::move(req), [self](http::response<http::string_body>&& res) {
        self->do_write(std::move(res));
    });
}

void HttpSession::do_write(http::response<http::string_body>&& res) {
    // Set a timeout for writing.
    socket_.expires_after(std::chrono::seconds(30));

    http::async_write(socket_, res,
        beast::bind_front_handler(&HttpSession::on_write, shared_from_this()));
}

void HttpSession::on_write(boost::system::error_code ec, std::size_t bytes_transferred) {
    boost::ignore_unused(bytes_transferred);

    if (ec) {
        LOG_ERROR("HTTP Write Error: {}", ec.message());
        return;
    }

    // Read another request.
    do_read();
}

// --- HttpServer Implementation ---
HttpServer::HttpServer(net::io_context& ioc, tcp::endpoint endpoint, RequestHandler& handler)
    : ioc_(ioc), acceptor_(ioc), handler_(handler), running_(true) {
    boost::system::error_code ec;

    // Open the acceptor
    acceptor_.open(endpoint.protocol(), ec);
    if (ec) {
        LOG_ERROR("HTTP Server: Failed to open acceptor: {}", ec.message());
        throw std::runtime_error("Failed to open acceptor");
    }

    // Allow address reuse
    acceptor_.set_option(net::socket_base::reuse_address(true), ec);
    if (ec) {
        LOG_ERROR("HTTP Server: Failed to set reuse_address option: {}", ec.message());
        throw std::runtime_error("Failed to set reuse_address option");
    }

    // Bind to the server address
    acceptor_.bind(endpoint, ec);
    if (ec) {
        LOG_ERROR("HTTP Server: Failed to bind to endpoint {}:{}: {}", endpoint.address().to_string(), endpoint.port(), ec.message());
        throw std::runtime_error("Failed to bind to endpoint");
    }

    // Start listening for connections
    acceptor_.listen(net::socket_base::max_listen_connections, ec);
    if (ec) {
        LOG_ERROR("HTTP Server: Failed to listen: {}", ec.message());
        throw std::runtime_error("Failed to listen");
    }
}

void HttpServer::run() {
    do_accept();
    // The io_context::run() is called in main.cpp
}

void HttpServer::stop() {
    running_ = false;
    boost::system::error_code ec;
    acceptor_.close(ec);
    if (ec) {
        LOG_ERROR("Error closing acceptor: {}", ec.message());
    }
    LOG_INFO("HTTP Server stopped accepting new connections.");
}

void HttpServer::do_accept() {
    if (!running_) return;

    acceptor_.async_accept(
        net::make_strand(ioc_),
        beast::bind_front_handler(&HttpServer::on_accept, this)
    );
}

void HttpServer::on_accept(boost::system::error_code ec, tcp::socket socket) {
    if (ec) {
        if (ec != net::error::operation_aborted) { // Ignore if acceptor was explicitly closed
            LOG_ERROR("HTTP Server Accept Error: {}", ec.message());
        }
    } else {
        // Create the session and run it
        std::make_shared<HttpSession>(std::move(socket), handler_)->start();
    }

    // Accept another connection
    do_accept();
}
```