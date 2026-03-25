import { PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, IsNotEmpty } from 'class-validator';

/**
 * Data Transfer Object (DTO) for updating an existing project.
 * It extends `CreateProjectDto` using `PartialType` to make all fields optional,
 * allowing for partial updates.
 */
export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  /**
   * Optional: New name for the project.
   * @example "Website Redesign - Final Phase"
   */
  @ApiProperty({
    description: 'Optional: New name for the project',
    example: 'API v2 Development',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Project name cannot be empty.', groups: ['update'] }) // Apply NotEmpty only during update if present
  @MaxLength(255, {
    message: 'Project name cannot be longer than 255 characters.',
  })
  name?: string;

  /**
   * Optional: New detailed description for the project.
   * @example "Refine existing UI elements and add new responsive layouts."
   */
  @ApiProperty({
    description: 'Optional: New detailed description of the project',
    example: 'Refactor existing API endpoints and introduce new features like task dependencies.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}