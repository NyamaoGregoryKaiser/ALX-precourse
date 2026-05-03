```cpp
#include "Scaler.hpp"
#include <limits> // For numeric_limits

namespace MLToolkit {
namespace MLUtils {
namespace Preprocessing {

std::unique_ptr<Scaler> Scaler::create_from_json(const nlohmann::json& j) {
    if (!j.contains("type") || !j.at("type").is_string()) {
        throw Common::InvalidArgumentException("Scaler JSON must contain a 'type' field.");
    }
    std::string type = j.at("type").get<std::string>();
    std::unique_ptr<Scaler> scaler;
    if (type == "MinMaxScaler") {
        double feature_min = j.contains("feature_min") ? j.at("feature_min").get<double>() : 0.0;
        double feature_max = j.contains("feature_max") ? j.at("feature_max").get<double>() : 1.0;
        scaler = std::make_unique<MinMaxScaler>(feature_min, feature_max);
    } else if (type == "StandardScaler") {
        scaler = std::make_unique<StandardScaler>();
    } else {
        throw Common::InvalidArgumentException("Unknown scaler type: " + type);
    }
    scaler->from_json(j); // Load specific parameters
    return scaler;
}

// --- MinMaxScaler implementation ---
MinMaxScaler::MinMaxScaler(double feature_min, double feature_max)
    : feature_min_(feature_min), feature_max_(feature_max), fitted_(false) {
    if (feature_min >= feature_max) {
        throw Common::InvalidArgumentException("feature_min must be less than feature_max for MinMaxScaler.");
    }
}

void MinMaxScaler::fit(const Core::MatrixXd& X) {
    if (X.rows() == 0 || X.cols() == 0) {
        throw Common::InvalidArgumentException("Input matrix cannot be empty for MinMaxScaler::fit.");
    }
    LOG_INFO("MinMaxScaler fitting on data with {} rows, {} cols.", X.rows(), X.cols());

    data_min_ = X.colwise().minCoeff();
    data_max_ = X.colwise().maxCoeff();
    data_range_ = data_max_ - data_min_;

    // Handle columns with zero range (constant features)
    for (long i = 0; i < data_range_.size(); ++i) {
        if (data_range_[i] < std::numeric_limits<double>::epsilon()) { // Check if range is effectively zero
            data_range_[i] = 1.0; // Avoid division by zero, transformed value will be feature_min
            LOG_WARN("MinMaxScaler: Feature column {} has zero range. Scaled value will be {}.", i, feature_min_);
        }
    }
    fitted_ = true;
    LOG_DEBUG("MinMaxScaler fitted. Data Min: {}, Data Max: {}", data_min_.transpose(), data_max_.transpose());
}

Core::MatrixXd MinMaxScaler::transform(const Core::MatrixXd& X) const {
    if (!fitted_) {
        throw Common::MLUtilityException("MinMaxScaler must be fitted before transforming data.");
    }
    if (X.cols() != data_min_.size()) {
        throw Common::InvalidArgumentException("Number of features in input data ({}) does not match fitted scaler ({}).", X.cols(), data_min_.size());
    }

    Core::MatrixXd X_scaled = X;
    X_scaled = (X_scaled.rowwise() - data_min_.transpose()).array() / data_range_.transpose().array();
    X_scaled = X_scaled.array() * (feature_max_ - feature_min_) + feature_min_;
    
    LOG_DEBUG("MinMaxScaler transformed data.");
    return X_scaled;
}

Core::MatrixXd MinMaxScaler::inverse_transform(const Core::MatrixXd& X_scaled) const {
    if (!fitted_) {
        throw Common::MLUtilityException("MinMaxScaler must be fitted before inverse transforming data.");
    }
    if (X_scaled.cols() != data_min_.size()) {
        throw Common::InvalidArgumentException("Number of features in input data ({}) does not match fitted scaler ({}).", X_scaled.cols(), data_min_.size());
    }

    Core::MatrixXd X_original = X_scaled;
    X_original = (X_original.array() - feature_min_) / (feature_max_ - feature_min_);
    X_original = X_original.array() * data_range_.transpose().array();
    X_original = X_original.rowwise() + data_min_.transpose();

    LOG_DEBUG("MinMaxScaler inverse transformed data.");
    return X_original;
}

nlohmann::json MinMaxScaler::to_json() const {
    nlohmann::json j;
    j["type"] = "MinMaxScaler";
    j["feature_min"] = feature_min_;
    j["feature_max"] = feature_max_;
    j["fitted"] = fitted_;
    if (fitted_) {
        j["data_min"] = Core::eigen_matrix_to_vector(data_min_.transpose());
        j["data_max"] = Core::eigen_matrix_to_vector(data_max_.transpose());
        j["data_range"] = Core::eigen_matrix_to_vector(data_range_.transpose());
    }
    return j;
}

void MinMaxScaler::from_json(const nlohmann::json& j) {
    if (!j.contains("type") || j.at("type").get<std::string>() != "MinMaxScaler") {
        throw Common::InvalidArgumentException("JSON is not for MinMaxScaler type.");
    }
    feature_min_ = j.at("feature_min").get<double>();
    feature_max_ = j.at("feature_max").get<double>();
    fitted_ = j.at("fitted").get<bool>();
    if (fitted_) {
        data_min_ = Core::vector_to_eigen_matrix(j.at("data_min").get<std::vector<std::vector<double>>>()).transpose();
        data_max_ = Core::vector_to_eigen_matrix(j.at("data_max").get<std::vector<std::vector<double>>>()).transpose();
        data_range_ = Core::vector_to_eigen_matrix(j.at("data_range").get<std::vector<std::vector<double>>>()).transpose();
    }
    LOG_DEBUG("MinMaxScaler parameters loaded from JSON.");
}

// --- StandardScaler implementation ---
StandardScaler::StandardScaler() : fitted_(false) {}

void StandardScaler::fit(const Core::MatrixXd& X) {
    if (X.rows() == 0 || X.cols() == 0) {
        throw Common::InvalidArgumentException("Input matrix cannot be empty for StandardScaler::fit.");
    }
    LOG_INFO("StandardScaler fitting on data with {} rows, {} cols.", X.rows(), X.cols());

    mean_ = X.colwise().mean();
    // Compute standard deviation, ensure division by (N-1) for sample std dev, or N for population. Eigen's .stddev() uses N-1.
    // Ensure std_dev is not zero to avoid division by zero
    std_dev_ = (X.rowwise() - mean_.transpose()).colwise().norm() / std::sqrt(static_cast<double>(X.rows() - 1));
    for (long i = 0; i < std_dev_.size(); ++i) {
        if (std_dev_[i] < std::numeric_limits<double>::epsilon()) {
            std_dev_[i] = 1.0; // Avoid division by zero, transformed value will be 0
            LOG_WARN("StandardScaler: Feature column {} has zero standard deviation. Scaled value will be 0.", i);
        }
    }
    fitted_ = true;
    LOG_DEBUG("StandardScaler fitted. Mean: {}, Std Dev: {}", mean_.transpose(), std_dev_.transpose());
}

Core::MatrixXd StandardScaler::transform(const Core::MatrixXd& X) const {
    if (!fitted_) {
        throw Common::MLUtilityException("StandardScaler must be fitted before transforming data.");
    }
    if (X.cols() != mean_.size()) {
        throw Common::InvalidArgumentException("Number of features in input data ({}) does not match fitted scaler ({}).", X.cols(), mean_.size());
    }

    Core::MatrixXd X_scaled = X;
    X_scaled = (X_scaled.rowwise() - mean_.transpose()).array() / std_dev_.transpose().array();

    LOG_DEBUG("StandardScaler transformed data.");
    return X_scaled;
}

Core::MatrixXd StandardScaler::inverse_transform(const Core::MatrixXd& X_scaled) const {
    if (!fitted_) {
        throw Common::MLUtilityException("StandardScaler must be fitted before inverse transforming data.");
    }
    if (X_scaled.cols() != mean_.size()) {
        throw Common::InvalidArgumentException("Number of features in input data ({}) does not match fitted scaler ({}).", X_scaled.cols(), mean_.size());
    }

    Core::MatrixXd X_original = X_scaled;
    X_original = X_original.array() * std_dev_.transpose().array();
    X_original = X_original.rowwise() + mean_.transpose();

    LOG_DEBUG("StandardScaler inverse transformed data.");
    return X_original;
}

nlohmann::json StandardScaler::to_json() const {
    nlohmann::json j;
    j["type"] = "StandardScaler";
    j["fitted"] = fitted_;
    if (fitted_) {
        j["mean"] = Core::eigen_matrix_to_vector(mean_.transpose());
        j["std_dev"] = Core::eigen_matrix_to_vector(std_dev_.transpose());
    }
    return j;
}

void StandardScaler::from_json(const nlohmann::json& j) {
    if (!j.contains("type") || j.at("type").get<std::string>() != "StandardScaler") {
        throw Common::InvalidArgumentException("JSON is not for StandardScaler type.");
    }
    fitted_ = j.at("fitted").get<bool>();
    if (fitted_) {
        mean_ = Core::vector_to_eigen_matrix(j.at("mean").get<std::vector<std::vector<double>>>()).transpose();
        std_dev_ = Core::vector_to_eigen_matrix(j.at("std_dev").get<std::vector<std::vector<double>>>()).transpose();
    }
    LOG_DEBUG("StandardScaler parameters loaded from JSON.");
}

} // namespace Preprocessing
} // namespace MLUtils
} // namespace MLToolkit
```