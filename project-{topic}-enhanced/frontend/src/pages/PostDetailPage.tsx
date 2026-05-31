```typescript
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Post } from '../types';
import * as PostService from '../services/post.service';

const PostDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const fetchedPost = await PostService.getPostById(id);
        setPost(fetchedPost);
      } catch (err) {
        setError('Failed to fetch post. It might not exist or be unavailable.');
        console.error('Error fetching post:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  if (loading) {
    return <div className="text-center mt-10 text-lg">Loading post...</div>;
  }

  if (error) {
    return <div className="text-center mt-10 text-red-600">{error}</div>;
  }

  if (!post) {
    return <div className="text-center mt-10 text-gray-600">Post not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-xl mt-8">
      {post.thumbnailUrl && (
        <img
          src={post.thumbnailUrl}
          alt={post.title}
          className="w-full h-80 object-cover rounded-lg mb-6"
        />
      )}
      <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{post.title}</h1>
      <div className="flex items-center text-gray-600 text-sm mb-6">
        <span>By <Link to="#" className="font-semibold hover:text-blue-600">{post.author.username}</Link></span>
        <span className="mx-2">•</span>
        <span>Category: <Link to="#" className="font-semibold hover:text-blue-600">{post.category?.name || 'Uncategorized'}</Link></span>
        <span className="mx-2">•</span>
        <span>Published on: {new Date(post.publishedAt || post.createdAt).toLocaleDateString()}</span>
        <span className="mx-2">•</span>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          post.status === 'published' ? 'bg-green-100 text-green-800' :
          post.status === 'draft' ? 'bg-gray-100 text-gray-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {post.status.toUpperCase()}
        </span>
      </div>
      <div className="prose lg:prose-lg max-w-none text-gray-800 leading-relaxed mb-8" dangerouslySetInnerHTML={{ __html: post.content }}>
        {/* In a real app, sanitize content before using dangerouslySetInnerHTML */}
      </div>
      <div className="mt-8 border-t pt-6 text-gray-700">
        <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium">&larr; Back to Home</Link>
      </div>
    </div>
  );
};

export default PostDetailPage;
```