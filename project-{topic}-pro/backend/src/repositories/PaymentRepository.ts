import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../entities/Payment';
import AppDataSource from '../../ormconfig';

export class PaymentRepository {
  private repository: Repository<Payment>;

  constructor() {
    this.repository = AppDataSource.getRepository(Payment);
  }

  async findById(id: string): Promise<Payment | null> {
    return this.repository.findOne({ where: { id }, relations: ['merchant'] });
  }

  async findByMerchantId(merchantId: string): Promise<Payment[]> {
    return this.repository.find({ where: { merchant: { id: merchantId } }, order: { createdAt: 'DESC' } });
  }

  async save(payment: Payment): Promise<Payment> {
    return this.repository.save(payment);
  }

  async create(paymentData: Partial<Payment>): Promise<Payment> {
    const payment = this.repository.create(paymentData);
    return this.repository.save(payment);
  }

  async updateStatus(id: string, status: PaymentStatus, externalId?: string): Promise<Payment | null> {
    const payment = await this.findById(id);
    if (payment) {
      payment.status = status;
      if (externalId) payment.externalId = externalId;
      return this.repository.save(payment);
    }
    return null;
  }
}