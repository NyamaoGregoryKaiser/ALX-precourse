```javascript
// src/services/transaction.service.js
const httpStatus = require('http-status');
const { Transaction, Merchant, IdempotencyKey } = require('../models');
const { ApiError } = require('../utils/ApiError');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

// Simulate interaction with an external payment gateway
const simulatePaymentGateway = {
    authorize: async (amount, currency, paymentMethodDetails, metadata) => {
        logger.info(`Simulating Gateway: Authorizing ${amount} ${currency} with details ${JSON.stringify(paymentMethodDetails)}`);
        // Simulate network latency and processing time
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

        const isSuccess = Math.random() > 0.1; // 90% success rate
        if (isSuccess) {
            return {
                status: 'authorized',
                gatewayReferenceId: `gw_auth_${uuidv4()}`,
                message: 'Payment authorized successfully.',
                metadata: metadata, // Pass metadata back for reconciliation
            };
        } else {
            throw new Error('Gateway authorization failed: Insufficient funds or card declined.');
        }
    },
    capture: async (gatewayReferenceId, amount, metadata) => {
        logger.info(`Simulating Gateway: Capturing ${amount} for ${gatewayReferenceId}`);
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        const isSuccess = Math.random() > 0.05; // 95% success rate
        if (isSuccess) {
            return {
                status: 'captured',
                gatewayReferenceId: gatewayReferenceId,
                message: 'Funds captured successfully.',
                metadata: metadata,
            };
        } else {
            throw new Error('Gateway capture failed: Transaction expired or funds unavailable.');
        }
    },
    refund: async (gatewayReferenceId, amount, metadata) => {
        logger.info(`Simulating Gateway: Refunding ${amount} for ${gatewayReferenceId}`);
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        const isSuccess = Math.random() > 0.05; // 95% success rate
        if (isSuccess) {
            return {
                status: 'refunded',
                gatewayReferenceId: `gw_refund_${uuidv4()}`, // Refund might have a new ref ID
                message: 'Funds refunded successfully.',
                metadata: metadata,
            };
        } else {
            throw new Error('Gateway refund failed: Cannot refund this transaction.');
        }
    }
    // ... other gateway operations like void, dispute, etc.
};


const processNewTransaction = async (transactionBody) => {
    const { merchantId, amount, currency, paymentMethodType, paymentMethodDetails, customerId, description, idempotencyKey } = transactionBody;

    // ALX Principle: Atomic Operations (Transactions)
    // Use database transactions to ensure data consistency during complex operations.
    const transaction = await Transaction.sequelize.transaction(async (t) => {
        // Create an initial transaction record in 'pending' status
        const newTransaction = await Transaction.create({
            id: uuidv4(), // Generate UUID for our internal transaction ID
            merchantId,
            amount,
            currency,
            paymentMethodType,
            customerId,
            description,
            status: 'pending',
            gatewayResponse: {}, // Placeholder
            metadata: { idempotencyKey, originalRequest: transactionBody }, // Store original request for auditing/debugging
        }, { transaction: t });

        // Simulate interaction with an external payment gateway
        try {
            const gatewayResult = await simulatePaymentGateway.authorize(
                amount,
                currency,
                paymentMethodDetails,
                { ourRef: newTransaction.id, merchantId: merchantId } // Pass our reference for webhook reconciliation
            );

            // Update transaction status and gateway reference based on gateway response
            newTransaction.status = gatewayResult.status; // 'authorized'
            newTransaction.gatewayReferenceId = gatewayResult.gatewayReferenceId;
            newTransaction.gatewayResponse = gatewayResult; // Store full gateway response

            await newTransaction.save({ transaction: t });
            logger.info(`Transaction ${newTransaction.id} processed successfully via gateway. Status: ${newTransaction.status}`);
            return newTransaction;

        } catch (error) {
            // ALX Principle: Robust Error Handling
            // Capture external gateway errors and update transaction status to 'failed'.
            newTransaction.status = 'failed';
            newTransaction.failureReason = error.message;
            newTransaction.gatewayResponse = { error: error.message }; // Store error details
            await newTransaction.save({ transaction: t });
            logger.error(`Transaction ${newTransaction.id} failed during gateway authorization: ${error.message}`);
            throw new ApiError(httpStatus.BAD_REQUEST, `Payment processing failed: ${error.message}`);
        }
    });

    return transaction;
};

const captureTransaction = async (transactionId, merchantId, captureAmount) => {
    const transaction = await Transaction.findOne({
        where: { id: transactionId, merchantId: merchantId },
    });

    if (!transaction) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found for this merchant.');
    }
    if (transaction.status !== 'authorized') {
        throw new ApiError(httpStatus.BAD_REQUEST, `Transaction must be in 'authorized' status to be captured. Current status: ${transaction.status}`);
    }

    const amountToCapture = captureAmount || transaction.amount;
    if (amountToCapture > transaction.amount) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Capture amount cannot exceed authorized amount.');
    }

    // ALX Principle: Atomic Operations
    return await Transaction.sequelize.transaction(async (t) => {
        try {
            const gatewayResult = await simulatePaymentGateway.capture(
                transaction.gatewayReferenceId,
                amountToCapture,
                { ourRef: transaction.id, merchantId: merchantId }
            );

            transaction.status = 'captured';
            transaction.amountCaptured = (transaction.amountCaptured || 0) + amountToCapture;
            transaction.gatewayResponse = gatewayResult;
            await transaction.save({ transaction: t });
            logger.info(`Transaction ${transaction.id} captured ${amountToCapture} successfully.`);
            return transaction;
        } catch (error) {
            transaction.status = 'failed'; // Or 'capture_failed' if we want more granular states
            transaction.failureReason = error.message;
            await transaction.save({ transaction: t });
            logger.error(`Capture failed for transaction ${transaction.id}: ${error.message}`);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Capture failed: ${error.message}`);
        }
    });
};

