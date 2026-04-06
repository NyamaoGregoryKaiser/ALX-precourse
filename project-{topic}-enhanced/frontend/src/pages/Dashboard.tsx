```typescript
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '../api/dashboard';
import { Spinner } from '../components/common/Spinner';
import { Alert } from '../components/common/Alert';
import { Card } from '../components/common/Card';

export const DashboardPage: React.FC = () => {
    const { data: summary, isLoading, isError, error } = useQuery({
        queryKey: ['dashboardSummary'],
        queryFn: getDashboardSummary,
        staleTime: 60 * 1000, // 1 minute stale time
    });

    if (isLoading) {
        return <Spinner size="lg" message="Loading dashboard data..." />;
    }

    if (isError) {
        return <Alert type="error" message={`Failed to load dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`} />;
    }

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                <Card title="Connected Databases" value={summary?.totalDbConnections || 0} icon="🌍">
                    <p className="text-sm text-gray-500">
                        {summary?.activeDbConnections} active
                    </p>
                    <Link to="/db-connections" className="text-blue-600 hover:underline text-sm mt-2 block">
                        Manage Connections
                    </Link>
                </Card>
                <Card title="Open Recommendations" value={summary?.openRecommendations || 0} icon="💡">
                    <p className="text-sm text-gray-500">
                        {summary?.criticalRecommendations} critical
                    </p>
                    <Link to="/recommendations?status=open" className="text-blue-600 hover:underline text-sm mt-2 block">
                        View Recommendations
                    </Link>
                </Card>
                <Card title="Slow Queries Today" value={summary?.slowQueriesToday || 0} icon="🐢">
                    <p className="text-sm text-gray-500">
                        {summary?.newSlowQueriesToday} new
                    </p>
                    <Link to="/monitoring/slow-queries" className="text-blue-600 hover:underline text-sm mt-2 block">
                        Analyze Queries
                    </Link>
                </Card>
            </div>

            {/* Placeholder for charts/graphs */}
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Recent Activities</h2>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-gray-600">
                    Detailed graphs and tables for recent slow queries, recommendation trends,
                    and database health would go here.
                </p>
                <div className="mt-4 text-sm text-gray-500">
                    E.g., "Top 5 Slowest Queries", "Index Recommendations by Database", "Monitoring Trends".
                </div>
            </div>
        </div>
    );
};
```