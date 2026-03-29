import { Router } from 'express';
import * as roleController from './role.controller';
import roleValidation from './role.validation';
import { validate } from '@/middlewares/validation.middleware';
import { authenticate, authorize } from '@/middlewares/auth.middleware';

const router = Router();

// All role management routes require admin:access or specific role permissions
router.route('/')
  .post(authenticate, authorize(['role:write', 'admin:access']), validate(roleValidation.createRole), roleController.createRole)
  .get(authenticate, authorize(['role:read', 'admin:access']), roleController.getRoles);

router.route('/:roleId')
  .get(authenticate, authorize(['role:read', 'admin:access']), validate(roleValidation.getRole), roleController.getRole)
  .patch(authenticate, authorize(['role:write', 'admin:access']), validate(roleValidation.updateRole), roleController.updateRole)
  .delete(authenticate, authorize(['role:delete', 'admin:access']), validate(roleValidation.deleteRole), roleController.deleteRole);

export default router;