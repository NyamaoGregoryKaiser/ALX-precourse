```typescript
import { Router } from 'express';
import { AppDataSource } from '../database/data-source';
import { ProjectService } from '../services/project.service';
import { ProjectRepository } from '../repositories/Project.repository';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { validate, idSchema } from '../middleware/validation.middleware';
import Joi from 'joi';
import { Project } from '../entities/Project.entity';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../utils/api-error';

const router = Router();
const projectRepository = new ProjectRepository(AppDataSource.getRepository(Project));
const projectService = new ProjectService(projectRepository);

// Schemas for validation
const createProjectSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional().allow(null, ''),
});

const updateProjectSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(500).optional().allow(null, ''),
});

// Middleware to check project ownership
const checkProjectOwnership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const project = await projectService.getProjectById(id, req.user!.id);
  if (!project) {
    return next(new ApiError(StatusCodes.NOT_FOUND, 'Project not found or you do not have access.'));
  }
  next();
};

router.use(authenticate); // All project routes require authentication

// Get all projects for the authenticated user
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const projects = await projectService.getAllProjectsByUserId(req.user!.id);
    res.status(StatusCodes.OK).json(projects);
  } catch (error) {
    next(error);
  }
});

// Get a specific project by ID
router.get('/:id', validate(idSchema, 'params'), checkProjectOwnership, async (req: AuthRequest, res, next) => {
  try {
    const project = await projectService.getProjectById(req.params.id, req.user!.id);
    res.status(StatusCodes.OK).json(project);
  } catch (error) {
    next(error);
  }
});

// Create a new project
router.post('/', validate(createProjectSchema), async (req: AuthRequest, res, next) => {
  try {
    const project = await projectService.createProject(req.body, req.user!.id);
    res.status(StatusCodes.CREATED).json(project);
  } catch (error) {
    next(error);
  }
});

// Update a project
router.put('/:id', validate(idSchema, 'params'), validate(updateProjectSchema), checkProjectOwnership, async (req: AuthRequest, res, next) => {
  try {
    const updatedProject = await projectService.updateProject(req.params.id, req.body, req.user!.id);
    res.status(StatusCodes.OK).json(updatedProject);
  } catch (error) {
    next(error);
  }
});

// Delete a project
router.delete('/:id', validate(idSchema, 'params'), checkProjectOwnership, async (req: AuthRequest, res, next) => {
  try {
    await projectService.deleteProject(req.params.id, req.user!.id);
    res.status(StatusCodes.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
});

export default router;
```