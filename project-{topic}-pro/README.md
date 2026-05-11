securestore/
├── .github/
│   └── workflows/
│       └── ci.yml
├── alembic/
│   ├── versions/
│   ├── env.py
│   └── script.py.mako
├── app/
│   ├── api/
│   │   ├── deps.py
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── auth.py
│   │       │   ├── users.py
│   │       │   ├── products.py
│   │       │   └── audit_logs.py
│   │       └── api.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   ├── exceptions.py
│   │   ├── middlewares.py
│   │   └── logging_config.py
│   ├── crud/
│   │   ├── base.py
│   │   ├── user.py
│   │   ├── product.py
│   │   └── audit_log.py
│   ├── db/
│   │   ├── base.py
│   │   ├── session.py
│   │   └── init_db.py
│   ├── models/
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── role.py
│   │   └── audit_log.py
│   ├── schemas/
│   │   ├── token.py
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── role.py
│   │   └── audit_log.py
│   ├── static/
│   │   ├── css/
│   │   │   └── style.css
│   │   └── js/
│   │       └── script.js
│   ├── templates/
│   │   └── index.html
│   └── main.py
├── tests/
│   ├── unit/
│   │   ├── test_security.py
│   │   └── test_crud_base.py
│   ├── integration/
│   │   ├── test_auth_api.py
│   │   ├── test_users_api.py
│   │   └── test_products_api.py
│   └── performance/
│       └── locustfile.py
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── alembic.ini
├── README.md
├── ARCHITECTURE.md
├── DEPLOYMENT.md
├── API_DOCS.md