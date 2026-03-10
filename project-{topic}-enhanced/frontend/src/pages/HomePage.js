```javascript
import React, { useEffect, useState } from 'react';
import api from '../api/api';
import './HomePage.css';

function HomePage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await api.get('/posts?status=published&sort=publishedAt:desc');
        setPosts(response.data.data);
      } catch (err) {
        setError('Failed to fetch posts. Please try again later.');
        console.error('Error fetching posts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  if (loading) return <div className="loading">Loading posts...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="home-page">
      <h1>Latest Posts</h1>
      <div className="posts-list">
        {posts.length > 0 ? (
          posts.map(post => (
            <div key={post.id} className="post-card">
              {post.featuredImage && <img src={post.featuredImage} alt={post.title} className="post-image" />}
              <h2><a href={`/posts/${post.slug || post.id}`}>{post.title}</a></h2>
              <p className="post-meta">
                By {post.author?.username || 'Unknown'} on {new Date(post.publishedAt).toLocaleDateString()}
              </p>
              <p>{post.excerpt}</p>
              <a href={`/posts/${post.slug || post.id}`} className="read-more">Read More</a>
            </div>
          ))
        ) : (
          <p>No published posts yet.</p>
        )}
      </div>
    </div>
  );
}

export default HomePage;
```