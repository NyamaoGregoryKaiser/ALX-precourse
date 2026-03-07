```sql
-- V2__Seed_data.sql

-- Insert default roles if they don't exist
INSERT INTO roles (name) VALUES ('USER') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('ADMIN') ON CONFLICT (name) DO NOTHING;

-- Insert a default admin user if they don't exist
-- Password is 'admin123' (bcrypt encoded)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin') THEN
        INSERT INTO users (username, email, password) VALUES
        ('admin', 'admin@example.com', '$2a$10$wK8y/xG.JgW/v.H/xR/7xO/zK/9xO.H/c/p/2z/g/e/w/j/h/0/n/r/m/1/v/u/l/k/i/t/e/d/b/a/c/f/o/s/q/y/x/p/m/n/r/t/u/v/w/x/y/z/A/B/C/D/E/F/G/H/I/J/K/L/M/N/O/P/Q/R/S/T/U/V/W/X/Y/Z/0/1/2/3/4/5/6/7/8/9.w');
    END IF;
END $$;

-- Assign ADMIN role to the admin user
INSERT INTO users_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'ADMIN'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Insert a default regular user if they don't exist
-- Password is 'user123' (bcrypt encoded)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'testuser') THEN
        INSERT INTO users (username, email, password) VALUES
        ('testuser', 'testuser@example.com', '$2a$10$tJ0sX/Y.JgW/v.H/xR/7xO/zK/9xO.H/c/p/2z/g/e/w/j/h/0/n/r/m/1/v/u/l/k/i/t/e/d/b/a/c/f/o/s/q/y/x/p/m/n/r/t/u/v/w/x/y/z/A/B/C/D/E/F/G/H/I/J/K/L/M/N/O/P/Q/R/S/T/U/V/W/X/Y/Z/0/1/2/3/4/5/6/7/8/9.y');
    END IF;
END $$;

-- Assign USER role to the testuser
INSERT INTO users_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'testuser' AND r.name = 'USER'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Get the ID of the admin user for seeding other data
SELECT id INTO TEMP TABLE admin_user_id FROM users WHERE username = 'admin';

-- Insert sample Experiments
INSERT INTO experiments (name, description, status, objective, created_by_user_id) VALUES
('Iris Species Classification', 'Experiment to classify Iris species using various ML algorithms.', 'COMPLETED', 'Achieve >95% accuracy on Iris dataset.', (SELECT id FROM admin_user_id)),
('Customer Churn Prediction', 'Predict customer churn for a telecom company.', 'RUNNING', 'Increase churn prediction accuracy to 80%.', (SELECT id FROM admin_user_id))
ON CONFLICT (name) DO NOTHING;

-- Insert sample Datasets
INSERT INTO datasets (name, version, source_uri, description, size_mb, row_count, format, created_by_user_id) VALUES
('Iris Dataset', '1.0', 'https://archive.ics.uci.edu/ml/datasets/iris', 'Classic Iris flower dataset.', 1, 150, 'CSV', (SELECT id FROM admin_user_id)),
('Telecom Churn Dataset', '2.1', 's3://my-ml-bucket/telecom/churn_v2.1.parquet', 'Anonymized telecom customer data with churn labels.', 500, 100000, 'Parquet', (SELECT id FROM admin_user_id))
ON CONFLICT (name, version) DO NOTHING;

-- Get IDs for linking
SELECT id INTO TEMP TABLE iris_exp_id FROM experiments WHERE name = 'Iris Species Classification';
SELECT id INTO TEMP TABLE churn_exp_id FROM experiments WHERE name = 'Customer Churn Prediction';
SELECT id INTO TEMP TABLE iris_ds_id FROM datasets WHERE name = 'Iris Dataset' AND version = '1.0';
SELECT id INTO TEMP TABLE churn_ds_id FROM datasets WHERE name = 'Telecom Churn Dataset' AND version = '2.1';

-- Insert sample Feature Sets
INSERT INTO feature_sets (name, version, description, source_dataset_id, transformation_code_uri, created_by_user_id) VALUES
('Iris Sepal & Petal Features', '1.0', 'Sepal length, sepal width, petal length, petal width.', (SELECT id FROM iris_ds_id), 'github.com/myorg/iris-features/feature_eng.py', (SELECT id FROM admin_user_id)),
('Telecom Churn Engineered Features', '2.1.1', 'Features derived from customer call patterns, data usage, and billing info.', (SELECT id FROM churn_ds_id), 's3://my-ml-bucket/telecom/feature_eng_code_v2.1.py', (SELECT id FROM admin_user_id))
ON CONFLICT (name, version) DO NOTHING;

-- Get IDs for linking
SELECT id INTO TEMP TABLE iris_fs_id FROM feature_sets WHERE name = 'Iris Sepal & Petal Features' AND version = '1.0';
SELECT id INTO TEMP TABLE churn_fs_id FROM feature_sets WHERE name = 'Telecom Churn Engineered Features' AND version = '2.1.1';

-- Insert sample Models
INSERT INTO models (name, version, experiment_id, dataset_id, feature_set_id, model_uri, framework, accuracy, f1_score, precision_score, recall_score, created_by_user_id) VALUES
('Logistic Regression Iris', '1.0', (SELECT id FROM iris_exp_id), (SELECT id FROM iris_ds_id), (SELECT id FROM iris_fs_id), 's3://my-ml-bucket/iris/lr_model_v1.0.pkl', 'Scikit-learn', 0.9667, 0.9667, 0.9667, 0.9667, (SELECT id FROM admin_user_id)),
('Random Forest Iris', '1.1', (SELECT id FROM iris_exp_id), (SELECT id FROM iris_ds_id), (SELECT id FROM iris_fs_id), 's3://my-ml-bucket/iris/rf_model_v1.1.pkl', 'Scikit-learn', 0.9733, 0.9733, 0.9733, 0.9733, (SELECT id FROM admin_user_id)),
('XGBoost Churn', '1.0', (SELECT id FROM churn_exp_id), (SELECT id FROM churn_ds_id), (SELECT id FROM churn_fs_id), 's3://my-ml-bucket/telecom/xgboost_churn_v1.0.json', 'XGBoost', 0.8120, 0.7850, 0.8200, 0.7500, (SELECT id FROM admin_user_id))
ON CONFLICT (name, version) DO NOTHING;

-- Clean up temporary tables
DROP TABLE IF EXISTS admin_user_id;
DROP TABLE IF EXISTS iris_exp_id;
DROP TABLE IF EXISTS churn_exp_id;
DROP TABLE IF EXISTS iris_ds_id;
DROP TABLE IF EXISTS churn_ds_id;
DROP TABLE IF EXISTS iris_fs_id;
DROP TABLE IF EXISTS churn_fs_id;
```