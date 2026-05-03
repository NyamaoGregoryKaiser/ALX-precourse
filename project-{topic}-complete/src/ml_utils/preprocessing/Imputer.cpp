```cpp
#include "Imputer.hpp"
#include <algorithm> // For std::sort

namespace MLToolkit {
namespace MLUtils {
namespace Preprocessing {

Imputer::Imputer(ImputationStrategy strategy, double constant_value)
    : strategy_(strategy), constant_value_(constant_value), fitted_(false) {}

void Imputer::fit(const Core::MatrixXd& X, const std::vector<bool>& mask) {
    if (X.rows() == 0 || X.cols() == 0) {
        throw Common::InvalidArgumentException("Input matrix cannot be empty for Imputer::fit.");
    }
    if (mask.size() != X.rows() * X.cols()) {
        throw Common::InvalidArgumentException("Mask size does not match matrix dimensions for Imputer::fit.");
    }
    LOG_INFO("Imputer fitting with strategy {} on data with {} rows, {} cols.",
             imputation_strategy_to_string(strategy_), X.rows(), X.cols());

    imputation_values_.resize(X.cols());

    if (strategy_ == ImputationStrategy::MEAN) {
        imputation_values_ = calculate_mean(X, mask);
    } else if (strategy_ == ImputationStrategy::MEDIAN) {
        LOG_WARN("Median imputation not fully implemented. Using mean as fallback for demonstration.");
        imputation_values_ = calculate_mean(X, mask);
        // Proper median calculation would involve:
        // 1. Extracting non-NaN values for each column.
        // 2. Sorting them.
        // 3. Finding the middle element.
    } else if (strategy_ == ImputationStrategy::MODE) {
        LOG_WARN("Mode imputation not fully implemented. Using mean as fallback for demonstration.");
        imputation_values_ = calculate_mean(X, mask);
        // Proper mode calculation would involve:
        // 1. Counting frequencies of non-NaN values for each column.
        // 2. Finding the most frequent one.
    } else if (strategy_ == ImputationStrategy::CONSTANT) {
        imputation_values_.setConstant(constant_value_);
    } else {
        throw Common::MLUtilityException("Unsupported imputation strategy.");
    }

    fitted_ = true;
    LOG_DEBUG("Imputer fitted. Imputation values: {}", imputation_values_.transpose());
}

Core::MatrixXd Imputer::transform(const Core::MatrixXd& X, const std::vector<bool>& mask) const {
    if (!fitted_) {
        throw Common::MLUtilityException("Imputer must be fitted before transforming data.");
    }
    if (X.cols() != imputation_values_.size()) {
        throw Common::InvalidArgumentException("Number of features in input data ({}) does not match fitted imputer ({}).", X.cols(), imputation_values_.size());
    }
    if (mask.size() != X.rows() * X.cols()) {
        throw Common::InvalidArgumentException("Mask size does not match matrix dimensions for Imputer::transform.");
    }

    Core::MatrixXd X_imputed = X;

    for (long i = 0; i < X_imputed.rows(); ++i) {
        for (long j = 0; j < X_imputed.cols(); ++j) {
            // Check if this specific element is marked as NaN in the mask
            if (mask[i * X_imputed.cols() + j]) {
                X_imputed(i, j) = imputation_values_[j];
            }
        }
    }
    
    LOG_DEBUG("Imputer transformed data.");
    return X_imputed;
}

nlohmann::json Imputer::to_json() const {
    nlohmann::json j;
    j["type"] = "Imputer";
    j["strategy"] = imputation_strategy_to_string(strategy_);
    j["constant_value"] = constant_value_;
    j["fitted"] = fitted_;
    if (fitted_) {
        j["imputation_values"] = Core::eigen_matrix_to_vector(imputation_values_.transpose());
    }
    return j;
}

void Imputer::from_json(const nlohmann::json& j) {
    if (!j.contains("type") || j.at("type").get<std::string>() != "Imputer") {
        throw Common::InvalidArgumentException("JSON is not for Imputer type.");
    }
    strategy_ = string_to_imputation_strategy(j.at("strategy").get<std::string>());
    constant_value_ = j.at("constant_value").get<double>();
    fitted_ = j.at("fitted").get<bool>();
    if (fitted_) {
        imputation_values_ = Core::vector_to_eigen_matrix(j.at("imputation_values").get<std::vector<std::vector<double>>>()).transpose();
    }
    LOG_DEBUG("Imputer parameters loaded from JSON.");
}

Core::VectorXd Imputer::calculate_mean(const Core::MatrixXd& X, const std::vector<bool>& mask) const {
    Core::VectorXd means = Core::VectorXd::Zero(X.cols());
    Core::VectorXd counts = Core::VectorXd::Zero(X.cols());

    for (long j = 0; j < X.cols(); ++j) {
        for (long i = 0; i < X.rows(); ++i) {
            if (!mask[i * X.cols() + j]) { // If not NaN
                means[j] += X(i, j);
                counts[j] += 1;
            }
        }
        if (counts[j] > 0) {
            means[j] /= counts[j];
        } else {
            // All values in column are NaN, default to 0 or throw
            LOG_WARN("Column {} contains only missing values. Imputing with 0 for mean strategy.", j);
            means[j] = 0.0; 
        }
    }
    return means;
}

} // namespace Preprocessing
} // namespace MLUtils
} // namespace MLToolkit
```