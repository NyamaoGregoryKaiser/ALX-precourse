```cpp
#include "MLProcessor.hpp"
#include <stdexcept>
#include <string>

namespace MLToolkit {
namespace MLUtils {

MLProcessor::MLProcessor() {
    LOG_INFO("MLProcessor initialized.");
}

Core::MatrixXd MLProcessor::apply_preprocessing(
    const Core::MatrixXd& X, 
    const Database::Models::PipelineStep& step_config,
    nlohmann::json& pipeline_metadata) {
    
    LOG_DEBUG("Applying preprocessing step: {}", step_config.name);
    Core::MatrixXd X_processed = X;

    if (step_config.name == "MinMaxScaler") {
        Preprocessing::MinMaxScaler scaler;
        if (pipeline_metadata.contains(step_config.name)) {
            scaler.from_json(pipeline_metadata.at(step_config.name));
            X_processed = scaler.transform(X);
        } else {
            // Fit and store parameters
            scaler.fit(X);
            X_processed = scaler.transform(X);
            pipeline_metadata[step_config.name] = scaler.to_json();
            LOG_DEBUG("MinMaxScaler fitted and parameters stored in pipeline metadata.");
        }
    } else if (step_config.name == "StandardScaler") {
        Preprocessing::StandardScaler scaler;
        if (pipeline_metadata.contains(step_config.name)) {
            scaler.from_json(pipeline_metadata.at(step_config.name));
            X_processed = scaler.transform(X);
        } else {
            // Fit and store parameters
            scaler.fit(X);
            X_processed = scaler.transform(X);
            pipeline_metadata[step_config.name] = scaler.to_json();
            LOG_DEBUG("StandardScaler fitted and parameters stored in pipeline metadata.");
        }
    } else if (step_config.name == "MeanImputer") {
        Preprocessing::Imputer imputer(Preprocessing::ImputationStrategy::MEAN);
        // For imputation, we need to know where the NaNs are. This typically comes from parsing
        // the original data. For this example, we'll assume a dummy mask or that data is pre-cleaned.
        // A real-world scenario would pass a mask or use NaN representations directly in Eigen.
        // Eigen's `isnan` can be used directly for double types.
        std::vector<bool> nan_mask(X.rows() * X.cols(), false); // Assume no NaNs for demo purposes

        // In a real scenario, you'd parse `step_config.params` for constant value or specific columns
        // and detect NaNs in X
        for (long r = 0; r < X.rows(); ++r) {
            for (long c = 0; c < X.cols(); ++c) {
                if (std::isnan(X(r, c))) {
                    nan_mask[r * X.cols() + c] = true;
                }
            }
        }

        if (pipeline_metadata.contains(step_config.name)) {
            imputer.from_json(pipeline_metadata.at(step_config.name));
            X_processed = imputer.transform(X, nan_mask);
        } else {
            imputer.fit(X, nan_mask);
            X_processed = imputer.transform(X, nan_mask);
            pipeline_metadata[step_config.name] = imputer.to_json();
            LOG_DEBUG("MeanImputer fitted and parameters stored in pipeline metadata.");
        }
    } else {
        throw Common::MLUtilityException("Unknown preprocessing step: " + step_config.name);
    }
    return X_processed;
}

Core::MatrixXd MLProcessor::apply_feature_engineering(
    const Core::MatrixXd& X,
    const Database::Models::PipelineStep& step_config) {
    
    LOG_DEBUG("Applying feature engineering step: {}", step_config.name);
    Core::MatrixXd X_transformed = X;

    if (step_config.name == "PolynomialFeatures") {
        int degree = step_config.params.contains("degree") ? step_config.params.at("degree").get<int>() : 2;
        bool include_bias = step_config.params.contains("include_bias") ? step_config.params.at("include_bias").get<bool>() : true;
        Features::PolynomialFeatures poly_transformer(degree, include_bias);
        X_transformed = poly_transformer.transform(X);
    } else {
        throw Common::MLUtilityException("Unknown feature engineering step: " + step_config.name);
    }
    return X_transformed;
}

Core::MatrixXd MLProcessor::execute_pipeline(
    const Core::MatrixXd& X_raw,
    Database::Models::Pipeline& pipeline_def) { // Modifies metadata
    
    LOG_INFO("Executing pipeline '{}' (ID: {}).", pipeline_def.name, pipeline_def.id);
    Core::MatrixXd current_X = X_raw;

    // Ensure pipeline_def.metadata is an object
    if (!pipeline_def.metadata.is_object()) {
        pipeline_def.metadata = nlohmann::json::object();
    }

    for (const auto& step : pipeline_def.steps) {
        if (step.name == "MinMaxScaler" || step.name == "StandardScaler" || step.name == "MeanImputer") {
            current_X = apply_preprocessing(current_X, step, pipeline_def.metadata);
        } else if (step.name == "PolynomialFeatures") {
            current_X = apply_feature_engineering(current_X, step);
        } else {
            LOG_ERROR("Unknown pipeline step encountered: {}. Skipping.", step.name);
            throw Common::MLUtilityException("Unknown pipeline step: " + step.name);
        }
    }
    LOG_INFO("Pipeline '{}' execution complete. Output dimensions: {}x{}.", pipeline_def.name, current_X.rows(), current_X.cols());
    return current_X;
}

nlohmann::json MLProcessor::evaluate_regression_model(
    const Core::VectorXd& y_true,
    const Core::VectorXd& y_pred) {
    
    LOG_INFO("Evaluating regression model with {} samples.", y_true.size());
    return Evaluation::calculate_regression_metrics(y_true, y_pred);
}

Core::VectorXd MLProcessor::predict(const Core::MatrixXd& X_processed, long model_id) {
    LOG_WARN("Model prediction is a placeholder. No actual model loading/inference implemented.");
    // In a real system, you would:
    // 1. Load the model artifact using model_id from DBManager.
    // 2. Deserialize the model (e.g., weights, architecture).
    // 3. Perform inference using X_processed.
    // For now, return a dummy prediction.
    if (X_processed.rows() == 0) {
        throw Common::InvalidArgumentException("Input data for prediction cannot be empty.");
    }
    return Core::VectorXd::Constant(X_processed.rows(), 0.5); // Dummy prediction
}

std::vector<std::string> MLProcessor::get_feature_names(long num_features, const std::vector<std::string>& base_names) {
    std::vector<std::string> names;
    if (!base_names.empty()) {
        names = base_names;
    } else {
        for (long i = 0; i < num_features; ++i) {
            names.push_back("feature_" + std::to_string(i));
        }
    }
    return names;
}

} // namespace MLUtils
} // namespace MLToolkit
```