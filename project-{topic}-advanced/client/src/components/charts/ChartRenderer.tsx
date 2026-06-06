import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import { Chart as ChartType } from '../../types/dashboard.types';
import { executeChartQuery } from '../../api/charts';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

interface ChartRendererProps {
  chartData: ChartType;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ chartData }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth(); // Assuming user is needed for permissions/context

  const renderChart = useCallback(async () => {
    if (!chartRef.current) return;

    setLoading(true);
    setError(null);
    let chartInstance: echarts.ECharts | undefined;

    try {
      chartInstance = echarts.getInstanceByDom(chartRef.current);
      if (!chartInstance) {
        chartInstance = echarts.init(chartRef.current);
      }

      // Fetch data for the chart
      let queryResult: any[] = [];
      if (chartData.dataSourceId && chartData.query) {
        try {
          queryResult = await executeChartQuery(chartData.dataSourceId, chartData.query);
        } catch (queryError) {
          setError(`Failed to fetch data: ${(queryError as Error).message}`);
          setLoading(false);
          return;
        }
      }

      // Merge fetched data into chart configuration if applicable
      // This is a simplified example. In a real app, you'd map queryResult to
      // ECharts series data based on chartData.configuration's data mapping rules.
      const baseOption = JSON.parse(chartData.configuration);
      const finalOption = { ...baseOption };

      if (queryResult.length > 0) {
        // Example: If chart type is 'bar' and configuration expects data in a specific format
        // This part would need robust mapping logic based on chartType and user-defined mappings
        if (chartData.type === 'bar' || chartData.type === 'line') {
          const categories = queryResult.map(row => row[Object.keys(row)[0]]); // First column as category
          const seriesData = queryResult.map(row => row[Object.keys(row)[1]]); // Second column as value

          finalOption.xAxis = {
            type: 'category',
            data: categories,
          };
          finalOption.yAxis = { type: 'value' };
          finalOption.series = [{
            name: chartData.name,
            type: chartData.type,
            data: seriesData,
            emphasis: {
              focus: 'series'
            }
          }];
        } else if (chartData.type === 'pie') {
          finalOption.series = [{
            name: chartData.name,
            type: 'pie',
            radius: '50%',
            data: queryResult.map(row => ({
              value: row[Object.keys(row)[1]],
              name: row[Object.keys(row)[0]]
            })),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }];
        } else if (chartData.type === 'table') {
          // For table charts, we won't use ECharts directly,
          // instead, render a simple HTML table within this component.
          // This requires a separate rendering path. For now, we'll
          // just display a placeholder or raw data.
          setError("Table charts are rendered natively, not via ECharts. Displaying raw data.");
          setLoading(false);
          return;
        }
      } else {
        // Handle empty data state gracefully
        setError('No data available for this chart.');
      }

      chartInstance.setOption(finalOption);

      // Add resize listener
      const resizeObserver = new ResizeObserver(() => {
        chartInstance?.resize();
      });
      resizeObserver.observe(chartRef.current);

      return () => {
        resizeObserver.disconnect();
        chartInstance?.dispose();
      };
    } catch (err) {
      console.error('Error rendering chart:', err);
      setError(`Failed to render chart: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [chartData]); // Re-render if chartData changes

  useEffect(() => {
    renderChart();
  }, [renderChart]);

  // Handle window resize for ECharts responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        const chartInstance = echarts.getInstanceByDom(chartRef.current);
        chartInstance?.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      {loading && <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">Loading chart data...</div>}
      {error && <div className="absolute inset-0 flex items-center justify-center bg-red-100 text-red-700 p-2 z-10">{error}</div>}
      <div ref={chartRef} style={{ width: '100%', height: '100%', minHeight: '200px' }} />
    </div>
  );
};

export default ChartRenderer;