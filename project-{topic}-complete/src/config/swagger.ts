import swaggerJsdoc from 'swagger-jsdoc';
import { PORT } from './index';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mobile App Backend API',
      version: '1.0.0',
      description: 'A comprehensive backend API for a mobile application, built with Node.js, Express, and TypeScript.',
      contact: {
        name: 'ALX Software Engineering Program',
        url: 'https://www.alxafrica.com/',
        email: 'support@alxafrica.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}/api/v1`,
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
          description: 'Enter your JWT token in the format: Bearer <token>',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            name: { type: 'string', example: 'ValidationError' },
            message: { type: 'string', example: 'Invalid input data.' },
            stack: { type: 'string', example: 'Error: Invalid input data at ... (only in development)' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', readOnly: true },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
            createdAt: { type: 'string', format: 'date-time', readOnly: true },
            updatedAt: { type: 'string', format: 'date-time', readOnly: true },
          },
          required: ['email', 'firstName', 'lastName'],
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', readOnly: true },
            name: { type: 'string', example: 'Smartphone X' },
            description: { type: 'string', example: 'A cutting-edge smartphone with advanced features.' },
            price: { type: 'number', format: 'float', example: 799.99 },
            stock: { type: 'integer', example: 150 },
            imageUrl: { type: 'string', format: 'url', example: 'http://example.com/images/phone-x.jpg' },
            category: { $ref: '#/components/schemas/CategoryRef' },
            createdAt: { type: 'string', format: 'date-time', readOnly: true },
            updatedAt: { type: 'string', format: 'date-time', readOnly: true },
          },
          required: ['name', 'description', 'price', 'stock'],
        },
        ProductCreate: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Smartphone X' },
            description: { type: 'string', example: 'A cutting-edge smartphone with advanced features.' },
            price: { type: 'number', format: 'float', example: 799.99 },
            stock: { type: 'integer', example: 150 },
            imageUrl: { type: 'string', format: 'url', example: 'http://example.com/images/phone-x.jpg' },
            categoryId: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' },
          },
          required: ['name', 'description', 'price', 'stock'],
        },
        ProductUpdate: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Smartphone X' },
            description: { type: 'string', example: 'A cutting-edge smartphone with advanced features.' },
            price: { type: 'number', format: 'float', example: 799.99 },
            stock: { type: 'integer', example: 150 },
            imageUrl: { type: 'string', format: 'url', example: 'http://example.com/images/phone-x.jpg' },
            categoryId: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' },
          },
        },
        Category: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', readOnly: true },
            name: { type: 'string', example: 'Electronics' },
            description: { type: 'string', example: 'Devices and gadgets.' },
            createdAt: { type: 'string', format: 'date-time', readOnly: true },
            updatedAt: { type: 'string', format: 'date-time', readOnly: true },
          },
          required: ['name'],
        },
        CategoryRef: { // Simplified schema for nested references
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', readOnly: true },
            name: { type: 'string', example: 'Electronics' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', readOnly: true },
            user: { $ref: '#/components/schemas/UserRef' },
            orderItems: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
            totalAmount: { type: 'number', format: 'float', example: 1599.98 },
            status: { type: 'string', enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'], example: 'pending' },
            shippingAddress: { type: 'string', example: '123 Main St, Anytown, USA' },
            createdAt: { type: 'string', format: 'date-time', readOnly: true },
            updatedAt: { type: 'string', format: 'date-time', readOnly: true },
          },
          required: ['userId', 'orderItems', 'totalAmount', 'shippingAddress'],
        },
        OrderItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', readOnly: true },
            product: { $ref: '#/components/schemas/ProductRef' },
            quantity: { type: 'integer', example: 2 },
            price: { type: 'number', format: 'float', example: 799.99 },
            createdAt: { type: 'string', format: 'date-time', readOnly: true },
            updatedAt: { type: 'string', format: 'date-time', readOnly: true },
          },
          required: ['productId', 'quantity', 'price'],
        },
        OrderItemInput: { // For creating orders
          type: 'object',
          properties: {
            productId: { type: 'string', format: 'uuid', example: 'c1d2e3f4-a5b6-7890-1234-567890abcdef' },
            quantity: { type: 'integer', example: 1 },
          },
          required: ['productId', 'quantity'],
        },
        UserRef: { // Simplified schema for nested references
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', readOnly: true },
            email: { type: 'string', format: 'email', example: 'user@example.com' },
          },
        },
        ProductRef: { // Simplified schema for nested references
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', readOnly: true },
            name: { type: 'string', example: 'Smartphone X' },
            price: { type: 'number', format: 'float', example: 799.99 },
          },
        },
        Review: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', readOnly: true },
            user: { $ref: '#/components/schemas/UserRef' },
            product: { $ref: '#/components/schemas/ProductRef' },
            rating: { type: 'integer', minimum: 1, maximum: 5, example: 5 },
            comment: { type: 'string', example: 'Excellent product, highly recommended!' },
            createdAt: { type: 'string', format: 'date-time', readOnly: true },
            updatedAt: { type: 'string', format: 'date-time', readOnly: true },
          },
          required: ['userId', 'productId', 'rating'],
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/api/v1/routes/*.ts',
    './src/api/v1/controllers/*.ts', // For JSDoc comments directly on controller methods
    './src/database/entities/*.ts' // For entity schema definitions via ts-to-json-schema
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;