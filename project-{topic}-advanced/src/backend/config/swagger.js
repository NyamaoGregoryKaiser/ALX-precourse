```javascript
const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Product Catalog API',
        version: '1.0.0',
        description: 'A comprehensive API for managing products and users in a catalog system.',
        contact: {
            name: 'ALX Software Engineering',
            url: 'https://www.alxafrica.com',
            email: 'alx@example.com',
        },
    },
    servers: [
        {
            url: `http://localhost:${process.env.PORT || 5000}/api/v1`,
            description: 'Development server',
        },
        // Add more servers for staging/production environments
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter your JWT token in the format: `Bearer <token>`',
            },
        },
        schemas: {
            User: {
                type: 'object',
                required: ['email', 'password', 'role'],
                properties: {
                    id: { type: 'string', format: 'uuid', readOnly: true },
                    email: { type: 'string', format: 'email', description: 'User\'s email address' },
                    password: { type: 'string', format: 'password', writeOnly: true, description: 'User\'s password' },
                    role: { type: 'string', enum: ['user', 'admin'], default: 'user', description: 'User role' },
                    createdAt: { type: 'string', format: 'date-time', readOnly: true },
                    updatedAt: { type: 'string', format: 'date-time', readOnly: true },
                },
                example: {
                    id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
                    email: 'test@example.com',
                    role: 'user',
                    createdAt: '2023-01-01T10:00:00Z',
                    updatedAt: '2023-01-01T10:00:00Z',
                },
            },
            Product: {
                type: 'object',
                required: ['name', 'description', 'price', 'quantity'],
                properties: {
                    id: { type: 'string', format: 'uuid', readOnly: true },
                    name: { type: 'string', description: 'Name of the product' },
                    description: { type: 'string', description: 'Detailed description of the product' },
                    price: { type: 'number', format: 'float', description: 'Price of the product' },
                    quantity: { type: 'integer', description: 'Available quantity in stock' },
                    category: { type: 'string', nullable: true, description: 'Category of the product' },
                    imageUrl: { type: 'string', format: 'url', nullable: true, description: 'URL of the product image' },
                    createdAt: { type: 'string', format: 'date-time', readOnly: true },
                    updatedAt: { type: 'string', format: 'date-time', readOnly: true },
                },
                example: {
                    id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
                    name: 'Laptop X1',
                    description: 'High-performance laptop with 16GB RAM and 512GB SSD.',
                    price: 1200.00,
                    quantity: 50,
                    category: 'Electronics',
                    imageUrl: 'https://example.com/laptop.jpg',
                    createdAt: '2023-01-01T10:00:00Z',
                    updatedAt: '2023-01-01T10:00:00Z',
                },
            },
            Error: {
                type: 'object',
                properties: {
                    status: { type: 'string', example: 'error' },
                    statusCode: { type: 'integer', example: 400 },
                    message: { type: 'string', example: 'Something went wrong!' },
                },
            },
        },
    },
}

const options = {
    swaggerDefinition,
    apis: ['./src/backend/routes/*.js', './src/backend/models/*.js', './src/backend/docs/*.yaml'], // Path to the API docs
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
```