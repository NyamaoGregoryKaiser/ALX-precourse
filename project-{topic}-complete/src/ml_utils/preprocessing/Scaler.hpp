```cpp
#ifndef MLTOOLKIT_SCALER_HPP
#define MLTOOLKIT_SCALER_HPP

#include <Eigen/Dense>
#include <nlohmann/json.hpp>
#include "../../common/Exceptions.hpp"
#include "../../common/Logger.hpp"
#include "../core/MatrixUtils.hpp" // For MatrixXd

namespace MLToolkit {
namespace MLUtils {
namespace Preprocessing {

// Base class for scalers
class Scaler {
public:
    virtual ~Scaler() = default;

    // Fit the scaler to data (learn parameters like min/max or mean/std)
    virtual void fit(const Core::MatrixXd& X) = 0;

    // Transform data using learned parameters
    virtual Core::MatrixXd transform(const Core::MatrixXd& X) const = 0;

    // Fit and then transform data
    virtual Core::MatrixXd fit_transform(const Core::MatrixXd& X) {
        fit(X);
        return transform(X);
    }

    // Inverse transform data (undo scaling)
    virtual Core::MatrixXd inverse_transform(const Core::MatrixXd& X_scaled) const = 0;

    // Serialize scaler parameters to JSON
    virtual nlohmann::json to_json() const = 0;

    // Deserialize scaler parameters from JSON
    virtual void from_json(const nlohmann::json& j) = 0;

    // Factory method to create scaler from JSON
    static std::unique_ptr<Scaler> create_from_json(const nlohmann::json& j);
};

// MinMaxScaler scales features to a given range (default 0-1)
class MinMaxScaler : public Scaler {
public:
    explicit MinMaxScaler(double feature_min = 0.0, double feature_max = 1.0);

    void fit(const Core::MatrixXd& X) override;
    Core::MatrixXd transform(const Core::MatrixXd& X) const override;
    Core::MatrixXd inverse_transform(const Core::MatrixXd& X_scaled) const override;

    nlohmann::json to_json() const override;
    void from_json(const nlohmann::json& j) override;

private:
    double feature_min_;
    double feature_max_;
    Core::VectorXd data_min_; // Minimum value for each feature column
    Core::VectorXd data_max_; // Maximum value for each feature column
    Core::VectorXd data_range_; // data_max_ - data_min_
    bool fitted_ = false;
};

// StandardScaler scales features to have zero mean and unit variance
class StandardScaler : public Scaler {
public:
    StandardScaler();

    void fit(const Core::MatrixXd& X) override;
    Core::MatrixXd transform(const Core::MatrixXd& X) const override;
    Core::MatrixXd inverse_transform(const Core::MatrixXd& X_scaled) const override;

    nlohmann::json to_json() const override;
    void from_json(const nlohmann::json& j) override;

private:
    Core::VectorXd mean_; // Mean of each feature column
    Core::VectorXd std_dev_; // Standard deviation of each feature column
    bool fitted_ = false;
};

} // namespace Preprocessing
} // namespace MLUtils
} // namespace MLToolkit

#endif // MLTOOLKIT_SCALER_H```