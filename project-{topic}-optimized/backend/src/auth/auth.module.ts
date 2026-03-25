import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * AuthModule handles all authentication and authorization concerns.
 * It integrates with UsersModule for user validation, Passport for strategy implementation,
 * and JWT for token generation and verification.
 */
@Module({
  imports: [
    UsersModule, // Required to validate user credentials during authentication
    PassportModule, // Provides authentication strategies
    // JWT Module: Configures JWT signing and verification
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRATION_TIME'),
        },
      }),
    }),
    ConfigModule, // Used to inject ConfigService
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy], // JwtStrategy is registered here for Passport
  exports: [AuthService, JwtModule], // Export AuthService and JwtModule for use in other modules (e.g., guards)
})
export class AuthModule {}