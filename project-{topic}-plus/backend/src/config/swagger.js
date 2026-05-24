```javascript
const swaggerJsdoc = require('swagger-jsdoc');
const { config } = require('./config');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'CMS API Documentation',
    version: '1.0.0',
    description: 'This is a RESTful API for a Content Management System (CMS).',
    contact: {
      name: 'Your Name',
      email: 'your.email@example.com',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}${config.apiPrefix}`,
      description: 'Development server',
    },
    {
      url: `https://your-production-api.com${config.apiPrefix}`,
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT Bearer token **_only_**',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' },
          username: { type: 'string', example: 'johndoe' },
          email: { type: 'string', format: 'email', example: 'johndoe@example.com' },
          role: { type: 'string', enum: ['viewer', 'editor', 'admin'], example: 'editor' },
          isEmailVerified: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        readOnly: ['id', 'createdAt', 'updatedAt'],
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'd290f1ee-6c54-4b01-90e6-d701748f0852' },
          name: { type: 'string', example: 'Technology' },
          slug: { type: 'string', example: 'technology' },
          description: { type: 'string', example: 'Articles about technology.' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        readOnly: ['id', 'createdAt', 'updatedAt'],
      },
      Post: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'd290f1ee-6c54-4b01-90e6-d701748f0853' },
          title: { type: 'string', example: 'The Future of Web Development' },
          slug: { type: 'string', example: 'future-web-development' },
          content: { type: 'string', example: '<p>Content of the post...</p>' },
          excerpt: { type: 'string', example: 'A brief overview of future trends.' },
          status: { type: 'string', enum: ['draft', 'published', 'archived'], example: 'published' },
          publishedAt: { type: 'string', format: 'date-time', nullable: true },
          featuredImage: { type: 'string', format: 'uri', nullable: true, example: 'https://example.com/webdev.jpg' },
          authorId: { type: 'string', format: 'uuid', example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' },
          categoryId: { type: 'string', format: 'uuid', nullable: true, example: 'd290f1ee-6c54-4b01-90e6-d701748f0852' },
          author: { '$ref': '#/components/schemas/User' }, // Populated author details
          category: { '$ref': '#/components/schemas/Category' }, // Populated category details
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        readOnly: ['id', 'authorId', 'createdAt', 'updatedAt', 'author', 'category'], // authorId is usually set by system
      },
      AuthTokens: {
        type: 'object',
        properties: {
          access: {
            type: 'object',
            properties: {
              token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
              expires: { type: 'string', format: 'date-time' },
            },
          },
          refresh: {
            type: 'object',
            properties: {
              token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
              expires: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                code: { type: 'integer', example: 401 },
                message: { type: 'string', example: 'Please authenticate' },
              },
            },
          },
        },
      },
      Forbidden: {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                code: { type: 'integer', example: 403 },
                message: { type: 'string', example: 'Forbidden: You do not have the necessary permissions' },
              },
            },
          },
        },
      },
      NotFound: {
        description: 'Not Found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                code: { type: 'integer', example: 404 },
                message: { type: 'string', example: 'Not found' },
              },
            },
          },
        },
      },
      BadRequest: {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                code: { type: 'integer', example: 400 },
                message: { type: 'string', example: 'Invalid input data' },
              },
            },
          },
        },
      },
      Conflict: {
        description: 'Conflict',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                code: { type: 'integer', example: 409 },
                message: { type: 'string', example: 'Resource already exists' },
              },
            },
          },
        },
      },
    },
  },
};

const options = {
  swaggerDefinition,
  apis: ['./src/routes/v1/*.js', './src/models/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
```