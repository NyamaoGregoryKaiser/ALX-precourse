```typescript
import { Request, Response, NextFunction } from 'express';
import { postService } from '../services/post.service';
import { logger } from '../utils/logger';
import { UserRole } from '../entities/Role';

class PostController {
  public async createPost(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, content } = req.body;
      const newPost = await postService.createPost(title, content, req.user!.id);
      res.status(201).json(newPost);
    } catch (error) {
      next(error);
    }
  }

  public async getAllPosts(req: Request, res: Response, next: NextFunction) {
    try {
      const posts = await postService.getAllPosts();
      // Optionally map to DTO if sensitive author info is present
      res.status(200).json(posts);
    } catch (error) {
      next(error);
    }
  }

  public async getPost(req: Request, res: Response, next: NextFunction) {
    try {
      const { postId } = req.params;
      const post = await postService.getPostById(postId);
      res.status(200).json(post);
    } catch (error) {
      next(error);
    }
  }

  public async updatePost(req: Request, res: Response, next: NextFunction) {
    try {
      const { postId } = req.params;
      const { title, content } = req.body;
      const updatedPost = await postService.updatePost(
        postId,
        { title, content },
        req.user!.id,
        req.user!.role.name as UserRole
      );
      res.status(200).json(updatedPost);
    } catch (error) {
      next(error);
    }
  }

  public async deletePost(req: Request, res: Response, next: NextFunction) {
    try {
      const { postId } = req.params;
      await postService.deletePost(
        postId,
        req.user!.id,
        req.user!.role.name as UserRole
      );
      res.status(200).json({ message: 'Post deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }
}

export const postController = new PostController();
```