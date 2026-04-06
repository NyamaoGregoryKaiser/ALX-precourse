```typescript
import { http, HttpResponse } from 'msw';

// Mock API endpoints
export const handlers = [
  http.post('*/api/v1/auth/login', async ({ request }) => {
    const { email, password } = await request.json();
    if (email === 'test@example.com' && password === 'password123') {
      return HttpResponse.json({
        message: 'Login successful',
        token: 'mock-jwt-token',
        user: {
          id: 'user-id-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'USER'
        }
      }, { status: 200 });
    }
    return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  }),

  http.get('*/api/v1/users/me', ({ request }) => {
    if (request.headers.get('Authorization') === 'Bearer mock-jwt-token') {
      return HttpResponse.json({
        id: 'user-id-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { status: 200 });
    }
    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }),

  http.get('*/api/v1/accounts', ({ request }) => {
    if (request.headers.get('Authorization') === 'Bearer mock-jwt-token') {
      return HttpResponse.json([
        {
          id: 'account-1-id',
          userId: 'user-id-123',
          accountNumber: '1111222233',
          balance: 1500.00,
          currency: 'USD',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'account-2-id',
          userId: 'user-id-123',
          accountNumber: '4444555566',
          balance: 500.00,
          currency: 'EUR',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ], { status: 200 });
    }
    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }),

  http.get('*/api/v1/transactions/account/:accountId', ({ request, params }) => {
    const { accountId } = params;
    if (request.headers.get('Authorization') === 'Bearer mock-jwt-token') {
      if (accountId === 'account-1-id') {
        return HttpResponse.json([
          {
            id: 'tx-1-id',
            sourceAccountId: 'account-1-id',
            destinationAccountId: 'external-account',
            amount: 50.00,
            currency: 'USD',
            type: 'WITHDRAWAL',
            status: 'COMPLETED',
            description: 'Mock transaction 1',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'tx-2-id',
            sourceAccountId: 'external-account-2',
            destinationAccountId: 'account-1-id',
            amount: 100.00,
            currency: 'USD',
            type: 'DEPOSIT',
            status: 'COMPLETED',
            description: 'Mock transaction 2',
            createdAt: new Date().toISOString(),
          }
        ], { status: 200 });
      }
      return HttpResponse.json([], { status: 200 }); // Empty array for other accounts
    }
    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }),

  http.post('*/api/v1/payments', async ({ request }) => {
    const { sourceAccountId, destinationAccountNumber, amount, description } = await request.json();
    if (request.headers.get('Authorization') === 'Bearer mock-jwt-token') {
      if (amount > 0 && sourceAccountId === 'account-1-id' && destinationAccountNumber === '2222333344') {
        return HttpResponse.json({
          message: 'Payment initiated successfully',
          payment: {
            id: 'payment-mock-id',
            sourceAccountId,
            destinationAccountNumber,
            amount,
            currency: 'USD',
            description,
            status: 'COMPLETED',
            transactionId: 'mock-tx-id',
            createdAt: new Date().toISOString()
          }
        }, { status: 201 });
      }
      return HttpResponse.json({ message: 'Payment failed due to invalid data' }, { status: 400 });
    }
    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }),
];
```