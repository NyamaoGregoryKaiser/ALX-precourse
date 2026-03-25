import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object (DTO) for creating a new project.
 * Defines the expected structure and validation rules for new project data.
 */
export class CreateProjectDto {
  /**
   * The name of the project. Must be a non-empty string and up to 255 characters.
   * @example "New Feature Implementation"
   */
  @ApiProperty({
    description: 'Name of the project',
    example: 'Task Management Frontend Development',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'Project name cannot be empty.' })
  @MaxLength(255, {
    message: 'Project name cannot be longer than 255 characters.',
  })
  name: string;

  /**
   * Optional: A detailed description of the project.
   * @example "Develop the user interface and client-side logic for the task management application using React and Chakra UI."
   */
  @ApiProperty({
    description: 'Optional: Detailed description of the project',
    example: 'Build and integrate the frontend with the backend API, focusing on user experience and responsiveness.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}