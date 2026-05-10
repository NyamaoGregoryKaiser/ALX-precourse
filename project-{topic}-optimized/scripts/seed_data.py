import asyncio
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import SessionLocal, engine, Base
from app.crud.user import crud_user
from app.crud.service import crud_service
from app.crud.metric_type import crud_metric_type
from app.crud.alert_rule import crud_alert_rule
from app.schemas.user import UserCreate
from app.schemas.service import ServiceCreate
from app.schemas.metric_type import MetricTypeCreate
from app.schemas.alert_rule import AlertRuleCreate
from app.core.config import settings
from app.core.logger import logger

async def init_db(session: AsyncSession):
    """
    Ensure all tables are created.
    """
    logger.info("Initializing database schema (creating tables if not exist)...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database schema initialized.")

async def seed_data():
    """
    Seeds the database with initial users, services, metric types, and alert rules.
    """
    logger.info("Starting database seeding...")
    async with SessionLocal() as session:
        # Create superuser
        user = await crud_user.get_by_email(session, email=settings.FIRST_SUPERUSER_EMAIL)
        if not user:
            user_in = UserCreate(
                email=settings.FIRST_SUPERUSER_EMAIL,
                password=settings.FIRST_SUPERUSER_PASSWORD,
                full_name="Admin User",
                is_active=True,
                is_admin=True,
            )
            user = await crud_user.create(session, obj_in=user_in)
            logger.info(f"Created superuser: {user.email}")
        else:
            logger.info(f"Superuser '{user.email}' already exists.")

        # Create services
        service_names = ["WebApp Frontend", "Backend API", "Database Service", "Microservice X"]
        services = []
        for name in service_names:
            service = await crud_service.get_by_name(session, name=name)
            if not service:
                service_in = ServiceCreate(name=name, description=f"Monitors the performance of {name}.", is_active=True)
                service = await crud_service.create(session, obj_in=service_in)
                logger.info(f"Created service: {service.name}")
            else:
                logger.info(f"Service '{service.name}' already exists.")
            services.append(service)

        # Create metric types
        metric_types_data = [
            {"name": "CPU_USAGE", "unit": "%"},
            {"name": "MEMORY_USAGE", "unit": "%"},
            {"name": "LATENCY", "unit": "ms"},
            {"name": "ERROR_RATE", "unit": "count/min"},
            {"name": "DISK_IOPS", "unit": "ops/s"},
        ]
        metric_types = []
        for mt_data in metric_types_data:
            metric_type = await crud_metric_type.get_by_name(session, name=mt_data["name"])
            if not metric_type:
                metric_type_in = MetricTypeCreate(name=mt_data["name"], unit=mt_data["unit"])
                metric_type = await crud_metric_type.create(session, obj_in=metric_type_in)
                logger.info(f"Created metric type: {metric_type.name}")
            else:
                logger.info(f"Metric type '{metric_type.name}' already exists.")
            metric_types.append(metric_type)

        # Create alert rules
        if services and metric_types:
            cpu_metric_type = next((mt for mt in metric_types if mt.name == "CPU_USAGE"), None)
            latency_metric_type = next((mt for mt in metric_types if mt.name == "LATENCY"), None)

            if cpu_metric_type and services[0]: # WebApp Frontend CPU
                rule = await crud_alert_rule.get_multi_filtered(session, filters={"service_id": services[0].id, "metric_type_id": cpu_metric_type.id, "condition": "value > 80.0"})
                if not rule:
                    alert_rule_in = AlertRuleCreate(
                        service_id=services[0].id,
                        metric_type_id=cpu_metric_type.id,
                        condition="value > 80.0",
                        threshold_value="80.0",
                        description=f"High CPU usage on {services[0].name}",
                        is_active=True
                    )
                    await crud_alert_rule.create(session, obj_in=alert_rule_in)
                    logger.info(f"Created alert rule: {alert_rule_in.description}")
                else:
                    logger.info(f"Alert rule 'High CPU on {services[0].name}' already exists.")

            if latency_metric_type and services[1]: # Backend API Latency
                rule = await crud_alert_rule.get_multi_filtered(session, filters={"service_id": services[1].id, "metric_type_id": latency_metric_type.id, "condition": "value > 150.0"})
                if not rule:
                    alert_rule_in = AlertRuleCreate(
                        service_id=services[1].id,
                        metric_type_id=latency_metric_type.id,
                        condition="value > 150.0",
                        threshold_value="150.0",
                        description=f"High Latency on {services[1].name}",
                        is_active=True
                    )
                    await crud_alert_rule.create(session, obj_in=alert_rule_in)
                    logger.info(f"Created alert rule: {alert_rule_in.description}")
                else:
                    logger.info(f"Alert rule 'High Latency on {services[1].name}' already exists.")

    logger.info("Database seeding complete.")

if __name__ == "__main__":
    asyncio.run(init_db(SessionLocal()))
    asyncio.run(seed_data())
```

---

### 3. Configuration & Setup

#### `requirements.txt`
```text