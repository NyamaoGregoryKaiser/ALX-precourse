```javascript
const {
    registerSchema,
    loginSchema,
    createProductSchema,
    updateProductSchema,
    updateUserSchema,
    validate
} = require('../../utils/validationSchemas');
const AppError = require('../../utils/appError');
const { StatusCodes } = require('http-status-codes');

describe('Validation Schemas', () => {

    // --- Register Schema Tests ---
    describe('registerSchema', () => {
        it('should validate a correct registration payload', () => {
            const payload = {
                email: 'test@example.com',
                password: 'password123',
                role: 'user'
            };
            const { error } = registerSchema.validate(payload);
            expect(error).toBeUndefined();
        });

        it('should allow registration without a role (defaults to user)', () => {
            const payload = {
                email: 'test2@example.com',
                password: 'password123'
            };
            const { error } = registerSchema.validate(payload);
            expect(error).toBeUndefined();
        });

        it('should invalidate if email is missing', () => {
            const payload = { password: 'password123' };
            const { error } = registerSchema.validate(payload);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Email is required.');
        });

        it('should invalidate if password is missing', () => {
            const payload = { email: 'test@example.com' };
            const { error } = registerSchema.validate(payload);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Password is required.');
        });

        it('should invalidate if email is not a valid format', () => {
            const payload = { email: 'invalid-email', password: 'password123' };
            const { error } = registerSchema.validate(payload);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Email must be a valid email address.');
        });

        it('should invalidate if password is too short', () => {
            const payload = { email: 'test@example.com', password: 'short' };
            const { error } = registerSchema.validate(payload);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Password must be at least 8 characters long.');
        });

        it('should invalidate if role is "admin"', () => {
            const payload = {
                email: 'test@example.com',
                password: 'password123',
                role: 'admin'
            };
            const { error } = registerSchema.validate(payload);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('You cannot register as an admin directly.');
        });
    });

    // --- Login Schema Tests ---
    describe('loginSchema', () => {
        it('should validate a correct login payload', () => {
            const payload = {
                email: 'test@example.com',
                password: 'password123'
            };
            const { error } = loginSchema.validate(payload);
            expect(error).toBeUndefined();
        });

        it('should invalidate if email is missing', () => {
            const payload = { password: 'password123' };
            const { error } = loginSchema.validate(payload);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Email is required.');
        });

        it('should invalidate if password is missing', () => {
            const payload = { email: 'test@example.com' };
            const { error } = loginSchema.validate(payload);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Password is required.');
        });

        it('should invalidate if email is not a valid format', () => {
            const payload = { email: 'invalid-email', password: 'password123' };
            const { error } = loginSchema.validate(payload);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Email must be a valid email address.');
        });
    });

    // --- Create Product Schema Tests ---
    describe('createProductSchema', () => {
        const validProduct = {
            name: 'Laptop Pro',
            description: 'Powerful laptop for serious work.',
            price: 1500.00,
            quantity: 20,
            category: 'Electronics',
            imageUrl: 'http://example.com/laptop.jpg'
        };

        it('should validate a correct product payload', () => {
            const { error } = createProductSchema.validate(validProduct);
            expect(error).toBeUndefined();
        });

        it('should allow optional fields to be missing or null/empty string', () => {
            const payload = {
                name: 'Basic Chair',
                description: 'A simple chair for daily use.',
                price: 50.00,
                quantity: 100
            };
            const { error } = createProductSchema.validate(payload);
            expect(error).toBeUndefined();

            const payloadWithNulls = {
                ...payload,
                category: null,
                imageUrl: ''
            };
            const { error: errorWithNulls } = createProductSchema.validate(payloadWithNulls);
            expect(errorWithNulls).toBeUndefined();
        });

        it('should invalidate if name is missing', () => {
            const { name, ...rest } = validProduct;
            const { error } = createProductSchema.validate(rest);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Product name is required.');
        });

        it('should invalidate if price is negative', () => {
            const payload = { ...validProduct, price: -10.00 };
            const { error } = createProductSchema.validate(payload);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Price cannot be negative.');
        });

        it('should invalidate if quantity is not an integer', () => {
            const payload = { ...validProduct, quantity: 10.5 };
            const { error } = createProductSchema.validate(payload);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Quantity must be an integer.');
        });

        it('should invalidate if image URL is not a valid URI', () => {
            const payload = { ...validProduct, imageUrl: 'not-a-url' };
            const { error } = createProductSchema.validate(payload);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Image URL must be a valid URL.');
        });
    });

    // --- Update Product Schema Tests ---
    describe('updateProductSchema', () => {
        it('should validate with a single field update', () => {
            const payload = { name: 'New Product Name' };
            const { error } = updateProductSchema.validate(payload);
            expect(error).toBeUndefined();
        });

        it('should validate with multiple field updates', () => {
            const payload = {
                price: 12.34,
                quantity: 50
            };
            const { error } = updateProductSchema.validate(payload);
            expect(error).toBeUndefined();
        });

        it('should invalidate if no fields are provided', () => {
            const payload = {};
            const { error } = updateProductSchema.validate(payload);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('At least one field must be provided for update.');
        });

        it('should invalidate if price is negative', () => {
            const payload = { price: -5.00 };
            const { error } = updateProductSchema.validate(payload);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Price cannot be negative.');
        });
    });

    // --- Update User Schema Tests ---
    describe('updateUserSchema', () => {
        it('should validate with a single field update (email)', () => {
            const payload = { email: 'updated@example.com' };
            const { error } = updateUserSchema.validate(payload);
            expect(error).toBeUndefined();
        });

        it('should validate with a single field update (role)', () => {
            const payload = { role: 'user' };
            const { error } = updateUserSchema.validate(payload);
            expect(error).toBeUndefined();
        });

        it('should validate with multiple field updates', () => {
            const payload = {
                email: 'newmail@example.com',
                role: 'admin'
            };
            const { error } = updateUserSchema.validate(payload);
            expect(error).toBeUndefined();
        });

        it('should invalidate if role is not "user" or "admin"', () => {
            const payload = { role: 'superadmin' };
            const { error } = updateUserSchema.validate(payload);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('Role must be either "user" or "admin".');
        });

        it('should invalidate if no fields are provided', () => {
            const payload = {};
            const { error } = updateUserSchema.validate(payload);
            expect(error).toBeDefined();
            expect(error.details[0].message).toContain('At least one field must be provided for user update.');
        });
    });

    // --- Validate Middleware Tests ---
    describe('validate middleware', () => {
        let mockReq, mockRes, mockNext;

        beforeEach(() => {
            mockReq = { body: {} };
            mockRes = {};
            mockNext = jest.fn();
        });

        it('should call next if validation passes', () => {
            mockReq.body = { email: 'valid@example.com', password: 'validpassword' };
            validate(loginSchema)(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalledWith(); // Called without an error
        });

        it('should call next with an AppError if validation fails', () => {
            mockReq.body = { email: 'invalid-email' }; // Missing password, invalid email format
            validate(loginSchema)(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            const error = mockNext.mock.calls[0][0];
            expect(error.statusCode).toBe(StatusCodes.BAD_REQUEST);
            expect(error.message).toContain('Email must be a valid email address.');
            expect(error.message).toContain('Password is required.');
        });

        it('should return error details for multiple validation failures', () => {
            mockReq.body = { email: 'invalid', password: '123' };
            validate(registerSchema)(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            const error = mockNext.mock.calls[0][0];
            expect(error.message).toContain('Email must be a valid email address.');
            expect(error.message).toContain('Password must be at least 8 characters long.');
        });
    });
});
```