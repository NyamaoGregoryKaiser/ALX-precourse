```typescript
import { ScrapingConfigDto } from './scraping-config.dto';

export class ScrapingJobPayload {
  jobId: string; // ID of the scraping job (from DB)
  taskId: string; // ID of the specific task execution (from DB)
  targetUrl: string;
  config: ScrapingConfigDto;
  // Add other necessary payload data like proxy settings, user-agent, etc.
}
```