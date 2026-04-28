import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as helmet from 'helmet';
import * as rateLimit from 'express-rate-limit';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppLogger } from './common/logger/app-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // Buffer logs until custom logger is initialized
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  const apiGlobalPrefix = configService.get<string>('API_GLOBAL_PREFIX') || 'api/v1';
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';

  // Use custom logger
  app.useLogger(app.get(AppLogger));

  // Global prefix for API endpoints
  app.setGlobalPrefix(apiGlobalPrefix);

  // Security Middlewares
  app.use(helmet());
  app.enableCors({
    origin: '*', // Adjust for production environments, e.g., ['http://localhost:3001', 'https://yourfrontend.com']
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Rate Limiting
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // max 100 requests per 15 minutes per IP
      message: 'Too many requests from this IP, please try again after 15 minutes',
    }),
  );

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that are not defined in DTOs
      forbidNonWhitelisted: true, // Throw an error if non-whitelisted properties are sent
      transform: true, // Automatically transform payloads to DTO instances
      disableErrorMessages: nodeEnv === 'production', // Disable detailed error messages in production
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter(app.get(AppLogger)));

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('ML Utilities System API')
    .setDescription('API documentation for the ML Utilities System')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiGlobalPrefix}/docs`, app, document);

  await app.listen(port);
  Logger.log(`Application is running on: http://localhost:${port}/${apiGlobalPrefix}`);
  Logger.log(`Swagger Docs available at: http://localhost:${port}/${apiGlobalPrefix}/docs`);
}
bootstrap();