```typescript
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateScrapingJobDto } from './create-scraping-job.dto';
import {
  IsString,
  IsNotEmpty,
  IsUrl,
  ValidateNested,
  IsOptional,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScrapingConfigDto } from './scraping-config.dto';

export class UpdateScrapingJobDto extends PartialType(CreateScrapingJobDto) {
  @ApiProperty({
    example: 'Updated Product Scraper',
    description: 'An updated descriptive name for the scraping job.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({
    example: 'https://new-example.com/products',
    description: 'An updated URL of the page to scrape.',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  @IsNotEmpty()
  targetUrl?: string;

  @ApiProperty({
    type: ScrapingConfigDto,
    description: 'Updated configuration for how to scrape the page.',
    required: false,
  })
  @IsOptional()
  @Type(() => ScrapingConfigDto)
  @ValidateNested()
  config?: ScrapingConfigDto;

  @ApiProperty({
    example: '0 0 * * 1', // Every Monday at midnight
    description: 'Updated cron expression for scheduling the job, or null to remove schedule.',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Matches(/^(@(annually|yearly|monthly|weekly|daily|hourly|reboot)|(((\d+,)+\d+|(\d+-\d+)|(\d+|\*)\s){5,7}))$/, {
    message: 'scheduleCron must be a valid cron expression or null',
    // Matches only if scheduleCron is not null, otherwise regex is not applied
    // This allows null to pass for removing a schedule
    // The conditional validation logic can be complex here, keeping it simple for now.
    // For `null` values, the regex won't match, so `IsOptional` will effectively handle it if property is missing.
    // To explicitly allow `null` for an existing field while applying regex if not null, you might need a custom validator.
  })
  scheduleCron?: string | null;
}
```