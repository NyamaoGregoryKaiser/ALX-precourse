```javascript
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 5001;
const MOCK_API_KEY = process.env.MOCK_GATEWAY_API_KEY || 'mock_api_key_123';

app.use(bodyParser.json());

// --- Mock Payment Gateway Endpoints ---

// Simulate payment charge
app.post('/mock-gateway/charge', (req, res) => {
  const { apiKey, amount, currency, card, merchant_transaction_ref } = req.body;

  if (apiKey !== MOCK_API_KEY) {
    return res.status(401).json({ status: 'error', code: 'INVALID_API_KEY', message: 'Unauthorized: Invalid API Key' });
  }
  if (!amount || !currency || !card) {
    return res.status(400).json({ status: 'error', code: 'MISSING_PARAMETERS', message: 'Missing required payment parameters.' });
  }

  console.log(`[MOCK GATEWAY] Charging ${amount} ${currency} for ref ${merchant_transaction_ref} (Card: **** **** **** ${card.number ? card.number.slice(-4) : 'N/A'})`);

  // Simulate payment processing logic
  const gatewayTransactionId = `gtx_${uuidv4()}`;

  // Basic "failure" logic (e.g., specific card numbers, amounts)
  if (card.number && card.number.endsWith('0000')) {
    return res.status(200).json({
      status: 'failed',
      code: 'CARD_DECLINED',
      message: 'Mock: Card declined by issuer.',
      gatewayTransactionId: gatewayTransactionId,
      processedAt: new Date().toISOString()
    });
  }
  if (amount > 1000) {
    return res.status(200).json({
      status: 'failed',
      code: 'AMOUNT_LIMIT_EXCEEDED',
      message: 'Mock: Amount exceeds gateway limit.',
      gatewayTransactionId: gatewayTransactionId,
      processedAt: new Date().toISOString()
    });
  }

  // Simulate success
  setTimeout(() => {
    res.status(200).json({
      status: 'success',
      code: 'APPROVAL',
      message: 'Payment approved successfully.',
      gatewayTransactionId: gatewayTransactionId,
      processedAt: new Date().toISOString()
    });
  }, 500); // Simulate network latency
});

// Simulate refund
app.post('/mock-gateway/refund', (req, res) => {
  const { apiKey, gatewayTransactionId, amount, currency, reason, merchant_refund_ref } = req.body;

  if (apiKey !== MOCK_API_KEY) {
    return res.status(401).json({ status: 'error', code: 'INVALID_API_KEY', message: 'Unauthorized: Invalid API Key' });
  }
  if (!gatewayTransactionId || !amount || !currency) {
    return res.status(400).json({ status: 'error', code: 'MISSING_PARAMETERS', message: 'Missing required refund parameters.' });
  }

  console.log(`[MOCK GATEWAY] Refunding ${amount} ${currency} for original gateway TXN ${gatewayTransactionId}, ref ${merchant_refund_ref}`);

  const gatewayRefundId = `grf_${uuidv4()}`;

  // Simulate refund failure (e.g., certain gatewayTransactionId)
  if (gatewayTransactionId.endsWith('fail')) {
    return res.status(200).json({
      status: 'failed',
      code: 'REFUND_NOT_POSSIBLE',
      message: 'Mock: Refund failed for this transaction.',
      gatewayRefundId: gatewayRefundId,
      processedAt: new Date().toISOString()
    });
  }

  // Simulate success
  setTimeout(() => {
    res.status(200).json({
      status: 'success',
      code: 'REFUND_COMPLETED',
      message: 'Refund processed successfully.',
      gatewayRefundId: gatewayRefundId,
      processedAt: new Date().toISOString()
    });
  }, 300);
});

app.listen(port, () => {
  console.log(`Mock Payment Gateway listening on port ${port}`);
  console.log(`Mock API Key: ${MOCK_API_KEY}`);
});
```