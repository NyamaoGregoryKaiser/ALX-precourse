```typescript
import React, { useEffect, useState } from 'react';
import { Post, PostStatus } from '../types';
import * as PostService from '../services/post.service';
import PostCard from '../components/PostCard';

const HomePage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        // Only fetch published posts for the public homepage
        const fetchedPosts = await PostService.getPosts(PostStatus.PUBLISHED);
        setPosts(fetchedPosts);
      } catch (err) {
        setError('Failed to fetch posts. Please try again later.');
        console.error('Error fetching posts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  if (loading) {
    return <div className="text-center mt-10 text-lg">Loading posts...</div>;
  }

  if (error) {
    return <div className="text-center mt-10 text-red-600">{error}</div>;
  }

  return (
    <div className="py-8">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center">Latest Articles</h1>
      {posts.length === 0 ? (
        <p className="text-center text-gray-600 text-lg">No published posts found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;
```