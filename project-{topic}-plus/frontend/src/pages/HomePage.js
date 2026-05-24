```javascript
import React, { useEffect, useState } from 'react';
import { posts } from '../api';
import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser, isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const params = {
          // If authenticated and is editor/admin, fetch all statuses
          status: isAuthenticated && (currentUser?.role === 'admin' || currentUser?.role === 'editor') ? undefined : 'published',
          populate: 'author,category',
          limit: 10,
          page: 1
        };
        const response = await posts.getAll(params);
        setAllPosts(response.data.posts);
      } catch (err) {
        console.error("Failed to fetch posts:", err);
        setError("Failed to load posts.");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [currentUser, isAuthenticated]);

  if (loading) return <div>Loading posts...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Latest Posts</h1>
      {allPosts.length === 0 ? (
        <p>No posts available.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allPosts.map((post) => (
            <div key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {post.featuredImage && (
                <img src={post.featuredImage} alt={post.title} className="w-full h-48 object-cover" />
              )}
              <div className="p-4">
                <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
                <p className="text-gray-600 text-sm mb-2">
                  By {post.author?.username || 'Unknown'} in {post.category?.name || 'Uncategorized'}
                </p>
                <p className="text-gray-700 text-base">{post.excerpt || post.content.substring(0, 150) + '...'}</p>
                <div className="mt-4 flex justify-between items-center">
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    post.status === 'published' ? 'bg-green-100 text-green-800' :
                    post.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {post.status.toUpperCase()}
                  </span>
                  <a href={`/posts/${post.slug}`} className="text-blue-500 hover:underline">Read More</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HomePage;
```