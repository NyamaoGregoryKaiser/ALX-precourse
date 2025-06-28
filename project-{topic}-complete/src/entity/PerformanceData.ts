```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class PerformanceData {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  metric: string;

  @Column({ type: 'float' })
  value: number;

  @CreateDateColumn()
  createdAt: Date;
}
```