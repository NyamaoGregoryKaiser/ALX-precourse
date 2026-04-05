```python
import pytest
import uuid
from app.models.payment import Payment, PaymentStatus
from app.models.merchant import Merchant
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.schemas.payment import PaymentCreate, PaymentUpdateStatus
from app.external.payment_gateway import PaymentGatewayStatus

@pytest.fixture
async def create_merchant_with_user(db_session, create_user):
    """Fixture to create a merchant and its associated user."""
    user = await create_user("test_merchant_user", "test_merchant@example.com", "password123", UserRole.MERCHANT)
    api_key = str(uuid.uuid4())
    merchant = Merchant(name="Test Merchant", api_key=api_key, user_id=user.id)
    db_session.add(merchant)
    await db_session.commit()
    await db_session.refresh(merchant)
    return merchant, user

@pytest.fixture
async def merchant_with_token(client, db_session, create_merchant_with_user):
    merchant, user = await create_merchant_with_user
    response = await client.post(
        "/api/v1/auth/token",
        data={"username": user.username, "password": "password123"}
    )
    token = response.json()["access_token"]
    return merchant, token

@pytest.mark.asyncio
async def test_create_payment_success(client, db_session, merchant_with_token, mocker):
    merchant, token = merchant_with_token
    
    # Mock the external payment gateway
    mock_gateway_response = {
        "gateway_payment_id": str(uuid.uuid4()),
        "status": PaymentGatewayStatus.PENDING,
        "redirect_url": "http://mock-gateway.com/redirect"
    }
    mocker.patch(
        "app.external.payment_gateway.PaymentGatewayClient.create_payment",
        return_value=mock_gateway_response
    )

    payment_data = PaymentCreate(
        amount=100.00,
        currency="USD",
        merchant_order_id="TEST-ORDER-001",
        description="Test payment",
        customer_email="customer@example.com",
        payment_method="card",
        idempotency_key=str(uuid.uuid4())
    )

    response = await client.post(
        "/api/v1/payments",
        json=payment_data.model_dump(),
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 201
    created_payment = response.json()
    assert created_payment["status"] == PaymentStatus.PENDING.value
    assert created_payment["amount"] == 100.00
    assert created_payment["merchant_id"] == str(merchant.id)
    assert created_payment["gateway_payment_id"] == mock_gateway_response["gateway_payment_id"]
    assert created_payment["idempotency_key"] == payment_data.idempotency_key

    # Verify database entry
    db_payment = await db_session.get(Payment, uuid.UUID(created_payment["id"]))
    assert db_payment is not None
    assert db_payment.gateway_payment_id == mock_gateway_response["gateway_payment_id"]

@pytest.mark.asyncio
async def test_get_payment_by_id_success(client, db_session, merchant_with_token):
    merchant, token = merchant_with_token
    # Create a payment directly in DB for testing retrieval
    payment_id = uuid.uuid4()
    test_payment = Payment(
        id=payment_id,
        merchant_id=merchant.id,
        amount=50.00,
        currency="EUR",
        status=PaymentStatus.CAPTURED,
        merchant_order_id="TEST-ORDER-RETRIEVE",
        idempotency_key=str(uuid.uuid4())
    )
    db_session.add(test_payment)
    await db_session.commit()
    await db_session.refresh(test_payment)

    response = await client.get(
        f"/api/v1/payments/{payment_id}",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    retrieved_payment = response.json()
    assert retrieved_payment["id"] == str(payment_id)
    assert retrieved_payment["amount"] == 50.00
    assert retrieved_payment["status"] == PaymentStatus.CAPTURED.value

@pytest.mark.asyncio
async def test_update_payment_status_by_webhook(client, db_session, merchant_with_token):
    merchant, token = merchant_with_token # We don't need token for webhook endpoint
    
    # Create a payment that is PENDING
    payment_id = uuid.uuid4()
    test_payment = Payment(
        id=payment_id,
        merchant_id=merchant.id,
        amount=75.00,
        currency="GBP",
        status=PaymentStatus.PENDING,
        merchant_order_id="WEBHOOK-ORDER-001",
        gateway_payment_id="gateway_id_123",
        idempotency_key=str(uuid.uuid4())
    )
    db_session.add(test_payment)
    await db_session.commit()
    await db_session.refresh(test_payment)

    # Simulate a webhook from the payment gateway
    webhook_payload = {
        "event_type": "payment.succeeded",
        "data": {
            "gateway_payment_id": "gateway_id_123",
            "status": "success",
            "amount": 75.00,
            "currency": "GBP"
        }
    }
    
    # In a real scenario, the webhook would be POSTed to a public endpoint.
    # We'll use the API client to simulate that.
    # Note: Webhook validation would normally happen here (e.g., signature check)
    response = await client.post(
        "/api/v1/webhooks/gateway-events", # This is the internal endpoint for gateway webhooks
        json=webhook_payload,
        headers={"X-Payment-Gateway-Signature": "mock_signature_for_validation"} # Mock signature
    )

    assert response.status_code == 200
    assert response.json() == {"message": "Webhook processed successfully"}

    # Verify payment status in DB
    await db_session.refresh(test_payment)
    assert test_payment.status == PaymentStatus.CAPTURED

@pytest.mark.asyncio
async def test_create_payment_unauthorized(client):
    payment_data = PaymentCreate(
        amount=100.00,
        currency="USD",
        merchant_order_id="TEST-ORDER-UNAUTHORIZED",
        description="Test payment",
        customer_email="customer@example.com",
        payment_method="card",
        idempotency_key=str(uuid.uuid4())
    )

    response = await client.post(
        "/api/v1/payments",
        json=payment_data.model_dump()
    )
    
    assert response.status_code == 401
    assert "detail" in response.json()
    assert response.json()["detail"] == "Not authenticated" # FastAPI's default for missing token
```