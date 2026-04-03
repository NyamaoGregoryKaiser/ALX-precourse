```typescript
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  ValidateNested,
  IsArray,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ScrapingFieldDto {
  @ApiProperty({ example: 'productName', description: 'Name of the field to extract.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;

  @ApiProperty({ example: 'h1.product-title', description: 'CSS selector for the element containing the field data.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  selector: string;

  @ApiProperty({ example: 'href', description: 'Optional attribute to extract (e.g., "href", "src"). If not provided, text content is used.', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  attribute?: string;

  @ApiProperty({ example: false, description: 'If true, extract all matching elements into an array.', required: false })
  @IsOptional()
  @IsBoolean()
  multiple?: boolean;

  @ApiProperty({ example: 'N/A', description: 'Default value if element is not found.', required: false })
  @IsOptional()
  defaultValue?: string | number | boolean | null;
}

export class ScrapingConfigDto {
  @ApiProperty({
    example: '.product-item',
    description: 'CSS selector for a single item/block on the page that contains the data fields.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  itemSelector?: string;

  @ApiProperty({
    example: '.loading-spinner',
    description: 'CSS selector for an element to wait for before attempting to scrape. Useful for dynamic pages.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  waitForSelector?: string;

  @ApiProperty({
    example: 2000,
    description: 'Initial delay in milliseconds before scraping, useful for dynamic content to load.',
    required: false,
  })
  @IsOptional()
  initialDelay?: number;

  @ApiProperty({
    type: [ScrapingFieldDto],
    description: 'An array of fields to extract from each item.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScrapingFieldDto)
  fields: ScrapingFieldDto[];
}
```