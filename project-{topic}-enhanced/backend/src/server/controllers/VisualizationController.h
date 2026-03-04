#pragma once

#include "server/HttpServer.h"
#include "database/DBManager.h"
#include "database/models/Visualization.h"
#include "database/models/DataSource.h"
#include "core/DataProcessor.h"
#include "utils/Logger.h"
#include "nlohmann/json.hpp"

class VisualizationController {
public:
    VisualizationController(DBManager& db_manager);

    HttpResponse createVisualization(const HttpRequest& req);
    HttpResponse getVisualizations(const HttpRequest& req);
    HttpResponse getVisualizationById(const HttpRequest& req);
    HttpResponse updateVisualization(const HttpRequest& req);
    HttpResponse deleteVisualization(const HttpRequest& req);
    HttpResponse getVisualizationData(const HttpRequest& req); // Get processed data for a visualization

private:
    DBManager& db_manager_;
    DataProcessor data_processor_;
};