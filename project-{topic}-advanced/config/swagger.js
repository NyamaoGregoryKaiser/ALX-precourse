```javascript
const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./config');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Enterprise Security System API Documentation',
    version: '1.0.0',
    description: 'This is a comprehensive API for an enterprise security system. It features JWT authentication, RBAC authorization, rate limiting, and robust error handling.',
    contact: {
      name: 'ALX Software Engineering',
      url: 'https://www.alxafrica.com/',
      email: 'contact@alxafrica.com',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}/api/v1`,
      description: 'Development Server',
    },
    {
      url: 'https://your-production-url.com/api/v1',
      description: 'Production Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', readOnly: true },
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
          role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
          createdAt: { type: 'string', format: 'date-time', readOnly: true },
          updatedAt: { type: 'string', format: 'date-time', readOnly: true },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer', readOnly: true },
          name: { type: 'string', example: 'Laptop Pro' },
          description: { type: 'string', example: 'High-performance laptop for professionals.' },
          price: { type: 'number', format: 'float', example: 1200.00 },
          stock: { type: 'integer', example: 50 },
          createdAt: { type: 'string', format: 'date-time', readOnly: true },
          updatedAt: { type: 'string', format: 'date-time', readOnly: true },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'integer', readOnly: true },
          userId: { type: 'integer', example: 1 },
          productId: { type: 'integer', example: 1 },
          quantity: { type: 'integer', example: 2 },
          totalPrice: { type: 'number', format: 'float', example: 2400.00, readOnly: true },
          status: { type: 'string', enum: ['pending', 'completed', 'cancelled'], example: 'pending' },
          createdAt: { type: 'string', format: 'date-time', readOnly: true },
          updatedAt: { type: 'string', format: 'date-time', readOnly: true },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          tokens: {
            type: 'object',
            properties: {
              access: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  expires: { type: 'string', format: 'date-time' },
                },
              },
              refresh: {
                type: 'object',
                properties: {
                  token: { type: 'string' },
                  expires: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          code: { type: 'integer', example: 404 },
          message: { type: 'string', example: 'Not Found' },
        },
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: [
    './src/routes/*.js',       // Path to the API routes files
    './src/models/*.js',       // Path to the model definitions (optional, for schema inference)
  ],
};

const swaggerSpec = swaggerJsdoc(options);

// Function to generate and save swagger.json
const generateSwaggerDoc = () => {
  console.log(JSON.stringify(swaggerSpec, null, 2));
};

module.exports = swaggerSpec;
module.exports.generateSwaggerDoc = generateSwaggerDoc;
```