```typescript
import React from 'react';
import { Link } from 'react-router-dom';
import { Post } from '../types';

interface PostCardProps {
  post: Post;
}

const PostCard = ({ post }: PostCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      {post.thumbnailUrl && (
        <img
          src={post.thumbnailUrl}
          alt={post.title}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          <Link to={`/posts/${post.id}`} className="hover:text-blue-600 transition-colors duration-200">
            {post.title}
          </Link>
        </h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {post.content}
        </p>
        <div className="flex items-center text-sm text-gray-500">
          <span>By {post.author.username}</span>
          <span className="mx-2">•</span>
          <span>{post.category ? post.category.name : 'Uncategorized'}</span>
          <span className="mx-2">•</span>
          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <Link
            to={`/posts/${post.id}`}
            className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
          >
            Read More &rarr;
          </Link>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            post.status === 'published' ? 'bg-green-100 text-green-800' :
            post.status === 'draft' ? 'bg-gray-100 text-gray-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {post.status.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
```