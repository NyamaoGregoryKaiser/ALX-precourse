```javascript
exports.up = function(knex) {
  return knex.schema
    .createTable('users', function(table) {
      table.increments('id').primary();
      table.string('name', 100).notNullable();
      table.string('email', 255).notNullable().unique();
      table.string('password', 255).notNullable();
      table.enum('role', ['admin', 'editor', 'author']).notNullable().defaultTo('author');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('categories', function(table) {
      table.increments('id').primary();
      table.string('name', 100).notNullable().unique();
      table.string('slug', 100).notNullable().unique();
      table.string('description', 255);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('tags', function(table) {
      table.increments('id').primary();
      table.string('name', 100).notNullable().unique();
      table.string('slug', 100).notNullable().unique();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('posts', function(table) {
      table.increments('id').primary();
      table.string('title', 255).notNullable();
      table.string('slug', 255).notNullable().unique();
      table.text('content').notNullable();
      table.enum('status', ['draft', 'published', 'archived', 'pending']).notNullable().defaultTo('draft');
      table.integer('author_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
      table.integer('category_id').unsigned().references('id').inTable('categories').onDelete('SET NULL');
      table.timestamp('published_at'); // When the post was actually published
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.index(['status', 'author_id', 'category_id']); // Query optimization
      table.index('published_at');
    })
    .createTable('post_tags', function(table) {
      table.integer('post_id').unsigned().references('id').inTable('posts').onDelete('CASCADE');
      table.integer('tag_id').unsigned().references('id').inTable('tags').onDelete('CASCADE');
      table.primary(['post_id', 'tag_id']);
    })
    .createTable('media', function(table) {
      table.increments('id').primary();
      table.string('file_name', 255).notNullable();
      table.string('file_path', 255).notNullable();
      table.string('file_type', 100).notNullable();
      table.bigint('file_size').notNullable(); // Size in bytes
      table.string('alt_text', 255);
      table.integer('uploaded_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('uploaded_at').defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('media')
    .dropTableIfExists('post_tags')
    .dropTableIfExists('posts')
    .dropTableIfExists('tags')
    .dropTableIfExists('categories')
    .dropTableIfExists('users');
};
```