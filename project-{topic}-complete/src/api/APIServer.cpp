```cpp
#include "APIServer.hpp"
#include <stdexcept>

namespace MLToolkit {
namespace API {

APIServer::APIServer() {
    // Configure Crow options here if needed, e.g., logger, cors
    // Crow's internal logger can be disabled if spdlog is used exclusively
    app_.loglevel(crow::LogLevel::DEBUG); // Crow's internal log level
    
    // Set up global error handler
    Middleware::setup_error_handler(app_);

    setup_routes();
    LOG_INFO("API Server initialized and routes set up.");
}

void APIServer::setup_routes() {
    // Basic root endpoint
    CROW_ROUTE(app_, "/")([](){
        return "ML-Toolkit API Server is running!";
    });

    // Authentication
    CROW_ROUTE(app_, "/api/v1/auth/login").methods("POST"_method)
        ([](const crow::request& req){
            return Handlers::AuthHandler::login(req);
        });

    // Dataset Endpoints (CRUD)
    CROW_ROUTE(app_, "/api/v1/datasets")
        .methods("POST"_method)
        ([](const crow::request& req){
            return Handlers::DatasetHandler::create_dataset(req);
        });
    CROW_ROUTE(app_, "/api/v1/datasets")
        .methods("GET"_method)
        ([](const crow::request& req){
            return Handlers::DatasetHandler::get_all_datasets(req);
        });
    CROW_ROUTE(app_, "/api/v1/datasets/<long>")
        .methods("GET"_method)
        ([](long id){
            return Handlers::DatasetHandler::get_dataset_by_id(id);
        });
    CROW_ROUTE(app_, "/api/v1/datasets/<long>")
        .methods("PUT"_method)
        ([](long id, const crow::request& req){
            return Handlers::DatasetHandler::update_dataset(id, req);
        });
    CROW_ROUTE(app_, "/api/v1/datasets/<long>")
        .methods("DELETE"_method)
        ([](long id){
            return Handlers::DatasetHandler::delete_dataset(id);
        });

    // Model Endpoints (CRUD)
    CROW_ROUTE(app_, "/api/v1/models")
        .methods("POST"_method)
        ([](const crow::request& req){
            return Handlers::ModelHandler::create_model(req);
        });
    CROW_ROUTE(app_, "/api/v1/models")
        .methods("GET"_method)
        ([](const crow::request& req){
            return Handlers::ModelHandler::get_all_models(req);
        });
    CROW_ROUTE(app_, "/api/v1/models/<long>")
        .methods("GET"_method)
        ([](long id){
            return Handlers::ModelHandler::get_model_by_id(id);
        });
    CROW_ROUTE(app_, "/api/v1/models/<long>")
        .methods("PUT"_method)
        ([](long id, const crow::request& req){
            return Handlers::ModelHandler::update_model(id, req);
        });
    CROW_ROUTE(app_, "/api/v1/models/<long>")
        .methods("DELETE"_method)
        ([](long id){
            return Handlers::ModelHandler::delete_model(id);
        });

    // Pipeline Endpoints (CRUD + Execute + Evaluate)
    CROW_ROUTE(app_, "/api/v1/pipelines")
        .methods("POST"_method)
        ([](const crow::request& req){
            return Handlers::PipelineHandler::create_pipeline(req);
        });
    CROW_ROUTE(app_, "/api/v1/pipelines")
        .methods("GET"_method)
        ([](const crow::request& req){
            return Handlers::PipelineHandler::get_all_pipelines(req);
        });
    CROW_ROUTE(app_, "/api/v1/pipelines/<long>")
        .methods("GET"_method)
        ([](long id){
            return Handlers::PipelineHandler::get_pipeline_by_id(id);
        });
    CROW_ROUTE(app_, "/api/v1/pipelines/<long>")
        .methods("PUT"_method)
        ([](long id, const crow::request& req){
            return Handlers::PipelineHandler::update_pipeline(id, req);
        });
    CROW_ROUTE(app_, "/api/v1/pipelines/<long>")
        .methods("DELETE"_method)
        ([](long id){
            return Handlers::PipelineHandler::delete_pipeline(id);
        });
    CROW_ROUTE(app_, "/api/v1/pipelines/<long>/execute")
        .methods("POST"_method)
        ([](long id, const crow::request& req){
            return Handlers::PipelineHandler::execute_pipeline(id, req);
        });
    CROW_ROUTE(app_, "/api/v1/models/<long>/evaluate") // Evaluate model, potentially using a pipeline
        .methods("POST"_method)
        ([](long model_id, const crow::request& req){
            return Handlers::PipelineHandler::evaluate_model(model_id, req);
        });
}

void APIServer::run(int port) {
    LOG_INFO("Starting API server on port: {}", port);
    app_.port(port).multithreaded().run();
    LOG_INFO("API Server stopped.");
}

void APIServer::stop() {
    app_.stop();
    LOG_INFO("API Server received stop signal.");
}

} // namespace API
} // namespace MLToolkit
```