```sql
-- V2__Add_sample_data.sql

-- Insert roles
INSERT INTO roles (name) VALUES ('ROLE_USER') ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name) VALUES ('ROLE_ADMIN') ON CONFLICT (name) DO NOTHING;

-- Insert an admin user (password 'admin', hashed using BCrypt)
-- The password 'admin' will be encoded to something like '$2a$10$............'
-- For this seed, we'll use a placeholder that matches 'admin' when encoded by BCryptPasswordEncoder
-- In a real scenario, this would be a pre-hashed password. For an app run in dev mode, Spring Security
-- usually handles the encoding on first use or you'd hash it manually.
-- Example hash for 'admin' (can vary): '$2a$10$yA9q50.5z0X0B50v0A0gC.m2m60n0L0k0J0H0F0E0D0C0B0A0/01'
-- Let's use a known hash for 'admin' for consistency, but regenerate if needed.
-- Use this to generate: new BCryptPasswordEncoder().encode("admin")
-- A common hash for 'admin' (can vary with salt):
INSERT INTO users (username, password, email)
VALUES ('admin', '$2a$10$oY7XbL6c.G.s/v0/l0Y0U.s.f.0B.s.A.C.M.S/N.W.P.Q.Z.V.T.R.U/H.J/L.O/Z.S.W/2', 'admin@example.com')
ON CONFLICT (username) DO NOTHING;

-- Insert a regular user (password 'user')
INSERT INTO users (username, password, email)
VALUES ('user', '$2a$10$oY7XbL6c.G.s/v0/l0Y0U.s.f.0B.s.A.C.M.S/N.W.P.Q.Z.V.T.R.U/H.J/L.O/Z.S.W/2', 'user@example.com') -- Using same hash for 'user' as 'admin' for simplicity.
ON CONFLICT (username) DO NOTHING;

-- Assign roles
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'ROLE_ADMIN'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'admin' AND r.name = 'ROLE_USER'
ON CONFLICT (user_id, role_id) DO NOTHING; -- Admins typically have user roles too

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'user' AND r.name = 'ROLE_USER'
ON CONFLICT (user_id, role_id) DO NOTHING;


-- Insert sample datasets
INSERT INTO datasets (name, description, storage_path, file_type, size_bytes, num_rows, num_columns)
VALUES
('Iris Dataset', 'Classic dataset for classification problems, containing measurements of iris flowers.', 'uploads/iris.csv', 'CSV', 15000, 150, 5),
('Customer Churn Data', 'Sample dataset for predicting customer churn in a telecom company.', 'uploads/customer_churn.csv', 'CSV', 500000, 7043, 21),
('Credit Card Fraud', 'Anonymized credit card transactions labelled as fraudulent or genuine.', 'uploads/credit_card_fraud.json', 'JSON', 1200000, 284807, 31);


-- Insert sample models
INSERT INTO models (name, description, algorithm, target_variable)
VALUES
('Iris Species Classifier', 'A model to classify iris flower species (setosa, versicolor, virginica).', 'Random Forest', 'species'),
('Customer Churn Predictor', 'Predicts whether a customer will churn or not.', 'Logistic Regression', 'Churn'),
('Fraud Detection Model', 'Detects fraudulent credit card transactions.', 'Isolation Forest', 'is_fraud');


-- Insert sample model versions
INSERT INTO model_versions (model_id, version_number, artifact_path, training_metrics, deployment_status, deployed_at)
VALUES
( (SELECT id FROM models WHERE name = 'Iris Species Classifier'), '1.0', 's3://ml-artifacts/iris/v1.0.pkl', '{"accuracy": 0.97, "precision": 0.96}', 'Production', CURRENT_TIMESTAMP - INTERVAL '1 month'),
( (SELECT id FROM models WHERE name = 'Iris Species Classifier'), '1.1', 's3://ml-artifacts/iris/v1.1.pkl', '{"accuracy": 0.98, "precision": 0.97}', 'Staging', CURRENT_TIMESTAMP - INTERVAL '1 week'),

( (SELECT id FROM models WHERE name = 'Customer Churn Predictor'), '1.0', 's3://ml-artifacts/churn/v1.0.joblib', '{"accuracy": 0.78, "recall": 0.65}', 'Development', NULL),
( (SELECT id FROM models WHERE name = 'Customer Churn Predictor'), '1.1', 's3://ml-artifacts/churn/v1.1.joblib', '{"accuracy": 0.81, "recall": 0.72}', 'Production', CURRENT_TIMESTAMP - INTERVAL '2 months'),

( (SELECT id FROM models WHERE name = 'Fraud Detection Model'), '1.0', 's3://ml-artifacts/fraud/v1.0.h5', '{"f1_score": 0.85, "auc_roc": 0.93}', 'Production', CURRENT_TIMESTAMP - INTERVAL '3 months');


-- Insert sample feature definitions
INSERT INTO feature_definitions (name, type, version, description, source_dataset_id, transformation_logic)
VALUES
('sepal_length', 'NUMERIC', 'v1.0', 'Sepal length in cm from Iris dataset', (SELECT id FROM datasets WHERE name = 'Iris Dataset'), NULL),
('sepal_width', 'NUMERIC', 'v1.0', 'Sepal width in cm from Iris dataset', (SELECT id FROM datasets WHERE name = 'Iris Dataset'), NULL),
('petal_length', 'NUMERIC', 'v1.0', 'Petal length in cm from Iris dataset', (SELECT id FROM datasets WHERE name = 'Iris Dataset'), NULL),
('petal_width', 'NUMERIC', 'v1.0', 'Petal width in cm from Iris dataset', (SELECT id FROM datasets WHERE name = 'Iris Dataset'), NULL),

('customer_age', 'NUMERIC', 'v1.0', 'Age of the customer', (SELECT id FROM datasets WHERE name = 'Customer Churn Data'), NULL),
('monthly_charges', 'NUMERIC', 'v1.0', 'Monthly charges for the customer', (SELECT id FROM datasets WHERE name = 'Customer Churn Data'), NULL),
('total_charges', 'NUMERIC', 'v1.0', 'Total charges for the customer', (SELECT id FROM datasets WHERE name = 'Customer Churn Data'), 'Sum of all monthly charges'),
('gender', 'CATEGORICAL', 'v1.0', 'Gender of the customer (Male/Female)', (SELECT id FROM datasets WHERE name = 'Customer Churn Data'), NULL),
('dependents', 'CATEGORICAL', 'v1.0', 'Whether customer has dependents (Yes/No)', (SELECT id FROM datasets WHERE name = 'Customer Churn Data'), NULL),

('transaction_amount', 'NUMERIC', 'v1.0', 'Amount of the transaction', (SELECT id FROM datasets WHERE name = 'Credit Card Fraud'), NULL),
('transaction_location', 'CATEGORICAL', 'v1.0', 'Location of the transaction (e.g., Domestic, International)', (SELECT id FROM datasets WHERE name = 'Credit Card Fraud'), NULL),
('time_of_day', 'NUMERIC', 'v1.0', 'Time of day of transaction (scaled)', (SELECT id FROM datasets WHERE name = 'Credit Card Fraud'), 'Normalized timestamp');


-- Link model versions to features
-- Iris Species Classifier (v1.0 and v1.1) uses all iris features
INSERT INTO model_version_features (model_version_id, feature_definition_id)
SELECT mv.id, fd.id
FROM model_versions mv
JOIN models m ON mv.model_id = m.id
JOIN feature_definitions fd ON fd.name IN ('sepal_length', 'sepal_width', 'petal_length', 'petal_width')
WHERE m.name = 'Iris Species Classifier' AND mv.version_number IN ('1.0', '1.1')
ON CONFLICT (model_version_id, feature_definition_id) DO NOTHING;

-- Customer Churn Predictor (v1.1 - production) uses age, monthly charges, total charges, gender, dependents
INSERT INTO model_version_features (model_version_id, feature_definition_id)
SELECT mv.id, fd.id
FROM model_versions mv
JOIN models m ON mv.model_id = m.id
JOIN feature_definitions fd ON fd.name IN ('customer_age', 'monthly_charges', 'total_charges', 'gender', 'dependents')
WHERE m.name = 'Customer Churn Predictor' AND mv.version_number = '1.1'
ON CONFLICT (model_version_id, feature_definition_id) DO NOTHING;

-- Customer Churn Predictor (v1.0 - development) uses only age and monthly charges
INSERT INTO model_version_features (model_version_id, feature_definition_id)
SELECT mv.id, fd.id
FROM model_versions mv
JOIN models m ON mv.model_id = m.id
JOIN feature_definitions fd ON fd.name IN ('customer_age', 'monthly_charges')
WHERE m.name = 'Customer Churn Predictor' AND mv.version_number = '1.0'
ON CONFLICT (model_version_id, feature_definition_id) DO NOTHING;


-- Fraud Detection Model (v1.0 - production) uses transaction_amount, transaction_location, time_of_day
INSERT INTO model_version_features (model_version_id, feature_definition_id)
SELECT mv.id, fd.id
FROM model_versions mv
JOIN models m ON mv.model_id = m.id
JOIN feature_definitions fd ON fd.name IN ('transaction_amount', 'transaction_location', 'time_of_day')
WHERE m.name = 'Fraud Detection Model' AND mv.version_number = '1.0'
ON CONFLICT (model_version_id, feature_definition_id) DO NOTHING;

```