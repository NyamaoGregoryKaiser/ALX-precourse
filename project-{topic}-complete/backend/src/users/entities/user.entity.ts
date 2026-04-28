import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert, BeforeUpdate, OneToMany } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role } from '../../common/enums/role.enum';
import { Dataset } from '../../datasets/entities/dataset.entity';
import { Model } from '../../models/entities/model.entity';
import { PredictionLog } from '../../predictions/entities/prediction-log.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.User,
  })
  role: Role;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => Dataset, (dataset) => dataset.createdBy)
  datasets: Dataset[];

  @OneToMany(() => Model, (model) => model.createdBy)
  models: Model[];

  @OneToMany(() => PredictionLog, (predictionLog) => predictionLog.requestedBy)
  predictionLogs: PredictionLog[];

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }
}