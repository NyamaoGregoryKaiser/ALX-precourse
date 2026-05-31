```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PostStatus } from '../entities/post.entity';

export class UpdatePostDto extends PartialType(CreatePostDto) {
  @ApiProperty({ example: 'Updated Title', description: 'New title of the post', required: false, maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiProperty({ example: 'Updated content of the post.', description: 'New full content of the post', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ example: 'https://example.com/new_image.jpg', description: 'New URL for the post thumbnail', required: false })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiProperty({ enum: PostStatus, description: 'New status of the post', required: false })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @ApiProperty({ example: 'f0e9d8c7-b6a5-4321-fedc-ba9876543210', description: 'New UUID of the category', required: false })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ example: '2023-11-20T10:00:00.000Z', description: 'Date when the post was published', required: false })
  @IsOptional()
  @IsDateString()
  publishedAt?: Date;
}
```