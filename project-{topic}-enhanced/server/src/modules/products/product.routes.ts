import { Router } from 'express';
import * as productController from './product.controller';
import productValidation from './product.validation';
import { validate } from '@/middlewares/validation.middleware';
import { authenticate, authorize } from '@/middlewares/auth.middleware';

const router = Router();

// Routes for product management with permissions
router.route('/')
  .post(authenticate, authorize(['product:write', 'admin:access']), validate(productValidation.createProduct), productController.createProduct)
  .get(authenticate, authorize(['product:read', 'admin:access']), productController.getProducts);

router.route('/:productId')
  .get(authenticate, authorize(['product:read', 'admin:access']), validate(productValidation.getProduct), productController.getProduct)
  .patch(authenticate, authorize(['product:write', 'admin:access']), validate(productValidation.updateProduct), productController.updateProduct)
  .delete(authenticate, authorize(['product:delete', 'admin:access']), validate(productValidation.deleteProduct), productController.deleteProduct);

export default router;