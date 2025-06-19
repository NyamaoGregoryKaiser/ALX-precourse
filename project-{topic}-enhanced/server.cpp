```cpp
#include <iostream>
#include <string>
#include <map>
#include <thread>
#include <mutex>
#include <websocketpp/config/asio_no_tls.hpp>
#include <websocketpp/server.hpp>

using websocketpp::lib::placeholders::_1;
using websocketpp::lib::placeholders::_2;

typedef websocketpp::server<websocketpp::config::asio_no_tls> server;

// Placeholder for database interaction (replace with a real database)
std::map<std::string, std::string> messages;
std::mutex messages_mutex;


int main() {
    server s;
    s.init_asio();
    s.set_open_handler([&s](websocketpp::connection_hdl hdl) {
        std::cout << "Client connected!" << std::endl;
    });

    s.set_close_handler([&s](websocketpp::connection_hdl hdl) {
        std::cout << "Client disconnected!" << std::endl;
    });

    s.set_message_handler([&s, &messages, &messages_mutex](websocketpp::connection_hdl hdl, server::message_ptr msg) {
        std::string message = msg->get_payload();
        // Basic message handling (replace with your logic)
        std::lock_guard<std::mutex> lock(messages_mutex);
        messages["message"] = message; //very basic, only stores the last message

        //Send message to all connected clients (replace with improved logic)
        s.send(hdl, message, websocketpp::frame::opcode::text);

    });

    s.listen(9001);
    s.start_accept();
    s.run();
    return 0;
}
```