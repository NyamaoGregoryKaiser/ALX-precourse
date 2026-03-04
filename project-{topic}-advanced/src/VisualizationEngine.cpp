```cpp
#include "VisualizationEngine.h"
#include <algorithm> // For std::find

namespace VisGenius {

VisualizationEngine::VisualizationEngine(std::shared_ptr<DataProcessor> data_processor)
    : m_dataProcessor(data_processor) {
    // Constructor
}

std::unique_ptr<ChartData> VisualizationEngine::generateChartData(const Visualization& viz, const DataTable& raw_data) {
    LOG_INFO("Generating chart data for visualization ID: {}, Type: {}", viz.id, viz.type);

    // Apply filtering if specified in visualization config
    DataTable processed_data = raw_data;
    auto filter_it = viz.config.find("filter");
    if (filter_it != viz.config.end() && filter_it->second != "{}") {
        // Assuming "filter" value is a JSON string representing a map
        // For simplicity, converting it back to map here.
        // In real app, nlohmann::json would handle this.
        std::map<std::string, std::string> filters;
        // Basic parser for {"key":"value", "key2":"value2"}
        std::string filter_str = filter_it->second;
        if (filter_str.length() > 2 && filter_str.front() == '{' && filter_str.back() == '}') {
            std::string inner = filter_str.substr(1, filter_str.length() - 2);
            std::istringstream iss(inner);
            std::string segment;
            while(std::getline(iss, segment, ',')) {
                size_t colon_pos = segment.find(':');
                if (colon_pos != std::string::npos) {
                    std::string key = segment.substr(0, colon_pos);
                    std::string value = segment.substr(colon_pos + 1);
                    // Remove quotes and trim spaces if present
                    if (key.length() > 1 && key.front() == '"' && key.back() == '"') key = key.substr(1, key.length() - 2);
                    if (value.length() > 1 && value.front() == '"' && value.back() == '"') value = value.substr(1, value.length() - 2);
                    key.erase(std::remove_if(key.begin(), key.end(), ::isspace), key.end());
                    value.erase(std::remove_if(value.begin(), value.end(), ::isspace), value.end());
                    filters[key] = value;
                }
            }
        }
        if (!filters.empty()) {
            processed_data = m_dataProcessor->filterData(raw_data, filters);
        }
    }

    // Apply aggregation if specified
    auto agg_op_it = viz.config.find("aggregation_operation");
    if (agg_op_it != viz.config.end() && !agg_op_it->second.empty()) {
        std::map<std::string, std::string> agg_config;
        agg_config["operation"] = agg_op_it->second;
        
        auto agg_col_it = viz.config.find("aggregation_column");
        if (agg_col_it != viz.config.end() && !agg_col_it->second.empty()) {
            agg_config["aggregate_column"] = agg_col_it->second;
        } else {
            throw InvalidInputException("Aggregation column is required for aggregation.");
        }

        auto group_by_it = viz.config.find("group_by");
        if (group_by_it != viz.config.end() && !group_by_it->second.empty()) {
            agg_config["group_by"] = group_by_it->second;
        }
        processed_data = m_dataProcessor->aggregateData(processed_data, agg_config);
    }

    // Delegate to specific chart type generator
    if (viz.type == "bar") {
        return generateBarChartData(viz, processed_data);
    } else if (viz.type == "line") {
        return generateLineChartData(viz, processed_data);
    } else if (viz.type == "scatter") {
        return generateScatterPlotData(viz, processed_data);
    } else if (viz.type == "table") {
        return generateTableData(viz, processed_data);
    } else {
        throw InvalidInputException("Unsupported visualization type: " + viz.type);
    }
}

std::unique_ptr<ChartData> VisualizationEngine::generateBarChartData(const Visualization& viz, const DataTable& data) {
    LOG_DEBUG("Generating bar chart data for '{}'", viz.name);
    auto chart_data = std::make_unique<ChartData>();
    chart_data->chart_type = "bar";
    chart_data->plot_options["title"] = viz.name;

    // Expect x_axis and y_axis columns in config
    auto x_axis_it = viz.config.find("x_axis");
    auto y_axis_it = viz.config.find("y_axis");

    if (x_axis_it == viz.config.end() || y_axis_it == viz.config.end()) {
        throw InvalidInputException("Bar chart requires 'x_axis' and 'y_axis' columns in config.");
    }

    const std::string& x_axis_col = x_axis_it->second;
    const std::string& y_axis_col = y_axis_it->second;

    if (std::find(data.column_names.begin(), data.column_names.end(), x_axis_col) == data.column_names.end() ||
        std::find(data.column_names.begin(), data.column_names.end(), y_axis_col) == data.column_names.end()) {
        throw InvalidInputException("X-axis or Y-axis column not found in data for bar chart.");
    }
    
    chart_data->plot_options["x_axis_label"] = x_axis_col;
    chart_data->plot_options["y_axis_label"] = y_axis_col;

    std::vector<double> y_values;
    for (const auto& row : data.rows) {
        chart_data->labels.push_back(std::visit([](const auto& arg){ return std::to_string(arg); }, row.at(x_axis_col)));
        try {
            if (std::holds_alternative<int>(row.at(y_axis_col))) {
                y_values.push_back(static_cast<double>(std::get<int>(row.at(y_axis_col))));
            } else if (std::holds_alternative<double>(row.at(y_axis_col))) {
                y_values.push_back(std::get<double>(row.at(y_axis_col)));
            } else {
                LOG_WARN("Non-numeric Y-axis value encountered for bar chart in column '{}'. Skipping row.", y_axis_col);
                // Decide whether to skip or try to convert
            }
        } catch (const std::bad_variant_access& e) {
            LOG_WARN("Error accessing Y-axis value for bar chart: {}", e.what());
        }
    }
    chart_data->datasets[y_axis_col] = y_values;

    return chart_data;
}

std::unique_ptr<ChartData> VisualizationEngine::generateLineChartData(const Visualization& viz, const DataTable& data) {
    LOG_DEBUG("Generating line chart data for '{}'", viz.name);
    auto chart_data = std::make_unique<ChartData>();
    chart_data->chart_type = "line";
    chart_data->plot_options["title"] = viz.name;

    auto x_axis_it = viz.config.find("x_axis");
    auto y_axis_it = viz.config.find("y_axis");

    if (x_axis_it == viz.config.end() || y_axis_it == viz.config.end()) {
        throw InvalidInputException("Line chart requires 'x_axis' and 'y_axis' columns in config.");
    }

    const std::string& x_axis_col = x_axis_it->second;
    const std::string& y_axis_col = y_axis_it->second;

    if (std::find(data.column_names.begin(), data.column_names.end(), x_axis_col) == data.column_names.end() ||
        std::find(data.column_names.begin(), data.column_names.end(), y_axis_col) == data.column_names.end()) {
        throw InvalidInputException("X-axis or Y-axis column not found in data for line chart.");
    }
    
    chart_data->plot_options["x_axis_label"] = x_axis_col;
    chart_data->plot_options["y_axis_label"] = y_axis_col;

    std::vector<double> y_values;
    for (const auto& row : data.rows) {
        chart_data->labels.push_back(std::visit([](const auto& arg){ return std::to_string(arg); }, row.at(x_axis_col)));
        try {
            if (std::holds_alternative<int>(row.at(y_axis_col))) {
                y_values.push_back(static_cast<double>(std::get<int>(row.at(y_axis_col))));
            } else if (std::holds_alternative<double>(row.at(y_axis_col))) {
                y_values.push_back(std::get<double>(row.at(y_axis_col)));
            }
        } catch (const std::bad_variant_access& e) {
            LOG_WARN("Error accessing Y-axis value for line chart: {}", e.what());
        }
    }
    chart_data->datasets[y_axis_col] = y_values;

    return chart_data;
}

std::unique_ptr<ChartData> VisualizationEngine::generateScatterPlotData(const Visualization& viz, const DataTable& data) {
    LOG_DEBUG("Generating scatter plot data for '{}'", viz.name);
    auto chart_data = std::make_unique<ChartData>();
    chart_data->chart_type = "scatter";
    chart_data->plot_options["title"] = viz.name;

    auto x_axis_it = viz.config.find("x_axis");
    auto y_axis_it = viz.config.find("y_axis");

    if (x_axis_it == viz.config.end() || y_axis_it == viz.config.end()) {
        throw InvalidInputException("Scatter plot requires 'x_axis' and 'y_axis' columns in config.");
    }

    const std::string& x_axis_col = x_axis_it->second;
    const std::string& y_axis_col = y_axis_it->second;

    if (std::find(data.column_names.begin(), data.column_names.end(), x_axis_col) == data.column_names.end() ||
        std::find(data.column_names.begin(), data.column_names.end(), y_axis_col) == data.column_names.end()) {
        throw InvalidInputException("X-axis or Y-axis column not found in data for scatter plot.");
    }
    
    chart_data->plot_options["x_axis_label"] = x_axis_col;
    chart_data->plot_options["y_axis_label"] = y_axis_col;

    std::vector<double> x_values;
    std::vector<double> y_values;

    for (const auto& row : data.rows) {
        try {
            double x_val = 0.0;
            if (std::holds_alternative<int>(row.at(x_axis_col))) {
                x_val = static_cast<double>(std::get<int>(row.at(x_axis_col)));
            } else if (std::holds_alternative<double>(row.at(x_axis_col))) {
                x_val = std::get<double>(row.at(x_axis_col));
            } else {
                 LOG_WARN("Non-numeric X-axis value for scatter plot, column '{}'. Skipping row.", x_axis_col);
                 continue;
            }

            double y_val = 0.0;
            if (std::holds_alternative<int>(row.at(y_axis_col))) {
                y_val = static_cast<double>(std::get<int>(row.at(y_axis_col)));
            } else if (std::holds_alternative<double>(row.at(y_axis_col))) {
                y_val = std::get<double>(row.at(y_axis_col));
            } else {
                 LOG_WARN("Non-numeric Y-axis value for scatter plot, column '{}'. Skipping row.", y_axis_col);
                 continue;
            }
            x_values.push_back(x_val);
            y_values.push_back(y_val);

        } catch (const std::bad_variant_access& e) {
            LOG_WARN("Error accessing X/Y-axis values for scatter plot: {}", e.what());
        }
    }
    chart_data->datasets[x_axis_col] = x_values;
    chart_data->datasets[y_axis_col] = y_values;

    return chart_data;
}

std::unique_ptr<ChartData> VisualizationEngine::generateTableData(const Visualization& viz, const DataTable& data) {
    LOG_DEBUG("Generating table data for '{}'", viz.name);
    auto chart_data = std::make_unique<ChartData>();
    chart_data->chart_type = "table";
    chart_data->plot_options["title"] = viz.name;

    // For a table, all columns are relevant
    chart_data->labels = data.column_names; // Column headers for the table

    for (const auto& col_name : data.column_names) {
        std::vector<std::string> column_values;
        for (const auto& row : data.rows) {
            if (row.count(col_name)) {
                column_values.push_back(std::visit([](const auto& arg){ return std::to_string(arg); }, row.at(col_name)));
            } else {
                column_values.push_back(""); // Missing value
            }
        }
        chart_data->string_datasets[col_name] = column_values;
    }
    return chart_data;
}

} // namespace VisGenius
```