```javascript
const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
};

const ACCOUNT_TYPE = {
  CHECKING: 'checking',
  SAVINGS: 'savings',
  CREDIT: 'credit',
};

const TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PROCESSING: 'processing', // For external gateway interaction
};

const TRANSACTION_TYPE = {
  PAYMENT: 'payment',
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  TRANSFER: 'transfer',
  REFUND: 'refund',
};

module.exports = {
  USER_ROLES,
  ACCOUNT_TYPE,
  TRANSACTION_STATUS,
  TRANSACTION_TYPE,
};
```