#pragma once

#include "server/HttpServer.h"
#include "database/DBManager.h"
#include "database/models/DataSource.h"
#include "core/DataProcessor.h"
#include "core/CsvParser.h" // Assuming CSV is a common data source
#include "utils/Logger.h"
#include "nlohmann/json.hpp"

class DataController {
public:
    DataController(DBManager& db_manager);

    HttpResponse createDataSource(const HttpRequest& req);
    HttpResponse getDataSources(const HttpRequest& req);
    HttpResponse getDataSourceById(const HttpRequest& req);
    HttpResponse updateDataSource(const HttpRequest& req);
    HttpResponse deleteDataSource(const HttpRequest& req);
    HttpResponse processDataSource(const HttpRequest& req); // Example for processing, e.g., CSV upload

private:
    DBManager& db_manager_;
    DataProcessor data_processor_; // To process data
};