```python
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import secrets

from app.core.database import SessionLocal, init_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.merchant import Merchant
from app.models.payment import Payment, PaymentStatus, PaymentMethod
from app.core.logger import logger

async def seed_data():
    logger.info("Starting database seeding...")
    await init_db() # Ensure tables exist

    async with SessionLocal() as db:
        # Create an Admin User
        admin_user_id = uuid.uuid4()
        admin_user = await db.get(User, admin_user_id)
        if not admin_user:
            admin_user = User(
                id=admin_user_id,
                username="admin",
                email="admin@example.com",
                hashed_password=get_password_hash("adminpassword"),
                is_active=True,
                role=UserRole.ADMIN
            )
            db.add(admin_user)
            await db.flush() # Flush to get ID if needed
            logger.info(f"Created Admin user: {admin_user.username}")
        else:
            logger.info(f"Admin user {admin_user.username} already exists.")

        # Create a Merchant User
        merchant_user_id = uuid.uuid4()
        merchant_user = await db.get(User, merchant_user_id)
        if not merchant_user:
            merchant_user = User(
                id=merchant_user_id,
                username="merchant_user",
                email="merchant@example.com",
                hashed_password=get_password_hash("merchantpassword"),
                is_active=True,
                role=UserRole.MERCHANT
            )
            db.add(merchant_user)
            await db.flush()
            logger.info(f"Created Merchant user: {merchant_user.username}")
        else:
            logger.info(f"Merchant user {merchant_user.username} already exists.")

        # Create a Merchant for the Merchant User
        merchant_id = uuid.uuid4()
        merchant_obj = await db.get(Merchant, merchant_id)
        if not merchant_obj:
            merchant_api_key = secrets.token_urlsafe(32)
            merchant_obj = Merchant(
                id=merchant_id,
                name="Acme Inc.",
                api_key=merchant_api_key,
                is_active=True,
                user_id=merchant_user.id
            )
            db.add(merchant_obj)
            await db.flush()
            logger.info(f"Created Merchant: {merchant_obj.name} with API Key: {merchant_api_key}")
        else:
            logger.info(f"Merchant {merchant_obj.name} already exists.")
            merchant_api_key = merchant_obj.api_key # Use existing API key

        # Create some sample Payments
        sample_payments = [
            Payment(
                merchant_id=merchant_obj.id,
                amount=100.50,
                currency="USD",
                status=PaymentStatus.CAPTURED,
                merchant_order_id="ORDER-001",
                description="Product A purchase",
                customer_email="customer1@example.com",
                payment_method=PaymentMethod.CARD,
                idempotency_key=str(uuid.uuid4())
            ),
            Payment(
                merchant_id=merchant_obj.id,
                amount=25.00,
                currency="EUR",
                status=PaymentStatus.PENDING,
                merchant_order_id="ORDER-002",
                description="Subscription fee",
                customer_email="customer2@example.com",
                payment_method=PaymentMethod.BANK_TRANSFER,
                idempotency_key=str(uuid.uuid4())
            ),
             Payment(
                merchant_id=merchant_obj.id,
                amount=50.75,
                currency="USD",
                status=PaymentStatus.FAILED,
                merchant_order_id="ORDER-003",
                description="Service payment",
                customer_email="customer3@example.com",
                payment_method=PaymentMethod.CARD,
                idempotency_key=str(uuid.uuid4())
            ),
        ]
        
        for payment_data in sample_payments:
            existing_payment = await db.scalar(
                sa.select(Payment).filter_by(idempotency_key=payment_data.idempotency_key)
            )
            if not existing_payment:
                db.add(payment_data)
                logger.info(f"Added payment for Order: {payment_data.merchant_order_id}")
            else:
                logger.info(f"Payment for Order: {payment_data.merchant_order_id} with idempotency key {payment_data.idempotency_key} already exists. Skipping.")

        await db.commit()
        logger.info("Database seeding complete.")

if __name__ == "__main__":
    # To run this script, ensure your .env is configured correctly for DATABASE_URL
    # python -m scripts.seed_db
    asyncio.run(seed_data())
```