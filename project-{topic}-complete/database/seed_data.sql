```sql
-- Seed Data for ML-Toolkit: Enterprise ML Utilities System

-- Insert Sample Datasets
INSERT INTO datasets (name, description, file_path, row_count, col_count, feature_names, metadata) VALUES
('housing_prices_raw', 'Raw dataset for predicting housing prices in California.', 's3://ml-toolkit-data/housing/raw/california_housing.csv', 20640, 9, ARRAY['MedInc', 'HouseAge', 'AveRooms', 'AveBedrms', 'Population', 'AveOccup', 'Latitude', 'Longitude', 'MedHouseVal'], '{"source": "sklearn.datasets", "license": "BSD-3-Clause"}'::jsonb)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    file_path = EXCLUDED.file_path,
    row_count = EXCLUDED.row_count,
    col_count = EXCLUDED.col_count,
    feature_names = EXCLUDED.feature_names,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

INSERT INTO datasets (name, description, file_path, row_count, col_count, feature_names, metadata) VALUES
('iris_flower_data', 'Classic iris flower dataset for classification tasks.', 's3://ml-toolkit-data/iris/iris.csv', 150, 4, ARRAY['sepal_length', 'sepal_width', 'petal_length', 'petal_width'], '{"source": "sklearn.datasets", "target_name": "species"}'::jsonb)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    file_path = EXCLUDED.file_path,
    row_count = EXCLUDED.row_count,
    col_count = EXCLUDED.col_count,
    feature_names = EXCLUDED.feature_names,
    metadata = EXCLUDED.metadata,
    updated_at = NOW();

-- Retrieve Dataset IDs for foreign key references
DO $$
DECLARE
    housing_id BIGINT;
    iris_id BIGINT;
BEGIN
    SELECT id INTO housing_id FROM datasets WHERE name = 'housing_prices_raw';
    SELECT id INTO iris_id FROM datasets WHERE name = 'iris_flower_data';

    -- Insert Sample Models
    INSERT INTO models (name, description, type, artifact_path, dataset_id, metadata) VALUES
    ('linear_regression_v1', 'First version of linear regression model for housing prices.', 'LINEAR_REGRESSION', 's3://ml-toolkit-artifacts/models/housing/lr_v1.pkl', housing_id, '{"hyperparams": {"learning_rate": 0.01, "epochs": 100}, "metrics": {"rmse": 0.7, "r2": 0.65}}'::jsonb)
    ON CONFLICT (name) DO UPDATE SET
        description = EXCLUDED.description,
        type = EXCLUDED.type,
        artifact_path = EXCLUDED.artifact_path,
        dataset_id = EXCLUDED.dataset_id,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();

    INSERT INTO models (name, description, type, artifact_path, dataset_id, metadata) VALUES
    ('iris_kmeans_clusterer', 'K-Means clustering model for iris dataset.', 'KMEANS', 's3://ml-toolkit-artifacts/models/iris/kmeans_k3.pkl', iris_id, '{"hyperparams": {"n_clusters": 3, "init": "k-means++"}, "metrics": {"inertia": 78.9}}'::jsonb)
    ON CONFLICT (name) DO UPDATE SET
        description = EXCLUDED.description,
        type = EXCLUDED.type,
        artifact_path = EXCLUDED.artifact_path,
        dataset_id = EXCLUDED.dataset_id,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();

    -- Insert Sample Pipelines
    INSERT INTO pipelines (name, description, dataset_id, steps, metadata) VALUES
    ('housing_preprocessing_pipeline', 'Pipeline for scaling and imputing housing data.', housing_id,
     '[
         {"name": "MinMaxScaler", "params": {"feature_min": 0, "feature_max": 1}},
         {"name": "MeanImputer", "params": {}}
     ]'::jsonb, '{}'::jsonb)
    ON CONFLICT (name) DO UPDATE SET
        description = EXCLUDED.description,
        dataset_id = EXCLUDED.dataset_id,
        steps = EXCLUDED.steps,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();

    INSERT INTO pipelines (name, description, dataset_id, steps, metadata) VALUES
    ('iris_feature_engineering_pipeline', 'Pipeline for creating polynomial features for iris data.', iris_id,
     '[
         {"name": "PolynomialFeatures", "params": {"degree": 2, "include_bias": true}}
     ]'::jsonb, '{}'::jsonb)
    ON CONFLICT (name) DO UPDATE SET
        description = EXCLUDED.description,
        dataset_id = EXCLUDED.dataset_id,
        steps = EXCLUDED.steps,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();
END $$;
```