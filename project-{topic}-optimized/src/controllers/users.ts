```typescript
import { Request, Response } from 'express';
import { pool } from '../database'; // Assuming you have a database connection pool

export const getUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: 'Failed to retrieve user' });
    }
};

// Implement createUser, updateUser, deleteUser similarly
```