import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Order } from './Order.entity';
import { Product } from './Product.entity';

@Entity('order_items')
export class OrderItem extends BaseEntity {
  @ManyToOne(() => Order, (order) => order.orderItems, { onDelete: 'CASCADE' })
  order!: Order;

  @ManyToOne(() => Product, { onDelete: 'SET NULL' }) // If product is deleted, item remains but product becomes null
  product!: Product;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number; // Price at the time of order
}