import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ResponsiveGridLayout, Layout as GridLayoutItem } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { getDashboardById, updateDashboard, createDashboard, getUserDashboards } from '../api/dashboards';
import { Chart, Dashboard } from '../types/dashboard.types';
import ChartRenderer from '../components/charts/ChartRenderer';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { getCharts } from '../api/charts';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import Select from 'react-select';
import { logger } from '../../../server/src/middleware/logger.middleware'; // Example usage

interface SelectOption {
  value: string;
  label: string;
}

const DashboardPage: React.FC = () => {
  const { id: dashboardId } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [layout, setLayout] = useState<GridLayoutItem[]>([]);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [availableCharts, setAvailableCharts] = useState<Chart[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showAddChartModal, setShowAddChartModal] = useState<boolean>(false);
  const [selectedChartToAdd, setSelectedChartToAdd] = useState<SelectOption | null>(null);
  const [dashboardName, setDashboardName] = useState<string>('New Dashboard');

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    try {
      if (dashboardId) {
        const fetchedDashboard = await getDashboardById(dashboardId);
        setDashboard(fetchedDashboard);
        setLayout(fetchedDashboard.layout || []);
        setDashboardName(fetchedDashboard.name);
        const fetchedCharts = await getCharts();
        const dashboardChartIds = new Set(fetchedDashboard.charts.map(c => c.id));
        setCharts(fetchedCharts.filter(c => dashboardChartIds.has(c.id)));
        setAvailableCharts(fetchedCharts.filter(c => !dashboardChartIds.has(c.id)));
      } else {
        // New dashboard logic
        setDashboard(null);
        setLayout([]);
        setDashboardName('New Dashboard');
        const fetchedCharts = await getCharts();
        setAvailableCharts(fetchedCharts);
        setCharts([]);
      }
    } catch (error) {
      toast.error('Failed to load dashboard.');
      logger.error("Failed to load dashboard: ", error); // Using backend logger example
      setDashboard(null);
    }
  }, [dashboardId, user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onLayoutChange = (newLayout: GridLayoutItem[]) => {
    if (isEditing) {
      setLayout(newLayout);
    }
  };

  const handleSaveDashboard = async () => {
    if (!user) {
      toast.error("User not authenticated.");
      return;
    }

    try {
      const dashboardData = {
        name: dashboardName,
        description: dashboard?.description || 'A custom dashboard.',
        layout: layout,
        chartIds: charts.map(chart => chart.id),
      };

      if (dashboardId) {
        await updateDashboard(dashboardId, dashboardData);
        toast.success('Dashboard updated successfully!');
      } else {
        // Create new dashboard
        const newDashboard = await createDashboard(dashboardData);
        // navigate(`/dashboards/${newDashboard.id}`); // Redirect to new dashboard URL
        toast.success('Dashboard created successfully!');
      }
      setIsEditing(false);
      fetchDashboardData(); // Re-fetch to update state consistently
    } catch (error) {
      toast.error('Failed to save dashboard.');
      logger.error("Failed to save dashboard: ", error);
    }
  };

  const handleAddChartToDashboard = () => {
    if (selectedChartToAdd && charts.findIndex(c => c.id === selectedChartToAdd.value) === -1) {
      const chartToAdd = availableCharts.find(c => c.id === selectedChartToAdd.value);
      if (chartToAdd) {
        setCharts([...charts, chartToAdd]);
        // Add a default layout item for the new chart
        const newLayoutItem: GridLayoutItem = {
          i: chartToAdd.id,
          x: (layout.length * 2) % 12, // Simple placement logic
          y: Infinity, // Puts it at the bottom
          w: 4,
          h: 6,
          minW: 2,
          minH: 4,
        };
        setLayout([...layout, newLayoutItem]);
        setAvailableCharts(availableCharts.filter(c => c.id !== chartToAdd.id));
      }
    }
    setSelectedChartToAdd(null);
    setShowAddChartModal(false);
  };

  const handleRemoveChartFromDashboard = (chartId: string) => {
    const chartToRemove = charts.find(c => c.id === chartId);
    if (chartToRemove) {
      setCharts(charts.filter(c => c.id !== chartId));
      setLayout(layout.filter(item => item.i !== chartId));
      setAvailableCharts([...availableCharts, chartToRemove]);
    }
  };

  const chartOptions = availableCharts.map(chart => ({ value: chart.id, label: chart.name }));

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        {isEditing ? (
          <input
            type="text"
            className="text-3xl font-bold p-2 border rounded"
            value={dashboardName}
            onChange={(e) => setDashboardName(e.target.value)}
          />
        ) : (
          <h1 className="text-3xl font-bold">{dashboardName}</h1>
        )}

        <div>
          {isEditing ? (
            <>
              <Button onClick={() => setShowAddChartModal(true)} className="mr-2">Add Chart</Button>
              <Button onClick={handleSaveDashboard} className="mr-2 bg-green-500 hover:bg-green-600">Save</Button>
              <Button onClick={() => setIsEditing(false)} variant="secondary">Cancel</Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Dashboard</Button>
          )}
        </div>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: layout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={30}
        width={window.innerWidth - 60} // Adjust based on sidebar/padding
        onLayoutChange={onLayoutChange}
        isDraggable={isEditing}
        isResizable={isEditing}
        useCSSTransforms={true}
        measureBeforeMount={true}
      >
        {charts.map((chart) => (
          <div key={chart.id} data-grid={layout.find(item => item.i === chart.id) || { x: 0, y: 0, w: 4, h: 6 }}>
            <div className="relative w-full h-full bg-white rounded shadow-md p-2 flex flex-col">
              <h3 className="font-semibold text-lg mb-2">{chart.name}</h3>
              {isEditing && (
                <Button
                  onClick={() => handleRemoveChartFromDashboard(chart.id)}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full text-xs"
                >
                  X
                </Button>
              )}
              <div className="flex-grow">
                <ChartRenderer chartData={chart} />
              </div>
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Add Chart Modal */}
      <Modal isOpen={showAddChartModal} onClose={() => setShowAddChartModal(false)} title="Add Chart to Dashboard">
        <div className="p-4">
          <Select
            options={chartOptions}
            onChange={(option) => setSelectedChartToAdd(option as SelectOption)}
            value={selectedChartToAdd}
            placeholder="Select a chart..."
            className="mb-4"
          />
          <Button onClick={handleAddChartToDashboard} disabled={!selectedChartToAdd}>Add Chart</Button>
        </div>
      </Modal>
    </div>
  );
};

export default DashboardPage;