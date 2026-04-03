```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggerService } from './logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
import * as dotenv from 'dotenv';
import { RedisService } from './caching/redis.service'; // Ensure this is imported for types

async function bootstrap() {
  dotenv.config(); // Load .env file manually for main.ts access

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // Buffer logs until custom logger is attached
  });

  const configService = app.get(ConfigService);
  const loggerService = app.get(LoggerService);
  const redisService = app.get(RedisService); // Get Redis service instance

  app.useLogger(loggerService); // Use custom Winston logger

  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL') || 'http://localhost:3001', // Allow frontend origin
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips away properties that are not defined in the DTO
      forbidNonWhitelisted: true, // Throws an error if non-whitelisted properties are sent
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Convert primitives like string to number
      },
    }),
  );

  // Global Filters
  app.useGlobalFilters(new AllExceptionsFilter(loggerService));

  // Global Interceptors (Caching)
  // Note: For a global cache interceptor, you'd typically apply it carefully
  // as it caches ALL GET requests. We'll apply it more selectively or manage
  // cache keys more granularly. For demo, it's global.
  // app.useGlobalInterceptors(new CacheInterceptor(redisService));

  // Base API prefix
  app.setGlobalPrefix('api');

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('ScrapeMaster API')
    .setDescription('The ScrapeMaster web scraping platform API documentation')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'accessToken', // This name is used to reference it in @ApiBearerAuth()
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'ScrapeMaster API Docs',
    swaggerOptions: {
      persistAuthorization: true, // Keep auth token even after refresh
    },
  });

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);
  loggerService.log(`Application is running on: ${await app.getUrl()}`);
  loggerService.log(`Swagger docs available at: ${await app.getUrl()}/api-docs`);
}
bootstrap();
```