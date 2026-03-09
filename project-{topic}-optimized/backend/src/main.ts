```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { config } from 'dotenv';
import { CustomLogger } from './common/logger/custom-logger.service';

config(); // Load environment variables from .env file

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new CustomLogger(), // Use custom logger
  });

  // Security Middlewares
  app.use(helmet());
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*', // Be specific in production
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strips away properties that are not defined in the DTO
      forbidNonWhitelisted: true, // Throws an error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
    }),
  );

  // Global Filters
  app.useGlobalFilters(new AllExceptionsFilter(app.getHttpAdapter()));

  // Global Interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger API Documentation
  const options = new DocumentBuilder()
    .setTitle('ALX CMS API')
    .setDescription('The Content Management System API description')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'accessToken', // This name is used in @ApiBearerAuth() decorator
    )
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger documentation available at: ${await app.getUrl()}/api-docs`);
}
bootstrap();
```