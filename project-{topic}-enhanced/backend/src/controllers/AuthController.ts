```typescript
import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import logger from '../utils/logger';

const authService = new AuthService();

/**
 * Controller for handling authentication-related requests (register, login).
 * Routes incoming requests to the AuthService and sends back appropriate responses.
 */
export class AuthController {
  /**
   * Handles user registration.
   * @param req Express Request object (expects email, password, role in body)
   * @param res Express Response object
   */
  async register(req: Request, res: Response): Promise<Response> {
    const { email, password, role } = req.body;

    if (!email || !password) {
      logger.warn('Registration attempt failed: Missing email or password.');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
      const newUser = await authService.register(email, password, role);
      if (!newUser) {
        return res.status(409).json({ message: 'User with this email already exists' });
      }
      // Omit password from response
      const { password: _, ...userWithoutPassword } = newUser;
      return res.status(201).json({ message: 'User registered successfully', user: userWithoutPassword });
    } catch (error: any) {
      logger.error(`Registration error: ${error.message}`, { email });
      return res.status(500).json({ message: 'Failed to register user', error: error.message });
    }
  }

  /**
   * Handles user login.
   * @param req Express Request object (expects email, password in body)
   * @param res Express Response object
   */
  async login(req: Request, res: Response): Promise<Response> {
    const { email, password } = req.body;

    if (!email || !password) {
      logger.warn('Login attempt failed: Missing email or password.');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
      const result = await authService.login(email, password);
      if (!result) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      return res.status(200).json({ message: 'Login successful', token: result.token, role: result.role });
    } catch (error: any) {
      logger.error(`Login error: ${error.message}`, { email });
      return res.status(500).json({ message: 'Failed to login', error: error.message });
    }
  }
}
```