import { Entity, Column, OneToMany, Unique } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Product } from './Product.entity';

@Entity('categories')
@Unique(['name']) // Category names should be unique
export class Category extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Relations
  @OneToMany(() => Product, (product) => product.category)
  products!: Product[];
}