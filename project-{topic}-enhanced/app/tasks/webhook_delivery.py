```python
import httpx
import asyncio
from app.core.config import settings
from app.core.logger import logger
from app.models.webhook_event import WebhookEvent, WebhookStatus

# In a real system, you'd use a robust task queue like Celery with Redis/RabbitMQ
# For this example, we'll use FastAPI's BackgroundTasks, but for true reliability
# and retries, a dedicated broker is superior. This simple version will retry in-process.

async def _send_webhook_request(url: str, payload: dict, headers: dict) -> httpx.Response:
    """Helper to send the HTTP request for a webhook."""
    async with httpx.AsyncClient() as client:
        return await client.post(url, json=payload, headers=headers, timeout=10)

async def process_webhook_event_delivery(webhook_event_id: str, target_url: str, payload: dict, headers: dict):
    """
    Attempts to deliver a webhook event with retries.
    This function would typically run in a separate worker process or as a background task.
    """
    logger.info(f"Attempting to deliver webhook event {webhook_event_id} to {target_url}")
    retries = 0
    while retries < settings.WEBHOOK_MAX_RETRIES:
        try:
            response = await _send_webhook_request(target_url, payload, headers)
            response.raise_for_status()
            logger.info(f"Webhook event {webhook_event_id} delivered successfully to {target_url}",
                        extra={"status_code": response.status_code})
            # In a real system, update the webhook event status in DB to DELIVERED
            # For simplicity, we just log and exit on success.
            return
        except httpx.HTTPStatusError as e:
            logger.warning(f"Webhook event {webhook_event_id} delivery failed (HTTP {e.response.status_code}) to {target_url}. Retrying...",
                           extra={"retry_count": retries + 1, "error": str(e)})
        except httpx.RequestError as e:
            logger.warning(f"Webhook event {webhook_event_id} delivery failed (Network error) to {target_url}. Retrying...",
                           extra={"retry_count": retries + 1, "error": str(e)})
        except Exception as e:
            logger.error(f"Webhook event {webhook_event_id} delivery failed (Unexpected error) to {target_url}. Retrying...",
                         extra={"retry_count": retries + 1, "error": str(e)}, exc_info=True)

        retries += 1
        delay = settings.WEBHOOK_RETRY_DELAY_SECONDS * (2 ** (retries - 1)) # Exponential backoff
        await asyncio.sleep(min(delay, 300)) # Cap delay at 5 minutes

    logger.error(f"Webhook event {webhook_event_id} failed to deliver after {settings.WEBHOOK_MAX_RETRIES} attempts to {target_url}")
    # In a real system, update the webhook event status in DB to FAILED or RETRY_EXHAUSTED
```