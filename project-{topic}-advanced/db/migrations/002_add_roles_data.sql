-- Insert default roles if they don't exist
INSERT INTO roles (name, description) VALUES
    ('admin', 'Administrator role with full access')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES
    ('user', 'Standard user role with basic access')
ON CONFLICT (name) DO NOTHING;
```