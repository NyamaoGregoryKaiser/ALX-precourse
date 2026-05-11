#pragma once

#include <boost/asio/ip/tcp.hpp>
#include <boost/beast/core.hpp>
#include <boost/beast/http.hpp>
#include <boost/beast/version.hpp>
#include <memory>
#include <string>

// Forward declaration
class RequestHandler;

namespace net = boost::asio;
namespace http = boost::beast::http;
using tcp = boost::asio::ip::tcp;

// Represents a single HTTP connection
class HttpSession : public std::enable_shared_from_this<HttpSession> {
public:
    HttpSession(tcp::socket socket, RequestHandler& handler);

    void start();

private:
    void do_read();
    void on_read(boost::system::error_code ec, std::size_t bytes_transferred);
    void do_write(http::response<http::string_body>&& res);
    void on_write(boost::system::error_code ec, std::size_t bytes_transferred);
    void handle_request(http::request<http::string_body>&& req);

    tcp::socket socket_;
    boost::beast::flat_buffer buffer_;
    http::request<http::string_body> request_;
    RequestHandler& handler_;
};

// The main HTTP Server
class HttpServer {
public:
    HttpServer(net::io_context& ioc, tcp::endpoint endpoint, RequestHandler& handler);

    void run();
    void stop();

private:
    void do_accept();
    void on_accept(boost::system::error_code ec, tcp::socket socket);

    net::io_context& ioc_;
    tcp::acceptor acceptor_;
    RequestHandler& handler_;
    bool running_;
};
```