#pragma once
#include "base_repository.h"
#include "../models/user.h"
#include <optional>
#include <vector>

class UserRepository : public BaseRepository {
public:
    UserRepository(const std::string& conn_str) : BaseRepository(conn_str) {}

    std::optional<User> create(User& user); // Takes a User object, modifies it with ID
    std::optional<User> find_by_id(long long id);
    std::optional<User> find_by_email(const std::string& email);
    std::vector<User> find_all(int limit = 100, int offset = 0);
    bool update(const User& user);
    bool remove(long long id);
    long long count();
};