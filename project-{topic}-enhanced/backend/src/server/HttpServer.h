#pragma once

#include "Router.h"
#include <boost/asio.hpp>
#include <boost/beast.hpp>
#include <boost/beast/http.hpp>
#include <memory>
#include <string>

namespace net = boost::asio;
namespace http = boost::beast::http;
namespace beast = boost::beast;

// Define HttpRequest and HttpResponse types for convenience
struct HttpRequest {
    http::request<http::string_body> raw_req;
    std::string body;
    std::map<std::string, std::string> params; // Path parameters
    std::map<std::string, std::string> query_params; // Query string parameters
    std::map<std::string, std::string> headers; // Request headers
    std::string user_id; // Populated by AuthMiddleware
};

struct HttpResponse {
    http::status status;
    std::string body;
    std::map<std::string, std::string> headers;

    HttpResponse(http::status s = http::status::ok, std::string b = "")
        : status(s), body(std::move(b)) {
        headers["Content-Type"] = "application/json";
    }
};

class Session : public std::enable_shared_from_this<Session> {
public:
    Session(net::ip::tcp::socket socket, Router& router);
    void run();

private:
    void do_read();
    void on_read(beast::error_code ec, std::size_t bytes_transferred);
    void send_response(HttpResponse& response);

    net::ip::tcp::socket socket_;
    beast::flat_buffer buffer_;
    http::request<http::string_body> raw_req_;
    Router& router_;
};

class HttpServer {
public:
    HttpServer(const std::string& address, unsigned short port, Router& router);
    void run();

private:
    void do_accept();
    void on_accept(beast::error_code ec, net::ip::tcp::socket socket);

    net::io_context ioc_;
    net::ip::tcp::acceptor acceptor_;
    Router& router_;
};