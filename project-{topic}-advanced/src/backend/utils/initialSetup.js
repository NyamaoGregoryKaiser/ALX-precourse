```javascript
const User = require('../models/User');
const logger = require('../utils/logger');
require('dotenv').config(); // Ensure dotenv is loaded

exports.createAdminUser = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword';

        const adminExists = await User.findOne({ where: { email: adminEmail } });

        if (!adminExists) {
            logger.info('Admin user not found, creating a new admin user...');
            await User.create({
                email: adminEmail,
                password: adminPassword, // Password will be hashed by the beforeCreate hook
                role: 'admin'
            }, {
                context: { isAdminCreation: true } // Pass context to bypass role validation for admin creation
            });
            logger.info(`Admin user with email ${adminEmail} created successfully.`);
        } else {
            logger.info(`Admin user with email ${adminEmail} already exists.`);
        }
    } catch (error) {
        logger.error('Error during admin user setup:', error);
        // Do not throw error here to prevent server from crashing if admin creation fails
    }
};
```