```python
import httpx
from typing import Dict, Any
from uuid import uuid4
from enum import Enum

from app.core.config import settings
from app.core.exceptions import PaymentGatewayException
from app.core.logger import logger

class PaymentGatewayStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELED = "canceled"

class PaymentGatewayClient:
    def __init__(self, base_url: str = settings.PAYMENT_GATEWAY_API_URL, api_key: str = settings.PAYMENT_GATEWAY_API_KEY):
        self.base_url = base_url
        self.api_key = api_key
        self.client = httpx.AsyncClient(base_url=self.base_url, headers={"Authorization": f"Bearer {self.api_key}"})
        logger.info(f"Initialized PaymentGatewayClient for {self.base_url}")

    async def _request(self, method: str, path: str, json: Dict = None, **kwargs) -> Dict:
        try:
            response = await self.client.request(method, path, json=json, **kwargs)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Payment gateway HTTP error: {e.response.status_code} - {e.response.text}")
            raise PaymentGatewayException(
                f"Gateway error: {e.response.status_code} - {e.response.json().get('detail', e.response.text)}",
                status_code=e.response.status_code
            )
        except httpx.RequestError as e:
            logger.error(f"Payment gateway request error: {e}")
            raise PaymentGatewayException(f"Failed to connect to payment gateway: {e}")
        except Exception as e:
            logger.error(f"Unexpected error with payment gateway: {e}")
            raise PaymentGatewayException(f"Unexpected gateway error: {e}")

    async def create_payment(self, amount: float, currency: str, description: str,
                             customer_id: str, merchant_order_id: str,
                             idempotency_key: str) -> Dict:
        """
        Simulates initiating a payment with the external gateway.
        Returns a dictionary with gateway's payment ID and status.
        """
        logger.info(f"Initiating payment for {amount} {currency} with gateway...", extra={"merchant_order_id": merchant_order_id, "idempotency_key": idempotency_key})
        data = {
            "amount": amount,
            "currency": currency,
            "description": description,
            "customer_id": customer_id,
            "merchant_order_id": merchant_order_id,
            "idempotency_key": idempotency_key, # Critical for re-submission safety
            "return_url": f"{settings.PAYMENT_GATEWAY_API_URL}/redirect?status=success", # Mock return URL
            "cancel_url": f"{settings.PAYMENT_GATEWAY_API_URL}/redirect?status=canceled", # Mock cancel URL
        }
        # Simulate an immediate success or pending for later webhook update
        result = {
            "gateway_payment_id": str(uuid4()),
            "status": PaymentGatewayStatus.PENDING, # Or SUCCESS directly for simpler cases
            "redirect_url": f"{self.base_url}/pay/{uuid4()}" # Simulate a redirect URL for card details
        }
        logger.info(f"Payment initiation simulated: {result}", extra={"merchant_order_id": merchant_order_id})
        # In a real scenario, this would be `await self._request("POST", "/payments", json=data)`
        return result

    async def get_payment_status(self, gateway_payment_id: str) -> Dict:
        """
        Simulates fetching the current status of a payment from the gateway.
        """
        logger.info(f"Fetching payment status for gateway_payment_id: {gateway_payment_id}")
        # Simulate various statuses
        status_map = {
            "pending": PaymentGatewayStatus.PENDING,
            "success": PaymentGatewayStatus.SUCCESS,
            "failed": PaymentGatewayStatus.FAILED,
            "refunded": PaymentGatewayStatus.REFUNDED
        }
        # In a real gateway, this would be `await self._request("GET", f"/payments/{gateway_payment_id}/status")`
        # For simulation, just return a mock status. In a real system,
        # we often rely on webhooks rather than polling.
        mock_statuses = [
            PaymentGatewayStatus.PENDING,
            PaymentGatewayStatus.SUCCESS,
            PaymentGatewayStatus.FAILED,
            PaymentGatewayStatus.PENDING # Always cycle through to make it dynamic
        ]
        # This is a very simple deterministic mock. In a real mock, you'd use a dict/DB
        # to remember the status or use a more complex logic based on payment_id.
        mock_status = mock_statuses[hash(gateway_payment_id) % len(mock_statuses)]
        result = {
            "gateway_payment_id": gateway_payment_id,
            "status": mock_status,
            "details": f"Mock status for {gateway_payment_id}"
        }
        logger.info(f"Mock gateway status for {gateway_payment_id}: {mock_status}")
        return result

    async def refund_payment(self, gateway_payment_id: str, amount: float = None) -> Dict:
        """
        Simulates initiating a refund for a payment.
        """
        logger.info(f"Initiating refund for gateway_payment_id: {gateway_payment_id}, amount: {amount}")
        data = {"gateway_payment_id": gateway_payment_id}
        if amount is not None:
            data["amount"] = amount

        # Simulate refund processing
        result = {
            "gateway_refund_id": str(uuid4()),
            "gateway_payment_id": gateway_payment_id,
            "status": PaymentGatewayStatus.PENDING, # Refund might also be pending
            "amount_refunded": amount if amount is not None else "full"
        }
        logger.info(f"Refund initiation simulated: {result}")
        # In a real scenario, this would be `await self._request("POST", f"/payments/{gateway_payment_id}/refunds", json=data)`
        return result

    async def close(self):
        await self.client.aclose()

```