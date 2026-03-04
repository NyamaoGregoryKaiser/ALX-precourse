#include "HttpServer.h"
#include "utils/Logger.h"
#include "nlohmann/json.hpp" // For JSON parsing

#include <iostream>
#include <regex>

// --- Session Implementation ---

Session::Session(net::ip::tcp::socket socket, Router& router)
    : socket_(std::move(socket)), router_(router) {}

void Session::run() {
    do_read();
}

void Session::do_read() {
    // Make the request empty before reading,
    // otherwise the operation behavior is undefined.
    raw_req_ = {};

    // Set a timeout for reading
    beast::get_lowest_layer(socket_).expires_after(std::chrono::seconds(30));

    // Read a request
    http::async_read(socket_, buffer_, raw_req_,
        beast::bind_front_handler(&Session::on_read, shared_from_this()));
}

void Session::on_read(beast::error_code ec, std::size_t bytes_transferred) {
    boost::ignore_unused(bytes_transferred);

    // This means they closed the connection
    if (ec == http::error::end_of_stream)
        return;

    if (ec) {
        Logger::error("HTTP Read Error: " + ec.message());
        return;
    }

    // Process the request
    HttpRequest req;
    req.raw_req = std::move(raw_req_);
    req.body = req.raw_req.body();
    for (const auto& header : req.raw_req.base()) {
        req.headers[header.name_string().to_string()] = header.value().to_string();
    }
    
    // Parse query parameters
    std::string target = req.raw_req.target().to_string();
    size_t query_pos = target.find('?');
    if (query_pos != std::string::npos) {
        std::string query_string = target.substr(query_pos + 1);
        std::regex query_regex("([^&]+)=([^&]*)");
        std::sregex_iterator it(query_string.begin(), query_string.end(), query_regex);
        std::sregex_iterator end;
        for (; it != end; ++it) {
            req.query_params[(*it)[1].str()] = (*it)[2].str();
        }
    }


    HttpResponse res = router_.handleRequest(req);
    send_response(res);
}

void Session::send_response(HttpResponse& response) {
    http::response<http::string_body> res_body;
    res_body.version(11); // HTTP/1.1
    res_body.result(response.status);
    res_body.set(http::field::server, "DataVizTool-C++");
    res_body.body() = response.body;
    for (const auto& header : response.headers) {
        res_body.set(header.first, header.second);
    }
    res_body.prepare_payload();

    // Set a timeout for writing
    beast::get_lowest_layer(socket_).expires_after(std::chrono::seconds(30));

    // Write the response
    http::async_write(socket_, res_body,
        beast::bind_front_handler(
            [](std::shared_ptr<Session> self, beast::error_code ec, std::size_t bytes_transferred) {
                boost::ignore_unused(bytes_transferred);
                if (ec) {
                    Logger::error("HTTP Write Error: " + ec.message());
                    return;
                }
                // Close the connection
                beast::error_code shutdown_ec;
                self->socket_.shutdown(net::ip::tcp::socket::shutdown_send, shutdown_ec);
            },
            shared_from_this()));
}

// --- HttpServer Implementation ---

HttpServer::HttpServer(const std::string& address, unsigned short port, Router& router)
    : ioc_(1),
      acceptor_(ioc_, {net::ip::make_address(address), port}),
      router_(router) {}

void HttpServer::run() {
    do_accept();
    ioc_.run(); // This will block until the server is stopped
}

void HttpServer::do_accept() {
    acceptor_.async_accept(
        net::make_strand(ioc_),
        beast::bind_front_handler(&HttpServer::on_accept, shared_from_this()));
}

void HttpServer::on_accept(beast::error_code ec, net::ip::tcp::socket socket) {
    if (ec) {
        Logger::error("HTTP Accept Error: " + ec.message());
    } else {
        // Create the session and run it
        std::make_shared<Session>(std::move(socket), router_)->run();
    }

    // Accept another connection
    do_accept();
}