```sql
-- V1__init.sql

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_id, role),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE models (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

CREATE TABLE model_versions (
    id BIGSERIAL PRIMARY KEY,
    model_id BIGINT NOT NULL,
    version_number VARCHAR(255) NOT NULL,
    model_path TEXT NOT NULL,
    metadata TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    CONSTRAINT fk_model
        FOREIGN KEY (model_id)
        REFERENCES models (id) ON DELETE CASCADE,
    UNIQUE (model_id, version_number)
);

-- Indexing for performance
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_models_name ON models (name);
CREATE INDEX idx_model_versions_model_id ON model_versions (model_id);
CREATE INDEX idx_model_versions_is_default ON model_versions (is_default);
```