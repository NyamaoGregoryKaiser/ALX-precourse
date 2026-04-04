```javascript
const express = require('express');
const taskController = require('../controllers/taskController');
const protect = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validationMiddleware');
const cacheMiddleware = require('../middlewares/cacheMiddleware');
const Joi = require('joi');
const { TaskStatus, TaskPriority } = require('@prisma/client');

const router = express.Router();

// Joi schemas for request validation
const taskIdSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
});

const createTaskSchema = Joi.object({
  body: Joi.object({
    title: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).allow(null, ''),
    status: Joi.string().valid(...Object.values(TaskStatus)),
    priority: Joi.string().valid(...Object.values(TaskPriority)),
    dueDate: Joi.date().iso().greater('now').allow(null), // ISO 8601 date string, or null
    categoryId: Joi.string().uuid().allow(null),
  }),
});

const updateTaskSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    title: Joi.string().min(1).max(255),
    description: Joi.string().max(1000).allow(null, ''),
    status: Joi.string().valid(...Object.values(TaskStatus)),
    priority: Joi.string().valid(...Object.values(TaskPriority)),
    dueDate: Joi.date().iso().allow(null), // Allow past dates for updates
    categoryId: Joi.string().uuid().allow(null),
  }).min(1), // At least one field is required
});

const querySchema = Joi.object({
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().default('-createdAt'), // e.g., 'dueDate,-priority'
    fields: Joi.string(), // e.g., 'id,title,status'
    title: Joi.string(), // Filter by task title (partial match)
    status: Joi.string().valid(...Object.values(TaskStatus)),
    priority: Joi.string().valid(...Object.values(TaskPriority)),
    dueDate: Joi.date().iso(), // Filter tasks due on a specific date
    'dueDate[gt]': Joi.date().iso(), // Tasks due after a date
    'dueDate[lt]': Joi.date().iso(), // Tasks due before a date
    categoryId: Joi.string().uuid().allow(null), // Filter by category
  }).unknown(true), // Allow other query parameters that APIFeatures might handle
});

router.use(protect); // All routes after this middleware require authentication

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task management for authenticated users
 */

/**
 * @swagger
 * /api/v1/tasks:
 *   post:
 *     summary: Create a new task for the authenticated user
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 description: The title of the task.
 *                 example: Complete project report
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Detailed description of the task.
 *                 example: Gather all data, write introduction, conclusion, and review.
 *               status:
 *                 type: string
 *                 enum: [PENDING, IN_PROGRESS, COMPLETED]
 *                 default: PENDING
 *                 description: The current status of the task.
 *                 example: IN_PROGRESS
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *                 default: MEDIUM
 *                 description: The priority level of the task.
 *                 example: HIGH
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: The due date and time of the task (ISO 8601 format).
 *                 example: 2024-07-30T10:00:00Z
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: The ID of the category this task belongs to.
 *                 example: a1b2c3d4-e5f6-7890-1234-567890abcdef
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     task:
 *                       $ref: '#/components/schemas/Task'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', validate(createTaskSchema), cacheMiddleware.clear(['cache:*:tasks:*']), taskController.createTask);

/**
 * @swagger
 * /api/v1/tasks:
 *   get:
 *     summary: Get all tasks for the authenticated user
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of tasks per page.
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort order (e.g., 'dueDate', '-createdAt', 'priority').
 *       - in: query
 *         name: fields
 *         schema:
 *           type: string
 *         description: Comma-separated list of fields to include (e.g., 'id,title,status').
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Filter tasks by title (partial match, case-insensitive).
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, IN_PROGRESS, COMPLETED]
 *         description: Filter tasks by status.
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH]
 *         description: Filter tasks by priority.
 *       - in: query
 *         name: dueDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter tasks due on a specific date (ISO 8601).
 *       - in: query
 *         name: dueDate[gt]
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter tasks due after a specific date (ISO 8601).
 *       - in: query
 *         name: dueDate[lt]
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter tasks due before a specific date (ISO 8601).
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         description: Filter tasks by category ID. Use 'null' string to filter tasks without a category.
 *     responses:
 *       200:
 *         description: List of tasks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 results:
 *                   type: integer
 *                   description: Number of tasks returned in this response.
 *                 total:
 *                   type: integer
 *                   description: Total number of tasks available.
 *                 data:
 *                   type: object
 *                   properties:
 *                     tasks:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Task'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', validate(querySchema), cacheMiddleware(), taskController.getAllTasks);

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   get:
 *     summary: Get a specific task by ID for the authenticated user
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the task to retrieve.
 *     responses:
 *       200:
 *         description: Task retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     task:
 *                       $ref: '#/components/schemas/Task'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id', validate(taskIdSchema), cacheMiddleware(), taskController.getTaskById);

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   patch:
 *     summary: Update a task for the authenticated user
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the task to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 description: The new title of the task.
 *                 example: Finalize project report
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 nullable: true
 *                 description: Updated detailed description of the task.
 *                 example: Review with team, submit to manager.
 *               status:
 *                 type: string
 *                 enum: [PENDING, IN_PROGRESS, COMPLETED]
 *                 description: The new status of the task.
 *                 example: COMPLETED
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *                 description: The new priority level of the task.
 *                 example: LOW
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: The new due date and time of the task (ISO 8601 format).
 *                 example: 2024-07-29T17:00:00Z
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: The ID of the new category for this task, or null to remove category.
 *                 example: b5c6d7e8-f9a0-1234-5678-90abcdef1234
 *             minProperties: 1
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     task:
 *                       $ref: '#/components/schemas/Task'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch('/:id', validate(updateTaskSchema), cacheMiddleware.clear(['cache:*:tasks:*']), taskController.updateTask);

/**
 * @swagger
 * /api/v1/tasks/{id}:
 *   delete:
 *     summary: Delete a task for the authenticated user
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: ID of the task to delete.
 *     responses:
 *       204:
 *         description: Task deleted successfully (No Content)
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/:id', validate(taskIdSchema), cacheMiddleware.clear(['cache:*:tasks:*']), taskController.deleteTask);

module.exports = router;
```