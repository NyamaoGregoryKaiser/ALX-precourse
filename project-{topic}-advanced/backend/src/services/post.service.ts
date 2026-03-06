```typescript
import { AppDataSource } from '../config/database';
import { Post } from '../entities/Post';
import { User } from '../entities/User';
import { UserRole } from '../entities/Role';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/apiErrors';
import { logger } from '../utils/logger';

class PostService {
  private postRepository = AppDataSource.getRepository(Post);
  private userRepository = AppDataSource.getRepository(User);

  public async createPost(title: string, content: string, authorId: string): Promise<Post> {
    const author = await this.userRepository.findOneBy({ id: authorId });
    if (!author) {
      throw new BadRequestError('Author not found.');
    }

    const newPost = this.postRepository.create({ title, content, author });
    return this.postRepository.save(newPost);
  }

  public async getAllPosts(): Promise<Post[]> {
    return this.postRepository.find({ relations: ['author'] });
  }

  public async getPostById(postId: string): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['author'],
    });
    if (!post) {
      throw new NotFoundError('Post not found.');
    }
    return post;
  }

  public async updatePost(
    postId: string,
    updateData: Partial<Post>,
    requestorId: string,
    requestorRoleName: UserRole
  ): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['author'],
    });

    if (!post) {
      throw new NotFoundError('Post not found.');
    }

    // Authorization: Only the author or an admin can update a post
    if (post.author.id !== requestorId && requestorRoleName !== UserRole.ADMIN) {
      throw new ForbiddenError('You do not have permission to update this post.');
    }

    if (updateData.title) post.title = updateData.title;
    if (updateData.content) post.content = updateData.content;

    return this.postRepository.save(post);
  }

  public async deletePost(
    postId: string,
    requestorId: string,
    requestorRoleName: UserRole
  ): Promise<void> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['author'],
    });

    if (!post) {
      throw new NotFoundError('Post not found.');
    }

    // Authorization: Only the author or an admin can delete a post
    if (post.author.id !== requestorId && requestorRoleName !== UserRole.ADMIN) {
      throw new ForbiddenError('You do not have permission to delete this post.');
    }

    await this.postRepository.remove(post);
  }
}

export const postService = new PostService();
```