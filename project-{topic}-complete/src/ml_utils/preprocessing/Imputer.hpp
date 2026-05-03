```cpp
#ifndef MLTOOLKIT_IMPUTER_HPP
#define MLTOOLKIT_IMPUTER_HPP

#include <Eigen/Dense>
#include <nlohmann/json.hpp>
#include <vector>
#include <string>
#include "../../common/Exceptions.hpp"
#include "../../common/Logger.hpp"
#include "../core/MatrixUtils.hpp"

namespace MLToolkit {
namespace MLUtils {
namespace Preprocessing {

enum class ImputationStrategy {
    MEAN,
    MEDIAN,
    MODE,
    CONSTANT // Fill with a specific constant
};

inline std::string imputation_strategy_to_string(ImputationStrategy strategy) {
    switch (strategy) {
        case ImputationStrategy::MEAN: return "MEAN";
        case ImputationStrategy::MEDIAN: return "MEDIAN";
        case ImputationStrategy::MODE: return "MODE";
        case ImputationStrategy::CONSTANT: return "CONSTANT";
        default: return "UNKNOWN";
    }
}

inline ImputationStrategy string_to_imputation_strategy(const std::string& strategy_str) {
    if (strategy_str == "MEAN") return ImputationStrategy::MEAN;
    if (strategy_str == "MEDIAN") return ImputationStrategy::MEDIAN;
    if (strategy_str == "MODE") return ImputationStrategy::MODE;
    if (strategy_str == "CONSTANT") return ImputationStrategy::CONSTANT;
    return ImputationStrategy::MEAN; // Default or throw error
}

class Imputer {
public:
    explicit Imputer(ImputationStrategy strategy = ImputationStrategy::MEAN, double constant_value = 0.0);
    
    // Fit the imputer to data (learn imputation values)
    void fit(const Core::MatrixXd& X, const std::vector<bool>& mask); // mask indicates NaNs

    // Transform data by imputing missing values
    Core::MatrixXd transform(const Core::MatrixXd& X, const std::vector<bool>& mask) const;

    // Fit and then transform data
    Core::MatrixXd fit_transform(const Core::MatrixXd& X, const std::vector<bool>& mask) {
        fit(X, mask);
        return transform(X, mask);
    }

    // Serialize imputer parameters to JSON
    nlohmann::json to_json() const;

    // Deserialize imputer parameters from JSON
    void from_json(const nlohmann::json& j);

private:
    ImputationStrategy strategy_;
    double constant_value_;
    Core::VectorXd imputation_values_; // Stored mean/median/mode for each feature
    bool fitted_ = false;

    Core::VectorXd calculate_mean(const Core::MatrixXd& X, const std::vector<bool>& mask) const;
    // Median and Mode calculation would be more complex and usually require sorting/histograms
    // For this example, we'll focus on MEAN.
};

} // namespace Preprocessing
} // namespace MLUtils
} // namespace MLToolkit

#endif // MLTOOLKIT_IMPUTER_HPP
```