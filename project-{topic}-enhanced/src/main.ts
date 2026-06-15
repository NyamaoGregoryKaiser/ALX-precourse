```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { CustomLogger } from './common/logger/custom-logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // Buffer logs until custom logger is attached
  });

  // Use custom logger
  app.useLogger(app.get(CustomLogger));

  // Global validation pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that do not have any decorators
      forbidNonWhitelisted: true, // Throw an error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit conversion for primitive types
      },
    }),
  );

  // Global exception filter for consistent error responses
  app.useGlobalFilters(new HttpExceptionFilter(app.get(CustomLogger)));

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor(app.get(CustomLogger)));

  // Configure Swagger (API Documentation)
  const config = new DocumentBuilder()
    .setTitle('Task Management API')
    .setDescription('Backend for a mobile task management application')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'access-token', // This name is important for `ApiBearerAuth()` decorator
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Get port from configuration service
  const configService = app.get('ConfigService'); // Access ConfigService directly
  const port = configService.get<number>('PORT');

  await app.listen(port);
  Logger.log(`Application is running on: ${await app.getUrl()}`, 'Bootstrap');
  Logger.log(`Swagger documentation available at: ${await app.getUrl()}/api`, 'Bootstrap');
}
bootstrap();
```