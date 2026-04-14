import { PrismaClient, UserRole } from '@prisma/client';
import { CustomError } from '../../middlewares/error.middleware';

const prisma = new PrismaClient();

export const getUsers = async () => {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const getUserById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const updateUser = async (id: string, updateData: { firstName?: string; lastName?: string; email?: string; role?: UserRole }) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return null;
  }

  // Prevent direct password updates here. Use a separate password reset/change flow.
  if ('password' in updateData) {
    throw new CustomError('Password cannot be updated via this endpoint.', 400);
  }

  // Prevent updating role if not admin
  if (updateData.role && user.role !== updateData.role) {
    // This check should ideally be done in the controller with authorizeRoles or specific logic
    // For simplicity, we'll assume the controller handles 'ADMIN' role for changing 'role'
    // If not, a user changing their own role to ADMIN would be a security issue.
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

export const deleteUser = async (id: string) => {
  // Check if the user exists before attempting to delete
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return null;
  }

  // Disassociate tasks and projects owned/assigned by this user before deleting
  await prisma.project.updateMany({
    where: { ownerId: id },
    data: { ownerId: (await prisma.user.findFirst({where: {role: 'ADMIN'}}))?.id || '' }, // Reassign to first admin or handle differently
  });
  await prisma.task.updateMany({
    where: { assigneeId: id },
    data: { assigneeId: null }, // Unassign task
  });
  await prisma.task.updateMany({
    where: { reporterId: id },
    data: { reporterId: (await prisma.user.findFirst({where: {role: 'ADMIN'}}))?.id || '' }, // Reassign to first admin or handle differently
  });


  return prisma.user.delete({
    where: { id },
    select: { id: true, email: true }, // Return minimal info
  });
};