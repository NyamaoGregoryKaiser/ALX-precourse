```cpp
#ifndef VISGENIUS_VISUALIZATION_ENGINE_H
#define VISGENIUS_VISUALIZATION_ENGINE_H

#include <string>
#include <vector>
#include <map>
#include <memory>

#include "Models.h"
#include "DataProcessor.h"
#include "ErrorHandling.h"
#include "Logger.h"

namespace VisGenius {

// Represents processed data ready for a specific chart type
// This would be consumed by a frontend visualization library (e.g., D3.js, Chart.js, QtCharts)
struct ChartData {
    std::string chart_type; // e.g., "bar", "line", "scatter", "table"
    std::vector<std::string> labels; // X-axis labels for bar/line, or column headers for table
    std::map<std::string, std::vector<double>> datasets; // Y-axis values for bar/line, or numeric columns
    std::map<std::string, std::vector<std::string>> string_datasets; // Non-numeric columns (e.g., for scatter, or table display)
    std::map<std::string, std::string> plot_options; // e.g., "x_axis_label", "y_axis_label", "title"

    std::string to_string() const {
        std::ostringstream oss;
        oss << "ChartData (Type: " << chart_type << ")\nLabels: [";
        for (size_t i = 0; i < labels.size(); ++i) {
            oss << labels[i];
            if (i < labels.size() - 1) oss << ", ";
        }
        oss << "]\nDatasets:\n";
        for (const auto& ds : datasets) {
            oss << "  " << ds.first << ": [";
            for (size_t i = 0; i < ds.second.size(); ++i) {
                oss << ds.second[i];
                if (i < ds.second.size() - 1) oss << ", ";
            }
            oss << "]\n";
        }
        if (!string_datasets.empty()) {
            oss << "String Datasets:\n";
            for (const auto& sds : string_datasets) {
                oss << "  " << sds.first << ": [";
                for (size_t i = 0; i < sds.second.size(); ++i) {
                    oss << sds.second[i];
                    if (i < sds.second.size() - 1) oss << ", ";
                }
                oss << "]\n";
            }
        }
        oss << "Options:\n";
        for (const auto& opt : plot_options) {
            oss << "  " << opt.first << ": " << opt.second << "\n";
        }
        return oss.str();
    }
};

class VisualizationEngine {
public:
    VisualizationEngine(std::shared_ptr<DataProcessor> data_processor);

    // Generate chart data for a given visualization config and raw data
    std::unique_ptr<ChartData> generateChartData(const Visualization& viz, const DataTable& raw_data);

private:
    std::shared_ptr<DataProcessor> m_dataProcessor;

    // Helper functions for specific chart types
    std::unique_ptr<ChartData> generateBarChartData(const Visualization& viz, const DataTable& data);
    std::unique_ptr<ChartData> generateLineChartData(const Visualization& viz, const DataTable& data);
    std::unique_ptr<ChartData> generateScatterPlotData(const Visualization& viz, const DataTable& data);
    std::unique_ptr<ChartData> generateTableData(const Visualization& viz, const DataTable& data);
};

} // namespace VisGenius

#endif // VISGENIUS_VISUALIZATION_ENGINE_H
```