```typescript
import { ApiProperty } from '@nestjs/swagger';
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

export class CreateScrapingJobDto {
  @ApiProperty({
    example: 'Product Scraper',
    description: 'A descriptive name for the scraping job.',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'https://example.com/products',
    description: 'The URL of the page to scrape.',
  })
  @IsUrl()
  @IsNotEmpty()
  targetUrl: string;

  @ApiProperty({
    type: ScrapingConfigDto,
    description: 'Configuration for how to scrape the page.',
  })
  @Type(() => ScrapingConfigDto)
  @ValidateNested()
  config: ScrapingConfigDto;

  @ApiProperty({
    example: '0 0 * * *',
    description: 'Optional cron expression for scheduling the job (e.g., "0 0 * * *" for daily at midnight).',
    required: false,
  })
  @IsOptional()
  @IsString()
  // Basic cron validation regex, more robust validation can be added
  @Matches(/^(@(annually|yearly|monthly|weekly|daily|hourly|reboot)|(((\d+,)+\d+|(\d+(-)\d+)|(\d+|\*)\s){5,7}))$/, {
    message: 'scheduleCron must be a valid cron expression',
  })
  scheduleCron?: string;
}
```