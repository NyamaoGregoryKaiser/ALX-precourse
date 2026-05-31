```typescript
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreatePostPayload, Category, PostStatus } from '../types';
import * as PostService from '../services/post.service';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

const CreatePostPage = () => {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [status, setStatus] = useState<PostStatus>(PostStatus.DRAFT);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const fetchedCategories = await PostService.getCategories();
        setCategories(fetchedCategories);
        if (fetchedCategories.length > 0) {
          setCategoryId(fetchedCategories[0].id); // Set default category
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setError('Failed to load categories.');
      }
    };
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const postData: CreatePostPayload = {
      title,
      content,
      thumbnailUrl: thumbnailUrl || undefined,
      categoryId: categoryId || undefined,
      status,
    };

    try {
      const newPost = await PostService.createPost(postData);
      navigate(`/posts/${newPost.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create post.');
      console.error('Error creating post:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-xl mt-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Create New Post</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            id="title"
            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={255}
          />
        </div>
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <textarea
            id="content"
            rows={10}
            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          ></textarea>
        </div>
        <div>
          <label htmlFor="thumbnailUrl" className="block text-sm font-medium text-gray-700 mb-1">Thumbnail URL (Optional)</label>
          <input
            type="url"
            id="thumbnailUrl"
            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            id="categoryId"
            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Select a Category (Optional)</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            id="status"
            className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={status}
            onChange={(e) => setStatus(e.target.value as PostStatus)}
          >
            <option value={PostStatus.DRAFT}>Draft</option>
            {hasRole([UserRole.ADMIN, UserRole.EDITOR]) && (
              <>
                <option value={PostStatus.PENDING_REVIEW}>Pending Review</option>
                <option value={PostStatus.PUBLISHED}>Published</option>
              </>
            )}
            {hasRole([UserRole.AUTHOR]) && (
              <option value={PostStatus.PENDING_REVIEW}>Submit for Review</option>
            )}
          </select>
        </div>
        <div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-300"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Post'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePostPage;
```