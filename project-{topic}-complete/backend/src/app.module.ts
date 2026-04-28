import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DatasetsModule } from './datasets/datasets.module';
import { ModelsModule } from './models/models.module';
import { getTypeOrmConfig } from './config/typeorm.config';
import { FilesModule } from './files/files.module';
import { PredictionsModule } from './predictions/predictions.module';
import { AppLoggerModule } from './common/logger/app-logger.module';
import { CommonModule } from './common/common.module';
import * as redisStore from 'cache-manager-redis-store';
import { CacheStoreFactory } from 'cache-manager';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      load: [() => ({ // Load default .env if NODE_ENV specific not found
        ...require('dotenv').config().parsed,
        ...require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` }).parsed,
      })]
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => getTypeOrmConfig(configService),
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore as unknown as CacheStoreFactory, // Type assertion for cache-manager-redis-store
        host: configService.get<string>('REDIS_HOST'),
        port: configService.get<number>('REDIS_PORT'),
        ttl: 300, // seconds
      }),
      isGlobal: true,
    }),
    AppLoggerModule,
    CommonModule, // Contains global guards, filters, interceptors
    AuthModule,
    UsersModule,
    DatasetsModule,
    ModelsModule,
    FilesModule,
    PredictionsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}