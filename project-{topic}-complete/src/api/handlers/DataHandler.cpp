```cpp
#include "DataHandler.h"
#include "util/ErrorHandler.h"
#include "core/common/Constants.h"

#include <nlohmann/json.hpp>

namespace VisuFlow {
namespace API {

DataHandler::DataHandler()
    : m_dataSourceManager(),
      m_dataProcessor() {}

void DataHandler::getProcessedData(const Http::Rest::Request& req, Http::Rest::Response& res) {
    try {
        // Conceptual: parse query parameters from 'req'
        // For example: /api/v1/data?sourceId=1&startDate=...&endDate=...&groupBy=...
        // In a real Pistache app, this would use `req.query().get("paramName")`.
        std::map<std::string, std::string> queryParams;
        queryParams["sourceId"] = "1"; // Mocking a source ID
        queryParams["startDate"] = "2023-01-01";
        queryParams["endDate"] = "2023-12-31";
        queryParams["groupBy"] = "month";
        queryParams["metric"] = "sales";
        queryParams["filters"] = ""; // Empty for now

        long long dataSourceId = std::stoll(queryParams["sourceId"]);

        // 1. Fetch raw data
        VisuFlow::Data::Model::DataTable rawData = m_dataSourceManager.fetchData(
            dataSourceId, queryParams["startDate"], queryParams["endDate"]
        );
        Util::Logger::log(spdlog::level::debug, "Fetched {} rows from data source ID {}.", rawData.rows.size(), dataSourceId);

        // 2. Process data
        VisuFlow::Data::Processor::ProcessingConfig config;
        config.groupByColumn = queryParams["groupBy"];
        config.metricColumn = queryParams["metric"];
        // Add more config based on queryParams

        VisuFlow::Data::Model::DataTable processedData = m_dataProcessor.processData(rawData, config);
        Util::Logger::log(spdlog::level::debug, "Processed data to {} rows.", processedData.rows.size());

        // 3. Format response
        ProcessedDataResponse dataRes;
        for (const auto& column : processedData.columns) {
            dataRes.columns.push_back({column.name, VisuFlow::Core::Common::Utils::dataTypeToString(column.type)});
        }
        dataRes.data = processedData.rows;

        sendDataResponse(dataRes, res);

    } catch (const VisuFlow::Util::APIException& e) {
        Util::ErrorHandler::handleAPIException(e, res);
    } catch (const std::exception& e) {
        Util::ErrorHandler::handleGenericError(e, res);
    }
}

void DataHandler::createDataSource(const Http::Rest::Request& req, Http::Rest::Response& res) {
    try {
        DataSourceCreateRequest createReq = parseDataSourceCreateRequest(req);

        // 1. Create data source in the system
        VisuFlow::Data::Model::DataSource newDs = m_dataSourceManager.createDataSource(
            createReq.name, createReq.type, createReq.connectionString, createReq.query
        );
        Util::Logger::log(spdlog::level::info, "Created new data source: {} (ID: {})", newDs.name, newDs.id);

        // 2. Format response
        DataSourceInfoResponse dsRes;
        dsRes.id = newDs.id;
        dsRes.name = newDs.name;
        dsRes.type = newDs.type;
        dsRes.connectionString = newDs.connectionString;
        dsRes.query = newDs.query;

        sendDataSourceResponse(dsRes, res, 201); // 201 Created

    } catch (const VisuFlow::Util::APIException& e) {
        Util::ErrorHandler::handleAPIException(e, res);
    } catch (const nlohmann::json::exception& e) {
        Util::ErrorHandler::handleAPIException(VisuFlow::Util::APIException("Invalid JSON payload", 400), res);
    } catch (const std::exception& e) {
        Util::ErrorHandler::handleGenericError(e, res);
    }
}


DataSourceCreateRequest DataHandler::parseDataSourceCreateRequest(const Http::Rest::Request& req) {
    nlohmann::json jsonBody = nlohmann::json::parse(req); // Assume req is JSON string
    DataSourceCreateRequest createReq;
    createReq.name = jsonBody.at("name").get<std::string>();
    createReq.type = jsonBody.at("type").get<std::string>();
    createReq.connectionString = jsonBody.at("connectionString").get<std::string>();
    if (jsonBody.count("query")) {
        createReq.query = jsonBody.at("query").get<std::string>();
    }
    return createReq;
}

void DataHandler::sendDataResponse(const ProcessedDataResponse& dataRes, Http::Rest::Response& res, int statusCode) {
    nlohmann::json responseJson;
    nlohmann::json columnsArray = nlohmann::json::array();
    for (const auto& col : dataRes.columns) {
        columnsArray.push_back({{"name", col.name}, {"type", col.type}});
    }
    responseJson["columns"] = columnsArray;
    responseJson["data"] = dataRes.data;

    res = responseJson.dump(); // For mock, just assign JSON string
    // In real Pistache: res.headers().add<Http::Header::ContentType>(MIME(Application, Json));
    // res.send(Http::Code::Ok, responseJson.dump());
    Util::Logger::log(spdlog::level::debug, "DataHandler sending processed data response. Status: {}", statusCode);
}

void DataHandler::sendDataSourceResponse(const DataSourceInfoResponse& dsRes, Http::Rest::Response& res, int statusCode) {
    nlohmann::json responseJson;
    responseJson["id"] = dsRes.id;
    responseJson["name"] = dsRes.name;
    responseJson["type"] = dsRes.type;
    responseJson["connectionString"] = dsRes.connectionString;
    responseJson["query"] = dsRes.query;

    res = responseJson.dump();
    Util::Logger::log(spdlog::level::debug, "DataHandler sending data source response. Status: {}", statusCode);
}

} // namespace API
} // namespace VisuFlow
```