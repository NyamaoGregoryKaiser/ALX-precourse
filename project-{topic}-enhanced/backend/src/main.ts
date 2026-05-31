```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { AllExceptionsFilter } from './shared/filters/global-exception.filter';
import { Logger } from 'winston';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({
      instance: winston.createLogger({
        level: 'info',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple(),
            ),
          }),
          new winston.transports.File({ filename: 'error.log', level: 'error' }),
          new winston.transports.File({ filename: 'combined.log' }),
        ],
      }),
    }),
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('APP_PORT');
  const env = configService.get<string>('NODE_ENV');
  const appName = configService.get<string>('APP_NAME');

  app.use(helmet()); // Security middleware
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN'), // e.g., http://localhost:3000
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strips away properties that are not defined in the DTO
    forbidNonWhitelisted: true, // Throws an error if non-whitelisted properties are sent
    transform: true, // Automatically transform payloads to DTO instances
    disableErrorMessages: env === 'production', // Disable detailed errors in production
  }));

  // Global exception filter for consistent error responses
  const logger = app.get(WINSTON_MODULE_PROVIDER) as Logger;
  app.useGlobalFilters(new AllExceptionsFilter(logger));

  // Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle(`${appName} API`)
    .setDescription('The CMS API documentation')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(port);
  app.get(Logger).log(`Application is running on: ${await app.getUrl()}`);
  app.get(Logger).log(`Environment: ${env}`);
  app.get(Logger).log(`Swagger Docs available at: ${await app.getUrl()}/api-docs`);
}
bootstrap();
```