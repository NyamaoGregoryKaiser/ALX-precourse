const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
};

const TRANSACTION_TYPES = {
  DEBIT: 'debit',
  CREDIT: 'credit',
  FEE: 'fee',
  REFUND: 'refund',
};

const TRANSACTION_STATUSES = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REVERSED: 'reversed', // For refunds or chargebacks
  VOIDED: 'voided', // For cancelling a pending transaction
};

const PAYMENT_METHODS = {
  CARD: 'card',
  BANK_TRANSFER: 'bank_transfer',
  WALLET: 'wallet',
  CRYPTO: 'crypto',
};

// Error messages
const ERROR_MESSAGES = {
  INSUFFICIENT_FUNDS: 'Insufficient funds in the account.',
  ACCOUNT_NOT_FOUND: 'Account not found.',
  USER_NOT_FOUND: 'User not found.',
  TRANSACTION_NOT_FOUND: 'Transaction not found.',
  PAYMENT_NOT_FOUND: 'Payment not found.',
  INVALID_TRANSACTION_STATUS: 'Invalid transaction status transition.',
  INVALID_AMOUNT: 'Transaction amount must be positive.',
  IDEMPOTENCY_KEY_USED: 'Payment with this idempotency key already exists.',
  PAYMENT_ALREADY_CAPTURED: 'Payment has already been captured.',
  PAYMENT_ALREADY_REFUNDED: 'Payment has already been refunded.',
  PAYMENT_NOT_PENDING: 'Payment is not in a pending state.',
};

module.exports = {
  USER_ROLES,
  TRANSACTION_TYPES,
  TRANSACTION_STATUSES,
  PAYMENT_METHODS,
  ERROR_MESSAGES,
};