```cpp
#ifndef MLTOOLKIT_FEATURE_EXTRACTOR_HPP
#define MLTOOLKIT_FEATURE_EXTRACTOR_HPP

#include <Eigen/Dense>
#include <nlohmann/json.hpp>
#include "../../common/Exceptions.hpp"
#include "../../common/Logger.hpp"
#include "../core/MatrixUtils.hpp"

namespace MLToolkit {
namespace MLUtils {
namespace Features {

class PolynomialFeatures {
public:
    explicit PolynomialFeatures(int degree = 2, bool include_bias = true);

    // No fitting needed for PolynomialFeatures, just transform
    Core::MatrixXd transform(const Core::MatrixXd& X) const;

    // Serialize parameters to JSON
    nlohmann::json to_json() const;

    // Deserialize parameters from JSON
    void from_json(const nlohmann::json& j);

private:
    int degree_;
    bool include_bias_;

    // Helper to compute combinations for polynomial features
    std::vector<std::vector<int>> generate_combinations(int n_features) const;
};

} // namespace Features
} // namespace MLUtils
} // namespace MLToolkit

#endif // MLTOOLKIT_FEATURE_EXTRACTOR_HPP
```