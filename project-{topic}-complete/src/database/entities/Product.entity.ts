import { Entity, Column, ManyToOne, OneToMany, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Category } from './Category.entity';
import { Review } from './Review.entity';
import { OrderItem } from './OrderItem.entity';

@Entity('products')
@Index(['name']) // Add index for faster lookups by name
@Index(['category']) // Add index for faster lookups by category
export class Product extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ type: 'int', default: 0 })
  stock!: number;

  @Column({ type: 'varchar', nullable: true })
  imageUrl?: string;

  // Relations
  @ManyToOne(() => Category, (category) => category.products, {
    nullable: true, // A product can exist without a category initially
    onDelete: 'SET NULL', // If a category is deleted, set product's category to null
  })
  category?: Category;

  @OneToMany(() => Review, (review) => review.product)
  reviews!: Review[];

  @OneToMany(() => OrderItem, (orderItem) => orderItem.product)
  orderItems!: OrderItem[];
}