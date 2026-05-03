```cpp
#include "FeatureExtractor.hpp"
#include <cmath> // For std::pow

namespace MLToolkit {
namespace MLUtils {
namespace Features {

PolynomialFeatures::PolynomialFeatures(int degree, bool include_bias)
    : degree_(degree), include_bias_(include_bias) {
    if (degree_ < 0) {
        throw Common::InvalidArgumentException("Polynomial degree cannot be negative.");
    }
}

Core::MatrixXd PolynomialFeatures::transform(const Core::MatrixXd& X) const {
    if (X.rows() == 0 || X.cols() == 0) {
        throw Common::InvalidArgumentException("Input matrix cannot be empty for PolynomialFeatures::transform.");
    }
    LOG_INFO("Transforming data using PolynomialFeatures (degree={}, bias={}).", degree_, include_bias_);

    int n_samples = X.rows();
    int n_features = X.cols();

    // Generate combinations of features up to the specified degree
    std::vector<std::vector<int>> combinations = generate_combinations(n_features);

    // Calculate the number of output features
    long n_output_features = combinations.size();
    if (include_bias_) {
        n_output_features++; // For the constant term (x_0 = 1)
    }

    Core::MatrixXd X_poly(n_samples, n_output_features);
    long current_col = 0;

    if (include_bias_) {
        X_poly.col(current_col).setConstant(1.0); // Add the bias term
        current_col++;
    }

    // Add original features (degree 1)
    for (int j = 0; j < n_features; ++j) {
        X_poly.col(current_col++) = X.col(j);
    }
    
    // Add polynomial features for degree > 1
    for (const auto& combo : combinations) {
        if (combo.empty()) continue; // Skip empty combinations from `generate_combinations`
        
        Core::VectorXd feature_product = Core::VectorXd::Ones(n_samples);
        for (int feature_idx : combo) {
            if (feature_idx < 0 || feature_idx >= n_features) {
                // This shouldn't happen with correct generate_combinations logic
                throw Common::MLUtilityException("Invalid feature index in polynomial combination.");
            }
            feature_product.array() *= X.col(feature_idx).array();
        }
        X_poly.col(current_col++) = feature_product;
    }

    LOG_DEBUG("PolynomialFeatures transformed data from {}x{} to {}x{}.", X.rows(), X.cols(), X_poly.rows(), X_poly.cols());
    return X_poly;
}

nlohmann::json PolynomialFeatures::to_json() const {
    return {
        {"type", "PolynomialFeatures"},
        {"degree", degree_},
        {"include_bias", include_bias_}
    };
}

void PolynomialFeatures::from_json(const nlohmann::json& j) {
    if (!j.contains("type") || j.at("type").get<std::string>() != "PolynomialFeatures") {
        throw Common::InvalidArgumentException("JSON is not for PolynomialFeatures type.");
    }
    degree_ = j.at("degree").get<int>();
    include_bias_ = j.at("include_bias").get<bool>();
    if (degree_ < 0) {
        throw Common::InvalidArgumentException("Loaded polynomial degree cannot be negative.");
    }
    LOG_DEBUG("PolynomialFeatures parameters loaded from JSON.");
}

// Helper to generate combinations of features for polynomial expansion
// This is a simplified approach, a more robust one would generate unique terms.
// Example: for degree 2, 2 features (x1, x2) -> x1, x2, x1*x2, x1^2, x2^2 (and bias if include_bias)
std::vector<std::vector<int>> PolynomialFeatures::generate_combinations(int n_features) const {
    std::vector<std::vector<int>> combinations;
    // Iterate through degrees from 2 up to 'degree_'
    for (int d = 2; d <= degree_; ++d) {
        // This is a basic way to get interaction terms up to degree d.
        // For actual polynomial features, it would generate all unique terms (e.g., x1*x2, x1^2)
        // A more advanced combinatorial algorithm would be needed for `sklearn.PolynomialFeatures` equivalent.
        // For now, we'll just create interaction terms of degree 'd'
        
        // Example for degree 2 and 2 features (0, 1):
        // (0,0) -> x0^2
        // (0,1) -> x0*x1
        // (1,1) -> x1^2
        
        // This current implementation for `generate_combinations` generates combinations WITH replacement,
        // which corresponds to terms like x_i^k and x_i*x_j.
        // A more canonical approach uses iterators over tuples, or a recursive function.

        // A simplified generation for interaction terms
        // This loop generates all combinations of 'd' features (with replacement)
        std::vector<int> current_combination(d);
        std::function<void(int, int)> recurse = 
            [&](int k, int start_idx) {
            if (k == d) {
                // Only add combinations if they are distinct from degree 1 (original features)
                // and if they're not merely squares of degree 1 features if already handled
                combinations.push_back(current_combination);
                return;
            }
            for (int i = start_idx; i < n_features; ++i) {
                current_combination[k] = i;
                recurse(k + 1, i);
            }
        };
        recurse(0, 0);
    }
    
    // Remove duplicates or canonicalize if necessary.
    // E.g., for (0,1) and (1,0) if order doesn't matter for x0*x1.
    // The current `recurse` ensures unique combinations in sorted order.
    
    // Remove terms that are simply original features if already added (they are handled by direct copy from X)
    // The `transform` method specifically handles degree 1 features separately then adds polynomial terms.
    // So this `generate_combinations` should only provide terms for degree >= 2.
    // The loop above already starts from `d = 2`.
    
    // Need to filter out terms that are just single features if `include_bias_` is false,
    // or if they're implicitly handled. Given `transform` handles degree 1 features after bias,
    // this combinations list is only for higher degree and interaction terms.

    // A correct implementation for PolynomialFeatures would use boost.combinations or similar logic
    // to generate tuples of indices for powers, e.g., (1,0,0) for x0, (0,1,0) for x1, (2,0,0) for x0^2, (1,1,0) for x0*x1.
    // This example is simplified.

    // For a truly basic polynomial features: if degree=2, n_features=2 (x0, x1) -> terms x0, x1, x0*x1, x0^2, x1^2 (excluding bias=1)
    // The current `combinations` list would generate: (0,0), (0,1), (1,1) for d=2. This is correct for x0^2, x0*x1, x1^2.
    // So the previous handling of original features directly from X covers degree 1.
    // The implementation needs to ensure that `current_col` is advanced correctly and that `generate_combinations`
    // produces the _additional_ terms for degree >= 2.
    
    return combinations; // Returns combinations of feature indices, e.g., {{0,0}, {0,1}, {1,1}} for degree 2, n_features 2
}


} // namespace Features
} // namespace MLUtils
} // namespace MLToolkit
```