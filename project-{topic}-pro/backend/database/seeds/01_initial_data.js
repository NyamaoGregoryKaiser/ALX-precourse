```javascript
const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('post_tags').del();
  await knex('media').del();
  await knex('posts').del();
  await knex('tags').del();
  await knex('categories').del();
  await knex('users').del();

  // Create users
  const hashedPasswordAdmin = await bcrypt.hash('Admin@123', 10);
  const hashedPasswordEditor = await bcrypt.hash('Editor@123', 10);
  const hashedPasswordAuthor = await bcrypt.hash('Author@123', 10);

  const users = await knex('users').insert([
    { name: 'Admin User', email: 'admin@example.com', password: hashedPasswordAdmin, role: 'admin' },
    { name: 'Editor User', email: 'editor@example.com', password: hashedPasswordEditor, role: 'editor' },
    { name: 'Author One', email: 'author1@example.com', password: hashedPasswordAuthor, role: 'author' },
    { name: 'Author Two', email: 'author2@example.com', password: hashedPasswordAuthor, role: 'author' },
  ]).returning('id');

  const adminId = users[0].id;
  const editorId = users[1].id;
  const author1Id = users[2].id;
  const author2Id = users[3].id;

  // Create categories
  const categories = await knex('categories').insert([
    { name: 'Technology', slug: 'technology', description: 'Articles about tech advancements' },
    { name: 'Lifestyle', slug: 'lifestyle', description: 'Tips for a better life' },
    { name: 'News', slug: 'news', description: 'Latest happenings around the world' },
  ]).returning('id');

  const techId = categories[0].id;
  const lifestyleId = categories[1].id;
  const newsId = categories[2].id;

  // Create tags
  const tags = await knex('tags').insert([
    { name: 'JavaScript', slug: 'javascript' },
    { name: 'React', slug: 'react' },
    { name: 'Node.js', slug: 'nodejs' },
    { name: 'Health', slug: 'health' },
    { name: 'Wellness', slug: 'wellness' },
  ]).returning('id');

  const jsTagId = tags[0].id;
  const reactTagId = tags[1].id;
  const nodeTagId = tags[2].id;
  const healthTagId = tags[3].id;
  const wellnessTagId = tags[4].id;

  // Create posts
  const posts = await knex('posts').insert([
    {
      title: 'Getting Started with Node.js',
      slug: 'getting-started-nodejs',
      content: 'Node.js is a powerful JavaScript runtime...',
      status: 'published',
      author_id: author1Id,
      category_id: techId,
      published_at: knex.fn.now(),
    },
    {
      title: 'The Benefits of a Healthy Diet',
      slug: 'benefits-healthy-diet',
      content: 'Eating well is crucial for your overall health...',
      status: 'published',
      author_id: author2Id,
      category_id: lifestyleId,
      published_at: knex.fn.now(),
    },
    {
      title: 'Upcoming Trends in Web Development',
      slug: 'upcoming-web-trends',
      content: 'Stay ahead of the curve with these new technologies...',
      status: 'draft', // Draft post
      author_id: author1Id,
      category_id: techId,
    },
    {
      title: 'A Day in the Life of an Editor',
      slug: 'day-in-life-editor',
      content: 'What does an editor really do?',
      status: 'published',
      author_id: editorId,
      category_id: newsId,
      published_at: knex.fn.now(),
    }
  ]).returning('id');

  const post1Id = posts[0].id;
  const post2Id = posts[1].id;
  const post3Id = posts[2].id;
  const post4Id = posts[3].id;

  // Link posts and tags
  await knex('post_tags').insert([
    { post_id: post1Id, tag_id: nodeTagId },
    { post_id: post1Id, tag_id: jsTagId },
    { post_id: post2Id, tag_id: healthTagId },
    { post_id: post2Id, tag_id: wellnessTagId },
    { post_id: post3Id, tag_id: reactTagId },
    { post_id: post3Id, tag_id: jsTagId },
  ]);

  console.log('Seed data inserted successfully!');
};
```