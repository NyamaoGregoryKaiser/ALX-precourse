```typescript
import { prisma } from '../../utils/prisma';
import { ApiError } from '../../utils/apiError';

export class AccountService {
  /**
   * Retrieves all accounts for a specific user.
   * @param userId The ID of the user.
   * @returns An array of account objects.
   */
  async getAccountsByUserId(userId: string) {
    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return accounts;
  }

  /**
   * Retrieves a single account by its ID.
   * @param accountId The ID of the account.
   * @returns The account object.
   */
  async getAccountById(accountId: string) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account) {
      throw new ApiError(404, 'Account not found');
    }
    return account;
  }

  /**
   * Creates a new account for a user.
   * @param userId The ID of the user.
   * @param currency The currency of the new account (e.g., 'USD', 'EUR').
   * @returns The newly created account object.
   */
  async createAccount(userId: string, currency: string) {
    // Basic validation for currency
    if (!['USD', 'EUR', 'GBP'].includes(currency.toUpperCase())) { // Example currencies
      throw new ApiError(400, 'Unsupported currency');
    }

    const newAccount = await prisma.account.create({
      data: {
        userId,
        currency: currency.toUpperCase(),
        balance: 0,
        accountNumber: this.generateAccountNumber(),
      },
    });
    return newAccount;
  }

  /**
   * Generates a simple 10-digit account number.
   * In a real system, this would involve more robust collision checks and perhaps a dedicated service.
   */
  private generateAccountNumber(): string {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }
}
```