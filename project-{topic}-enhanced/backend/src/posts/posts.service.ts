```typescript
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post, PostStatus } from './entities/post.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  async create(createPostDto: CreatePostDto, authorId: string): Promise<Post> {
    const author = await this.usersRepository.findOneBy({ id: authorId });
    if (!author) {
      throw new NotFoundException(`Author with ID "${authorId}" not found.`);
    }

    let category: Category = null;
    if (createPostDto.categoryId) {
      category = await this.categoriesRepository.findOneBy({ id: createPostDto.categoryId });
      if (!category) {
        throw new BadRequestException(`Category with ID "${createPostDto.categoryId}" not found.`);
      }
    }

    const post = this.postsRepository.create({
      ...createPostDto,
      author: author,
      category: category,
      status: createPostDto.status || PostStatus.DRAFT,
      publishedAt: createPostDto.status === PostStatus.PUBLISHED ? new Date() : null,
    });
    return this.postsRepository.save(post);
  }

  async findAll(status?: PostStatus): Promise<Post[]> {
    const findOptions: any = { relations: ['author', 'category'] };
    if (status) {
      findOptions.where = { status };
    }
    return this.postsRepository.find(findOptions);
  }

  async findOne(id: string): Promise<Post> {
    const post = await this.postsRepository.findOne({ where: { id }, relations: ['author', 'category'] });
    if (!post) {
      throw new NotFoundException(`Post with ID "${id}" not found.`);
    }
    return post;
  }

  async update(id: string, updatePostDto: UpdatePostDto): Promise<Post> {
    const post = await this.postsRepository.findOne({ where: { id }, relations: ['author', 'category'] });
    if (!post) {
      throw new NotFoundException(`Post with ID "${id}" not found.`);
    }

    if (updatePostDto.categoryId) {
      const category = await this.categoriesRepository.findOneBy({ id: updatePostDto.categoryId });
      if (!category) {
        throw new BadRequestException(`Category with ID "${updatePostDto.categoryId}" not found.`);
      }
      post.category = category;
    } else if (updatePostDto.categoryId === null) { // Allow disassociating category
      post.category = null;
    }

    // Update publishedAt if status changes to PUBLISHED
    if (updatePostDto.status === PostStatus.PUBLISHED && post.status !== PostStatus.PUBLISHED) {
      post.publishedAt = new Date();
    } else if (updatePostDto.status !== PostStatus.PUBLISHED && post.status === PostStatus.PUBLISHED) {
      // If status changes from PUBLISHED to something else, clear publishedAt (optional behavior)
      post.publishedAt = null;
    }

    Object.assign(post, updatePostDto);
    return this.postsRepository.save(post);
  }

  async remove(id: string): Promise<void> {
    const result = await this.postsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Post with ID "${id}" not found.`);
    }
  }
}
```