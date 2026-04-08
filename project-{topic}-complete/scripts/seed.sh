```bash
#!/bin/bash
# scripts/seed.sh
# Seeds initial data into the DB-Optimizer's database.

set -e

DB_HOST=${DB_OPTIMIZER_DB_HOST:-localhost}
DB_PORT=${DB_OPTIMIZER_DB_PORT:-5432}
DB_NAME=${DB_OPTIMIZER_DB_NAME:-db_optimizer_db}
DB_USER=${DB_OPTIMIZER_DB_USER:-db_optimizer_user}
DB_PASSWORD=${DB_OPTIMIZER_DB_PASSWORD:-db_optimizer_password}

echo "Seeding initial data into ${DB_NAME} on ${DB_HOST}:${DB_PORT}..."

# Generate a password hash for an admin user (replace with a real hashing mechanism in production)
# For simplicity in seeding, we'll use a placeholder and expect the AuthService to handle real hashing
ADMIN_PASSWORD_HASH='$2a$10$A5jK0v2hY.y7t9X.q1q3c.r.K.p.f.G.q.w.x.y.z.w.e.a.t.Q.' # Placeholder hash for "adminpass"
# In a real system, you'd run a C++ utility to hash the password.
# For demo purposes, the AuthController will hash the actual password during registration.
# This script is more for pre-populating with already hashed values or simple data.

# Check if admin user already exists to prevent duplicates
ADMIN_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM users WHERE email = 'admin@example.com';")

if [ "$ADMIN_EXISTS" -eq "0" ]; then
  echo "Adding default admin user (admin@example.com/adminpass)..."
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME <<EOF
    INSERT INTO users (username, email, password_hash, role)
    VALUES ('admin', 'admin@example.com', '$ADMIN_PASSWORD_HASH', 'admin')
    ON CONFLICT (email) DO NOTHING;
EOF
else
  echo "Admin user 'admin@example.com' already exists. Skipping."
fi

echo "Initial data seeding complete."
```