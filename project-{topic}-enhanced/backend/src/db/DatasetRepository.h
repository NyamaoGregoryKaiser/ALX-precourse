```cpp
#ifndef DATAVIZ_DATASETREPOSITORY_H
#define DATAVIZ_DATASETREPOSITORY_H

#include <string>
#include <vector>
#include <optional>
#include <memory>
#include "Database.h"
#include "../data/models/Dataset.h"
#include "../utils/Logger.h"

class DatasetRepository {
private:
    std::shared_ptr<Database> db_;

public:
    explicit DatasetRepository(std::shared_ptr<Database> db);

    // Creates a new dataset in the database
    std::optional<Dataset> create(Dataset& dataset);

    // Finds a dataset by ID
    std::optional<Dataset> findById(int id);

    // Finds all datasets owned by a specific user
    std::vector<Dataset> findByUserId(int user_id);

    // Finds all datasets (admin only)
    std::vector<Dataset> findAll();

    // Updates an existing dataset
    bool update(const Dataset& dataset);

    // Deletes a dataset by ID
    bool remove(int id);

private:
    // Helper to extract a Dataset from a pqxx::row
    Dataset datasetFromRow(const pqxx::row& row);
    // Helper to store/retrieve columns metadata as JSONB
    nlohmann::json columnsToJson(const std::vector<ColumnMetadata>& columns);
    std::vector<ColumnMetadata> jsonToColumns(const nlohmann::json& j);
};

#endif // DATAVIZ_DATASETREPOSITORY_H
```