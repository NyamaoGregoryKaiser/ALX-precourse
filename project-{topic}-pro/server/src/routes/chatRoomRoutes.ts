import { Router } from 'express';
import chatRoomController from '../controllers/chatRoomController';
import { authenticateToken } from '../middleware/authMiddleware';
import { catchAsync } from '../utils/catchAsync';

const router = Router();

// Utility for wrapping async functions to catch errors
function catchAsync(fn: Function) {
    return (req: any, res: any, next: any) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

router.post('/', authenticateToken, catchAsync(chatRoomController.createChatRoom));
router.get('/', authenticateToken, catchAsync(chatRoomController.getUserChatRooms));
router.get('/:roomId', authenticateToken, catchAsync(chatRoomController.getChatRoomDetails));
router.get('/:roomId/messages', authenticateToken, catchAsync(chatRoomController.getChatRoomMessages));
router.post('/:roomId/participants', authenticateToken, catchAsync(chatRoomController.addParticipant));
router.delete('/:roomId/participants/:userIdToRemove', authenticateToken, catchAsync(chatRoomController.removeParticipant));
router.delete('/:roomId', authenticateToken, catchAsync(chatRoomController.deleteChatRoom)); // CRUD: Delete

export default router;