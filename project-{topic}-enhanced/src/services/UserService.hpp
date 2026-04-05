```cpp
#ifndef USER_SERVICE_HPP
#define USER_SERVICE_HPP

#include "../database/Database.hpp"
#include "../models/User.hpp"

#include <string>
#include <vector>
#include <optional>

// UserService handles business logic related to users.
class UserService {
public:
    UserService(Database& db);

    // Creates a new user.
    // @param user The User object to create. ID will be updated upon successful creation.
    // @return The ID of the newly created user.
    // Throws std::runtime_error on validation or database errors.
    int createUser(User& user);

    // Retrieves a user by their ID.
    // @param userId The ID of the user to retrieve.
    // @return An optional containing the User if found, std::nullopt otherwise.
    // Throws std::runtime_error on database errors.
    std::optional<User> findById(int userId);

    // Retrieves a user by their username.
    // @param username The username of the user to retrieve.
    // @return An optional containing the User if found, std::nullopt otherwise.
    // Throws std::runtime_error on database errors.
    std::optional<User> findByUsername(const std::string& username);

    // Retrieves a user by their email.
    // @param email The email of the user to retrieve.
    // @return An optional containing the User if found, std::nullopt otherwise.
    // Throws std::runtime_error on database errors.
    std::optional<User> findByEmail(const std::string& email);

    // Retrieves all users from the database.
    // @return A vector of User objects.
    // Throws std::runtime_error on database errors.
    std::vector<User> getAllUsers();

    // Updates an existing user.
    // @param userId The ID of the user to update.
    // @param updatedUser The User object with updated fields.
    // @return True if the update was successful, false if the user was not found.
    // Throws std::runtime_error on validation or database errors.
    bool updateUser(int userId, User& updatedUser);

    // Deletes a user by their ID.
    // @param userId The ID of the user to delete.
    // @return True if the deletion was successful, false if the user was not found.
    // Throws std::runtime_error on database errors.
    bool deleteUser(int userId);

private:
    Database& db;
};

#endif // USER_SERVICE_HPP
```