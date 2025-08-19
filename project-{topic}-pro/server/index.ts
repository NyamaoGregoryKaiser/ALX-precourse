```typescript
import express, { Request, Response } from 'express';
import { Server } from 'socket.io';
import http from 'http';
import bodyParser from 'body-parser';
import cors from 'cors';
import { createUser, getUserByUsername } from './db'; // Example DB functions


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Replace with your frontend URL in production
  }
});

app.use(bodyParser.json());
app.use(cors());

// ...API routes for user creation etc...

app.post('/register', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;
        const user = await createUser(username, password);
        res.status(201).json(user);
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});


// Socket.IO handling
io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });

  socket.on('chat message', (msg) => {
    io.emit('chat message', msg); // Broadcast message to all clients
  });
});


server.listen(3001, () => {
  console.log('listening on *:3001');
});
```