const refundTransaction = async (transactionId, merchantId, refundAmount) => {
    const transaction = await Transaction.findOne({
        where: { id: transactionId, merchantId: merchantId },
    });

    if (!transaction) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found for this merchant.');
    }
    if (transaction.status !== 'captured') {
        throw new ApiError(httpStatus.BAD_REQUEST, `Transaction must be in 'captured' status to be refunded. Current status: ${transaction.status}`);
    }

    const availableForRefund = transaction.amountCaptured - (transaction.amountRefunded || 0);
    const amountToRefund = refundAmount || availableForRefund;

    if (amountToRefund <= 0 || amountToRefund > availableForRefund) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Invalid refund amount. Max refundable: ${availableForRefund}.`);
    }

    return await Transaction.sequelize.transaction(async (t) => {
        try {
            const gatewayResult = await simulatePaymentGateway.refund(
                transaction.gatewayReferenceId,
                amountToRefund,
                { ourRef: transaction.id, merchantId: merchantId }
            );

            transaction.status = (amountToRefund === availableForRefund) ? 'refunded' : 'partially_refunded';
            transaction.amountRefunded = (transaction.amountRefunded || 0) + amountToRefund;
            transaction.gatewayResponse = gatewayResult;
            await transaction.save({ transaction: t });
            logger.info(`Transaction ${transaction.id} refunded ${amountToRefund} successfully.`);
            return transaction;
        } catch (error) {
            transaction.failureReason = error.message;
            await transaction.save({ transaction: t }); // Keep status as captured, but add failure reason
            logger.error(`Refund failed for transaction ${transaction.id}: ${error.message}`);
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Refund failed: ${error.message}`);
        }
    });
};

const getTransactionByIdAndMerchant = async (transactionId, merchantId) => {
    return Transaction.findOne({
        where: { id: transactionId, merchantId: merchantId },
        include: [{ model: Merchant, as: 'merchant', attributes: ['name', 'email'] }] // Example of eager loading
    });
};

const queryTransactions = async (filter, options) => {
    const transactions = await Transaction.paginate(filter, options);
    return transactions;
};

const updateTransactionStatus = async (transactionId, newStatus, gatewayResponse) => {
    const transaction = await Transaction.findByPk(transactionId);
    if (!transaction) {
        logger.warn(`Attempted to update non-existent transaction ${transactionId}`);
        return null;
    }

    // ALX Principle: State Machine Enforcement
    // Ensure valid state transitions to maintain data integrity.
    // Example: cannot transition from 'failed' to 'captured'
    // This could be more sophisticated with a dedicated state machine library.
    const validTransitions = {
        'pending': ['authorized', 'failed'],
        'authorized': ['captured', 'voided', 'failed'],
        'captured': ['refunded', 'partially_refunded', 'disputed'],
        'partially_refunded': ['refunded'],
        'refunded': [], // Final state
        'failed': [], // Final state
        'voided': [], // Final state
        'disputed': [], // Often a manual review state
    };

    if (!validTransitions[transaction.status] || !validTransitions[transaction.status].includes(newStatus)) {
        logger.warn(`Invalid state transition for transaction ${transactionId}: from ${transaction.status} to ${newStatus}`);
        // Consider if this should throw an error or just log. For webhooks, logging might be better.
        // throw new ApiError(httpStatus.BAD_REQUEST, `Invalid status transition from ${transaction.status} to ${newStatus}`);
    }

    transaction.status = newStatus;
    transaction.gatewayResponse = { ...transaction.gatewayResponse, ...gatewayResponse }; // Merge new gateway data
    await transaction.save();
    return transaction;
};


module.exports = {
    processNewTransaction,
    captureTransaction,
    refundTransaction,
    getTransactionByIdAndMerchant,
    queryTransactions,
    updateTransactionStatus,
};
```