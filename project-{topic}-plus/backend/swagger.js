```javascript
const appConfig = require('./src/config/app');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: appConfig.appName,
    version: '1.0.0',
    description: 'A comprehensive API for managing products and users, built with Node.js, Express, and PostgreSQL.',
    contact: {
      name: 'ALX Software Engineering',
      url: 'https://www.alxafrica.com',
      email: 'contact@alxafrica.com',
    },
  },
  servers: [
    {
      url: `http://localhost:${appConfig.port}/api/v1`,
      description: 'Development server',
    },
    {
      url: 'https://your-production-api.com/api/v1',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token in the format "Bearer TOKEN"',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Unique identifier for the user' },
          username: { type: 'string', description: 'Unique username' },
          email: { type: 'string', format: 'email', description: 'Unique email address' },
          role: { type: 'string', enum: ['user', 'admin'], description: 'Role of the user' },
          isActivated: { type: 'boolean', description: 'Account activation status' },
          lastLogin: { type: 'string', format: 'date-time', description: 'Timestamp of the last login' },
          createdAt: { type: 'string', format: 'date-time', description: 'Timestamp of user creation' },
          updatedAt: { type: 'string', format: 'date-time', description: 'Timestamp of last update' },
        },
        example: {
          id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
          username: 'johndoe',
          email: 'john.doe@example.com',
          role: 'user',
          isActivated: true,
          lastLogin: '2023-10-26T10:00:00Z',
          createdAt: '2023-10-25T15:30:00Z',
          updatedAt: '2023-10-26T10:00:00Z',
        },
      },
      UserInput: {
        type: 'object',
        properties: {
          username: { type: 'string', description: 'Unique username' },
          email: { type: 'string', format: 'email', description: 'Unique email address' },
          password: { type: 'string', format: 'password', description: 'User\'s password (min 6 characters)' },
          role: { type: 'string', enum: ['user', 'admin'], default: 'user', description: 'User\'s role' },
          isActivated: { type: 'boolean', description: 'Account activation status' },
        },
        required: ['username', 'email', 'password'],
        example: {
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'securepassword',
          role: 'user',
        },
      },
      UserWithProducts: {
        allOf: [
          { $ref: '#/components/schemas/User' },
          {
            type: 'object',
            properties: {
              products: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    price: { type: 'number', format: 'float' },
                    stock: { type: 'integer' },
                    category: { type: 'string' },
                  }
                },
                description: 'List of products owned by the user'
              }
            }
          }
        ],
        example: {
          id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
          username: 'johndoe',
          email: 'john.doe@example.com',
          role: 'user',
          isActivated: true,
          lastLogin: '2023-10-26T10:00:00Z',
          createdAt: '2023-10-25T15:30:00Z',
          updatedAt: '2023-10-26T10:00:00Z',
          products: [
            { id: 'p1', name: 'Product A', price: 10.99, stock: 100, category: 'Gadgets' },
            { id: 'p2', name: 'Product B', price: 25.00, stock: 50, category: 'Books' }
          ]
        }
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Unique identifier for the product' },
          name: { type: 'string', description: 'Name of the product' },
          description: { type: 'string', description: 'Description of the product' },
          price: { type: 'number', format: 'float', description: 'Price of the product' },
          stock: { type: 'integer', description: 'Current stock quantity' },
          category: { type: 'string', description: 'Product category' },
          imageUrl: { type: 'string', format: 'url', description: 'URL of the product image' },
          userId: { type: 'string', format: 'uuid', description: 'ID of the user who owns/created the product' },
          owner: { $ref: '#/components/schemas/UserReference', description: 'Details of the product owner' },
          createdAt: { type: 'string', format: 'date-time', description: 'Timestamp of product creation' },
          updatedAt: { type: 'string', format: 'date-time', description: 'Timestamp of last update' },
        },
        example: {
          id: '1a2b3c4d-5e6f-7890-abcd-ef1234567890',
          name: 'Example Product',
          description: 'A brief description of the example product.',
          price: 19.99,
          stock: 100,
          category: 'General',
          imageUrl: 'https://example.com/image.jpg',
          userId: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
          owner: { id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', username: 'johndoe', email: 'john.doe@example.com' },
          createdAt: '2023-10-25T15:30:00Z',
          updatedAt: '2023-10-25T15:30:00Z',
        },
      },
      ProductInput: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the product' },
          description: { type: 'string', description: 'Description of the product' },
          price: { type: 'number', format: 'float', description: 'Price of the product' },
          stock: { type: 'integer', description: 'Current stock quantity' },
          category: { type: 'string', description: 'Product category' },
          imageUrl: { type: 'string', format: 'url', description: 'URL of the product image' },
        },
        required: ['name', 'price', 'stock'],
        example: {
          name: 'New Product',
          description: 'A brand new product for sale.',
          price: 29.99,
          stock: 50,
          category: 'Electronics',
          imageUrl: 'https://example.com/new-product.jpg',
        },
      },
      UserReference: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          username: { type: 'string' },
          email: { type: 'string', format: 'email' },
        },
        example: {
          id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
          username: 'johndoe',
          email: 'john.doe@example.com',
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication token is missing or invalid',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'Not authorized, token failed.' },
              },
            },
          },
        },
      },
      Forbidden: {
        description: 'User does not have the necessary permissions for the resource',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'User role "user" is not authorized to access this route.' },
              },
            },
          },
        },
      },
      NotFound: {
        description: 'The requested resource was not found',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'Resource with ID 123 not found.' },
              },
            },
          },
        },
      },
      BadRequest: {
        description: 'Invalid input or request parameters',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'Validation error: "name" is required.' },
              },
            },
          },
        },
      },
      Conflict: {
        description: 'Resource already exists',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'User with this email already exists.' },
              },
            },
          },
        },
      },
      ServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'Something went wrong on the server.' },
                stack: { type: 'string', description: 'Stack trace (only in development)' }
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
  apis: ['./src/controllers/*.js'], // Path to the API docs
};

module.exports = options;
```