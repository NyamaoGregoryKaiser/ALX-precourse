#ifndef CHAT_SERVER_H
#define CHAT_SERVER_H

#include <iostream>
#include "database.h" // Include your database interaction class

class ChatServer {
public:
  ChatServer(Database& db) : db_(db) {}
  bool start(); // Starts the server and handles connections

private:
  Database& db_; // Reference to the database object.
  // Add your networking and message handling functions here
};

#endif