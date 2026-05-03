```cpp
#ifndef MLTOOLKIT_METRICS_HPP
#define MLTOOLKIT_METRICS_HPP

#include <Eigen/Dense>
#include <cmath> // For std::sqrt
#include <vector>
#include <string>
#include <numeric> // For std::accumulate
#include "../../common/Exceptions.hpp"
#include "../../common/Logger.hpp"
#include "../core/MatrixUtils.hpp"

namespace MLToolkit {
namespace MLUtils {
namespace Evaluation {

// Type aliases for convenience
using VectorXd = Eigen::VectorXd;

// Calculates Mean Squared Error (MSE)
inline double mean_squared_error(const VectorXd& y_true, const VectorXd& y_pred) {
    if (y_true.size() != y_pred.size()) {
        throw Common::InvalidArgumentException("y_true and y_pred must have the same size for MSE calculation.");
    }
    if (y_true.size() == 0) return 0.0;
    
    VectorXd errors = y_true - y_pred;
    return errors.array().square().mean();
}

// Calculates Root Mean Squared Error (RMSE)
inline double root_mean_squared_error(const VectorXd& y_true, const VectorXd& y_pred) {
    return std::sqrt(mean_squared_error(y_true, y_pred));
}

// Calculates R-squared (coefficient of determination)
inline double r_squared(const VectorXd& y_true, const VectorXd& y_pred) {
    if (y_true.size() != y_pred.size()) {
        throw Common::InvalidArgumentException("y_true and y_pred must have the same size for R-squared calculation.");
    }
    if (y_true.size() < 2) return 0.0; // R-squared needs at least 2 samples

    double ss_total = (y_true.array() - y_true.mean()).square().sum();
    if (ss_total < std::numeric_limits<double>::epsilon()) { // Avoid division by zero if y_true is constant
        return 1.0; // If true values are constant and predictions are perfect, R-squared is 1.
                    // If true values are constant and predictions are not perfect, it's undefined
                    // or negative infinity depending on convention. Returning 1.0 for perfect prediction.
    }
    double ss_residual = (y_true - y_pred).array().square().sum();
    
    return 1.0 - (ss_residual / ss_total);
}

// Calculates Mean Absolute Error (MAE)
inline double mean_absolute_error(const VectorXd& y_true, const VectorXd& y_pred) {
    if (y_true.size() != y_pred.size()) {
        throw Common::InvalidArgumentException("y_true and y_pred must have the same size for MAE calculation.");
    }
    if (y_true.size() == 0) return 0.0;
    
    VectorXd errors = y_true - y_pred;
    return errors.array().abs().mean();
}

// Placeholder for classification metrics (e.g., accuracy, precision, recall, F1-score)
// These would require integer labels and different calculations.
// For demonstration, we'll keep it simple with regression metrics.

// Function to calculate a map of common regression metrics
inline nlohmann::json calculate_regression_metrics(const VectorXd& y_true, const VectorXd& y_pred) {
    if (y_true.size() != y_pred.size() || y_true.size() == 0) {
        LOG_WARN("Cannot calculate regression metrics with empty or mismatched true/predicted vectors.");
        return {
            {"mse", std::nan(" ")} ,
            {"rmse", std::nan(" ")},
            {"mae", std::nan(" ")},
            {"r_squared", std::nan(" ")}
        };
    }

    nlohmann::json metrics;
    metrics["mse"] = mean_squared_error(y_true, y_pred);
    metrics["rmse"] = root_mean_squared_error(y_true, y_pred);
    metrics["mae"] = mean_absolute_error(y_true, y_pred);
    metrics["r_squared"] = r_squared(y_true, y_pred);
    LOG_INFO("Calculated regression metrics: MSE={}, RMSE={}, MAE={}, R2={}", 
             metrics["mse"].get<double>(), metrics["rmse"].get<double>(), 
             metrics["mae"].get<double>(), metrics["r_squared"].get<double>());
    return metrics;
}

} // namespace Evaluation
} // namespace MLUtils
} // namespace MLToolkit

#endif // MLTOOLKIT_METRICS_HPP
```