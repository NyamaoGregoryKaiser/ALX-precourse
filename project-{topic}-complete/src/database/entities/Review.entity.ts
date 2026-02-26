import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { User } from './User.entity';
import { Product } from './Product.entity';

@Entity('reviews')
export class Review extends BaseEntity {
  @ManyToOne(() => User, (user) => user.reviews, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Product, (product) => product.reviews, { onDelete: 'CASCADE' })
  product!: Product;

  @Column({ type: 'int' })
  rating!: number; // 1-5 stars

  @Column({ type: 'text', nullable: true })
  comment?: string;
}