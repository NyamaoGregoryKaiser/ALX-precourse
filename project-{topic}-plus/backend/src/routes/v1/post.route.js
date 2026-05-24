```javascript
const express = require('express');
const auth = require('../../middleware/auth');
const validate = require('../../utils/validate');
const postValidation = require('../../validations/post.validation');
const postController = require('../../controllers/post.controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Posts
 *   description: Content post management
 */

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a post
 *     description: Only authenticated users with 'editor' or 'admin' roles can create posts.
 *     tags: [Posts]
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
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the post
 *                 example: My First Blog Post
 *               slug:
 *                 type: string
 *                 description: URL-friendly slug (e.g., 'my-first-blog-post'). Auto-generated if not provided.
 *                 example: my-first-blog-post
 *               content:
 *                 type: string
 *                 description: Full content of the post (HTML, Markdown etc.)
 *                 example: <p>This is the content of my first blog post.</p>
 *               excerpt:
 *                 type: string
 *                 description: A short summary of the post
 *                 example: An introduction to the new CMS project.
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *                 description: Publication status of the post
 *                 default: draft
 *               featuredImage:
 *                 type: string
 *                 format: uri
 *                 description: URL of the featured image
 *                 example: https://example.com/image.jpg
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the category this post belongs to
 *                 nullable: true
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *   get:
 *     summary: Get all posts
 *     description: Anyone can retrieve published posts. Authenticated users with 'editor' or 'admin' roles can retrieve posts of any status.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Post title
 *       - in: query
 *         name: slug
 *         schema:
 *           type: string
 *         description: Post slug
 *       - in: query
 *         name: authorId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the post's author
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the post's category
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, archived]
 *         description: Filter by post status (default to 'published' for public users)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort by query param (e.g., createdAt:desc, title:asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of posts
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 1
 *         description: Page number
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Post'
 *                 totalResults:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 */
router
  .route('/')
  .post(auth('admin', 'editor'), validate(postValidation.createPost), postController.createPost)
  .get(auth(), validate(postValidation.getPosts), postController.getPosts); // auth() makes req.user available but doesn't restrict

/**
 * @swagger
 * /posts/{postId}:
 *   get:
 *     summary: Get a post by ID
 *     description: Anyone can retrieve a published post. Authenticated users with 'editor' or 'admin' roles, or the post's author, can retrieve posts of any status.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Post ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *   patch:
 *     summary: Update a post by ID
 *     description: Only the author of the post or an 'admin' can update a post.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Updated Blog Post Title
 *               slug:
 *                 type: string
 *                 example: updated-blog-post-title
 *               content:
 *                 type: string
 *                 example: <p>Updated content here.</p>
 *               excerpt:
 *                 type: string
 *                 example: Updated summary.
 *               status:
 *                 type: string
 *                 enum: [draft, published, archived]
 *                 example: published
 *               featuredImage:
 *                 type: string
 *                 format: uri
 *                 example: https://example.com/updated-image.jpg
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *             minProperties: 1
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       "400":
 *         $ref: '#/components/responses/BadRequest'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     summary: Delete a post by ID
 *     description: Only the author of the post or an 'admin' can delete a post.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Post ID
 *     responses:
 *       "204":
 *         description: No Content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */
router
  .route('/:postId')
  .get(auth(), validate(postValidation.getPost), postController.getPost)
  .patch(auth('admin', 'editor'), validate(postValidation.updatePost), postController.updatePost)
  .delete(auth('admin', 'editor'), validate(postValidation.deletePost), postController.deletePost);

module.exports = router;
```