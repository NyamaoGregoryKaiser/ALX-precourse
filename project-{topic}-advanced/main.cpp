#include <iostream>
#include "chat_server.h"
#include "database.h"

int main() {
  // Database setup (connection, schema creation etc.)
  Database db("your_database_connection_string");
  if (!db.connect()) {
    std::cerr << "Failed to connect to the database." << std::endl;
    return 1;
  }

  // Initialize and start the chat server
  ChatServer server(db);
  if (!server.start()) {
    std::cerr << "Failed to start the chat server." << std::endl;
    return 1;
  }

  std::cout << "Chat server started successfully." << std::endl;
  // Keep the main thread running (you'll likely need a more robust solution)
  while (true) {
    // Add server monitoring/management tasks here.
  }
  return 0;
}