```cpp
#ifndef DATAVIZ_VISUALIZATIONREPOSITORY_H
#define DATAVIZ_VISUALIZATIONREPOSITORY_H

#include <string>
#include <vector>
#include <optional>
#include <memory>
#include "Database.h"
#include "../data/models/Visualization.h"
#include "../utils/Logger.h"

class VisualizationRepository {
private:
    std::shared_ptr<Database> db_;

public:
    explicit VisualizationRepository(std::shared_ptr<Database> db);

    // Creates a new visualization in the database
    std::optional<Visualization> create(Visualization& visualization);

    // Finds a visualization by ID
    std::optional<Visualization> findById(int id);

    // Finds all visualizations owned by a specific user
    std::vector<Visualization> findByUserId(int user_id);

    // Finds all visualizations for a specific dataset
    std::vector<Visualization> findByDatasetId(int dataset_id);

    // Finds all visualizations (admin only)
    std::vector<Visualization> findAll();

    // Updates an existing visualization
    bool update(const Visualization& visualization);

    // Deletes a visualization by ID
    bool remove(int id);

private:
    // Helper to extract a Visualization from a pqxx::row
    Visualization visualizationFromRow(const pqxx::row& row);
};

#endif // DATAVIZ_VISUALIZATIONREPOSITORY_H
```