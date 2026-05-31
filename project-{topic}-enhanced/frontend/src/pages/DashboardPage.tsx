```typescript
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Post, PostStatus, UserRole } from '../types';
import * as PostService from '../services/post.service';
import { useAuth } from '../context/AuthContext';

const DashboardPage = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, hasRole } = useAuth();

  useEffect(() => {
    const fetchUserPosts = async () => {
      try {
        setLoading(true);
        let fetchedPosts: Post[];
        if (hasRole([UserRole.ADMIN, UserRole.EDITOR])) {
          // Admins/Editors can see all posts (or all drafts/pending)
          fetchedPosts = await PostService.getPosts(); // Fetch all posts regardless of status
        } else if (hasRole([UserRole.AUTHOR]) && user) {
          // Authors can only see their own posts
          const allPosts = await PostService.getPosts();
          fetchedPosts = allPosts.filter(post => post.author.id === user.id);
        } else {
          fetchedPosts = []; // No posts for other roles on dashboard
        }
        setPosts(fetchedPosts);
      } catch (err) {
        setError('Failed to load posts for dashboard.');
        console.error('Error fetching dashboard posts:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUserPosts();
    }
  }, [user, hasRole]);

  const handleDelete = async (postId: string) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      try {
        await PostService.deletePost(postId);
        setPosts(posts.filter(post => post.id !== postId));
      } catch (err) {
        setError('Failed to delete post.');
        console.error('Error deleting post:', err);
      }
    }
  };

  if (loading) {
    return <div className="text-center mt-10 text-lg">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-center mt-10 text-red-600">{error}</div>;
  }

  if (!user) {
    return <div className="text-center mt-10 text-lg">Please log in to view your dashboard.</div>;
  }

  return (
    <div className="py-8">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center">Your Dashboard</h1>
      <div className="flex justify-center mb-6">
        <Link
          to="/posts/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition duration-300"
        >
          Create New Post
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="text-center text-gray-600 text-lg">You haven't created any posts yet.</p>
      ) : (
        <div className="overflow-x-auto bg-white shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <Link to={`/posts/${post.id}`} className="hover:text-blue-600">
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      post.status === PostStatus.PUBLISHED ? 'bg-green-100 text-green-800' :
                      post.status === PostStatus.DRAFT ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {post.status.toUpperCase().replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{post.category?.name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{post.author.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(post.updatedAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link to={`/posts/${post.id}/edit`} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</Link>
                    {/* Only allow admins/editors to delete for now, or authors if it's their draft */}
                    {hasRole([UserRole.ADMIN, UserRole.EDITOR]) && (
                      <button onClick={() => handleDelete(post.id)} className="text-red-600 hover:text-red-900">
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
```