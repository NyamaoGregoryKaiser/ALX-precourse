```cpp
#ifndef MLTOOLKIT_DBMANAGER_HPP
#define MLTOOLKIT_DBMANAGER_HPP

#include <string>
#include <memory>
#include <vector>
#include <pqxx/pqxx>

#include "models/Dataset.hpp"
#include "models/Model.hpp"
#include "models/Pipeline.hpp"
#include "../common/Exceptions.hpp"
#include "../common/Logger.hpp"

namespace MLToolkit {
namespace Database {

class DBManager {
public:
    static DBManager& get_instance();

    void connect(const std::string& conn_str);
    void disconnect();
    void run_migration(const std::string& migration_sql);
    void seed_data(const std::string& seed_sql);

    // --- Dataset CRUD ---
    long create_dataset(const Models::Dataset& dataset);
    std::optional<Models::Dataset> get_dataset(long id);
    std::vector<Models::Dataset> get_all_datasets();
    bool update_dataset(const Models::Dataset& dataset);
    bool delete_dataset(long id);

    // --- Model CRUD ---
    long create_model(const Models::Model& model);
    std::optional<Models::Model> get_model(long id);
    std::vector<Models::Model> get_all_models();
    bool update_model(const Models::Model& model);
    bool delete_model(long id);

    // --- Pipeline CRUD ---
    long create_pipeline(const Models::Pipeline& pipeline);
    std::optional<Models::Pipeline> get_pipeline(long id);
    std::vector<Models::Pipeline> get_all_pipelines();
    bool update_pipeline(const Models::Pipeline& pipeline);
    bool delete_pipeline(long id);

private:
    DBManager() = default;
    DBManager(const DBManager&) = delete;
    DBManager& operator=(const DBManager&) = delete;

    std::unique_ptr<pqxx::connection> conn_;
    std::string connection_string_;

    void ensure_connection();
};

} // namespace Database
} // namespace MLToolkit

#endif // MLTOOLKIT_DBMANAGER_HPP
```