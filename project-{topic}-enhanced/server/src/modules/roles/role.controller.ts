import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import * as roleService from './role.service';
import { catchAsync } from '@/utils/catchAsync';
import { ApiError } from '@/utils/ApiError';

// Create a new role
export const createRole = catchAsync(async (req: Request, res: Response) => {
  const role = await roleService.createRole(req.body);
  res.status(httpStatus.CREATED).send(role);
});

// Get all roles
export const getRoles = catchAsync(async (req: Request, res: Response) => {
  const roles = await roleService.getRoles();
  res.status(httpStatus.OK).send(roles);
});

// Get a single role by ID
export const getRole = catchAsync(async (req: Request, res: Response) => {
  const role = await roleService.getRoleById(req.params.roleId);
  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }
  res.status(httpStatus.OK).send(role);
});

// Update a role by ID
export const updateRole = catchAsync(async (req: Request, res: Response) => {
  const role = await roleService.updateRoleById(req.params.roleId, req.body);
  res.status(httpStatus.OK).send(role);
});

// Delete a role by ID
export const deleteRole = catchAsync(async (req: Request, res: Response) => {
  await roleService.deleteRoleById(req.params.roleId);
  res.status(httpStatus.NO_CONTENT).send();
});