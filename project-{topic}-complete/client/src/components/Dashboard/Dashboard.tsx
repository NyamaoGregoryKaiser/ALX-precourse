import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/api';
import { Project, Task } from '../../types';
import ProjectCard from '../Projects/ProjectCard';
import TaskCard from '../Tasks/TaskCard';
import { useAuth } from '../../hooks/useAuth';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const [projectsRes, tasksRes] = await Promise.all([
          api.get(`/projects?ownerId=${user.id}`), // Get projects owned by the user
          api.get(`/tasks?assigneeId=${user.id}`), // Get tasks assigned to the user
        ]);

        setProjects(projectsRes.data.slice(0, 3)); // Show top 3 projects
        setTasks(tasksRes.data.slice(0, 5));     // Show top 5 tasks
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch dashboard data.');
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">Your Dashboard</h1>

      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-semibold text-gray-800">My Projects</h2>
          <Link to="/projects" className="text-blue-600 hover:underline text-lg">
            View All Projects &rarr;
          </Link>
        </div>
        {projects.length === 0 ? (
          <p className="text-gray-600 text-lg">You don't own any projects yet. <Link to="/projects" className="text-blue-600 hover:underline">Create one!</Link></p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-semibold text-gray-800">My Assigned Tasks</h2>
          <Link to="/tasks" className="text-blue-600 hover:underline text-lg">
            View All Tasks &rarr;
          </Link>
        </div>
        {tasks.length === 0 ? (
          <p className="text-gray-600 text-lg">No tasks assigned to you. Keep up the good work!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;