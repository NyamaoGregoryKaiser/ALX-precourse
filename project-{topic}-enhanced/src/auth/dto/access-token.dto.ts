```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsJWT, IsString } from 'class-validator';

export class AccessTokenDto {
  @ApiProperty({
    description: 'JWT Access Token',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImRlbW91c2VyIiwiaWF0IjoxNjQ2NTQ2NzM4LCJleHAiOjE2NDY1NTAzMzh9.Smp_A-F-f-J_1_X_d_M_0_R_Q_P_Z_Y_K_L_M',
  })
  @IsString()
  @IsJWT()
  accessToken: string;
}
```