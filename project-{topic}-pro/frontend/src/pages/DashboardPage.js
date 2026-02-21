import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ChartBarSquareIcon, RectangleGroupIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import Card from '../components/Card';

const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto py-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">Welcome, {user?.username || 'User'}!</h1>
      <p className="text-xl text-gray-700 mb-8">
        Your hub for machine learning utility tasks. Get started by managing your projects or creating new tasks.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center space-x-4 mb-4">
            <RectangleGroupIcon className="h-10 w-10 text-blue-500" />
            <h2 className="text-2xl font-semibold text-gray-800">Manage Projects</h2>
          </div>
          <p className="text-gray-700 mb-4">
            Organize your machine learning efforts into projects. Each project can contain multiple utility tasks.
          </p>
          <Link
            to="/projects"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors duration-200"
          >
            <RectangleGroupIcon className="h-5 w-5 mr-2" />
            View My Projects
          </Link>
        </Card>

        <Card>
          <div className="flex items-center space-x-4 mb-4">
            <PlusCircleIcon className="h-10 w-10 text-green-500" />
            <h2 className="text-2xl font-semibold text-gray-800">Create New ML Task</h2>
          </div>
          <p className="text-gray-700 mb-4">
            Apply various data preprocessing techniques, calculate model evaluation metrics, and more.
          </p>
          <Link
            to="/projects"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors duration-200"
          >
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Start a New Task (Select Project)
          </Link>
        </Card>

        <Card>
          <div className="flex items-center space-x-4 mb-4">
            <ChartBarSquareIcon className="h-10 w-10 text-purple-500" />
            <h2 className="text-2xl font-semibold text-gray-800">Explore Utilities</h2>
          </div>
          <p className="text-gray-700 mb-4">
            Discover a range of available ML utilities for data manipulation and performance assessment.
          </p>
          <Link
            to="/projects" {/* Redirects to projects to choose where to add task */}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors duration-200"
          >
            <ChartBarSquareIcon className="h-5 w-5 mr-2" />
            View Available Tasks
          </Link>
        </Card>
      </div>

      <div className="mt-12 text-center text-gray-600">
        <p>This system is designed for quick access to common machine learning helper functions.</p>
        <p>Built with ❤️ for ALX Software Engineering. </p>
      </div>
    </div>
  );
};

export default DashboardPage;