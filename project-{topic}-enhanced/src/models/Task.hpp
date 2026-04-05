```cpp
#ifndef TASK_HPP
#define TASK_HPP

#include "../database/Database.hpp"
#include <nlohmann/json.hpp>
#include <string>
#include <optional>
#include <vector>

// Task class represents a task in the system.
class Task {
public:
    // Constructor for creating a new Task object.
    Task(int id, int userId, const std::string& title, const std::string& description = "",
         const std::string& status = "pending", const std::string& createdAt = "", const std::string& updatedAt = "");

    // Getters
    int getId() const;
    int getUserId() const;
    const std::string& getTitle() const;
    const std::string& getDescription() const;
    const std::string& getStatus() const;
    const std::string& getCreatedAt() const;
    const std::string& getUpdatedAt() const;

    // Setters (automatically updates `updatedAt` timestamp)
    void setTitle(const std::string& newTitle);
    void setDescription(const std::string& newDescription);
    void setStatus(const std::string& newStatus); // Validates status value

    // Converts the Task object to a JSON object.
    nlohmann::json toJson() const;

    // --- Static Database Operations ---

    // Creates a new task in the database. Returns the ID of the new task.
    static int create(Database& db, const Task& task);

    // Finds a task by its ID. Returns std::nullopt if not found.
    static std::optional<Task> findById(Database& db, int id);

    // Finds all tasks belonging to a specific user.
    static std::vector<Task> findByUserId(Database& db, int userId);

    // Retrieves all tasks from the database.
    static std::vector<Task> findAll(Database& db);

    // Updates an existing task in the database.
    static bool update(Database& db, const Task& task);

    // Deletes a task by its ID.
    static bool remove(Database& db, int id);

private:
    int id;
    int userId;
    std::string title;
    std::string description;
    std::string status; // "pending", "in_progress", "completed"
    std::string createdAt;
    std::string updatedAt;

    // Helper to update the 'updatedAt' timestamp.
    void updateTimestamp();
};

#endif // TASK_HPP
```