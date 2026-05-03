```cpp
#ifndef MLTOOLKIT_MLPROCESSOR_HPP
#define MLTOOLKIT_MLPROCESSOR_HPP

#include <string>
#include <vector>
#include <memory>
#include <nlohmann/json.hpp>

#include "preprocessing/Scaler.hpp"
#include "preprocessing/Imputer.hpp"
#include "features/FeatureExtractor.hpp"
#include "evaluation/Metrics.hpp"
#include "core/MatrixUtils.hpp"
#include "../database/models/Pipeline.hpp"
#include "../common/Exceptions.hpp"
#include "../common/Logger.hpp"

namespace MLToolkit {
namespace MLUtils {

class MLProcessor {
public:
    MLProcessor();
    ~MLProcessor() = default;

    // Apply a specific preprocessing step
    Core::MatrixXd apply_preprocessing(
        const Core::MatrixXd& X, 
        const Database::Models::PipelineStep& step_config,
        nlohmann::json& pipeline_metadata // To store fitted params
    );

    // Apply a specific feature engineering step
    Core::MatrixXd apply_feature_engineering(
        const Core::MatrixXd& X,
        const Database::Models::PipelineStep& step_config
    );

    // Execute a full pipeline
    Core::MatrixXd execute_pipeline(
        const Core::MatrixXd& X_raw,
        Database::Models::Pipeline& pipeline_def // Modifies metadata with fitted params
    );

    // Evaluate predictions against true values
    nlohmann::json evaluate_regression_model(
        const Core::VectorXd& y_true,
        const Core::VectorXd& y_pred
    );

    // Placeholder for model inference (e.g., apply a loaded model)
    Core::VectorXd predict(const Core::MatrixXd& X_processed, long model_id);


private:
    // Helper to extract feature names (if available) or generate defaults
    std::vector<std::string> get_feature_names(long num_features, const std::vector<std::string>& base_names = {});
};

} // namespace MLUtils
} // namespace MLToolkit

#endif // MLTOOLKIT_MLPROCESSOR_HPP
```