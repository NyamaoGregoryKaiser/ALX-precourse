```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';

// All properties of CreateProjectDto become optional
export class UpdateProjectDto extends PartialType(CreateProjectDto) {}
```