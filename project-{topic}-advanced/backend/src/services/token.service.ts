```typescript
// No specific token service is needed beyond jwt.ts and BlacklistedToken entity.
// This file is a placeholder to show where a more complex token management could live.
// For example, if you wanted to manage refresh tokens in the database, this service would handle that.
// For JWT access token blacklisting, the logic is already in auth.service for logout.

import { AppDataSource } from '../config/database';
import { BlacklistedToken } from '../entities/BlacklistedToken';

class TokenService {
  private blacklistedTokenRepository = AppDataSource.getRepository(BlacklistedToken);

  public async addTokenToBlacklist(token: string, expiresAt: Date): Promise<void> {
    const blacklistedToken = this.blacklistedTokenRepository.create({ token, expiresAt });
    await this.blacklistedTokenRepository.save(blacklistedToken);
  }

  public async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklistedToken = await this.blacklistedTokenRepository.findOneBy({ token });
    return !!blacklistedToken;
  }

  public async cleanExpiredBlacklistedTokens(): Promise<void> {
    await this.blacklistedTokenRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();
  }
}

export const tokenService = new TokenService();
```