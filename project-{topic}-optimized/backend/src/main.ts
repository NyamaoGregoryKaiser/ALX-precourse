import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger, INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { LoggerService } from './utils/logger';

/**
 * Bootstraps the NestJS application.
 * Configures global pipes, filters, interceptors, Swagger, and starts the server.
 */
async function bootstrap() {
  const app: INestApplication = await NestFactory.create(AppModule, {
    bufferLogs: true, // Buffer logs until a custom logger is attached
  });

  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService); // Use custom Winston logger
  app.useLogger(logger);

  const port = configService.get<number>('PORT') || 3000;
  const apiPrefix = configService.get<string>('API_PREFIX') || 'api/v1';
  const environment = configService.get<string>('NODE_ENV') || 'development';

  // Apply Helmet for security headers
  app.use(helmet());

  // Enable CORS for frontend
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL') || 'http://localhost:5173', // Adjust as per frontend URL
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Set global API prefix
  app.setGlobalPrefix(apiPrefix);

  // Apply global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that are not defined in DTOs
      forbidNonWhitelisted: true, // Throw an error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit conversion of primitive types
      },
    }),
  );

  // Apply global exception filter for consistent error responses
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  // Apply global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Task Management API')
    .setDescription('API documentation for the Task Management System')
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
      'JWT-auth', // This name is used to refer to this security scheme in @ApiBearerAuth()
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  await app.listen(port);
  logger.log(`Application is running on: ${await app.getUrl()}`);
  logger.log(`Environment: ${environment}`);
  logger.log(`Swagger documentation available at: ${await app.getUrl()}/${apiPrefix}/docs`);
}

bootstrap();