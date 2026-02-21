```typescript
import React from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import { ChartConfiguration, ChartType } from '../../types';
import { Box, Typography } from '@mui/material';

interface ChartRendererProps {
  type: ChartType;
  data: any[];
  configuration: ChartConfiguration;
  style?: React.CSSProperties;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ type, data, configuration, style }) => {
  if (!data || data.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'text.secondary' }}>
        <Typography>No data to display.</Typography>
      </Box>
    );
  }

  // Common chart properties
  const commonProps = {
    margin: { top: 40, right: 30, bottom: 80, left: 70 },
    animate: true,
    motionConfig: 'molasses',
  };

  switch (type) {
    case 'bar':
      return (
        <ResponsiveBar
          data={data}
          keys={[configuration.yAxis as string]}
          indexBy={configuration.xAxis as string}
          {...commonProps}
          padding={0.3}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={{ scheme: 'nivo' }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: configuration.xAxis as string,
            legendPosition: 'middle',
            legendOffset: 60,
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: configuration.yAxis as string,
            legendPosition: 'middle',
            legendOffset: -50,
          }}
          labelSkipWidth={12}
          labelSkipHeight={12}
          labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
          role="application"
          ariaLabel="Nivo bar chart"
          style={style}
        />
      );
    case 'line':
      // Nivo line chart expects data in [{ id: 'seriesA', data: [{ x: val, y: val }] }] format
      // Our backend sends processed data like [{ xAxis_value: X, yAxis_value: Y }]
      // We need to transform it to Nivo's series format.
      const lineData = [{
        id: configuration.yAxis as string, // Or a dynamic name
        data: data.map(d => ({
          x: d[configuration.xAxis as string],
          y: d[configuration.yAxis as string],
        })),
      }];
      return (
        <ResponsiveLine
          data={lineData}
          {...commonProps}
          pointSize={10}
          pointColor={{ theme: 'background' }}
          pointBorderWidth={2}
          pointBorderColor={{ from: 'serieColor' }}
          pointLabelYOffset={-12}
          useMesh={true}
          legends={[
            {
              anchor: 'bottom-right',
              direction: 'column',
              justify: false,
              translateX: 100,
              translateY: 0,
              itemsSpacing: 0,
              itemDirection: 'left-to-right',
              itemWidth: 80,
              itemHeight: 20,
              itemOpacity: 0.75,
              symbolSize: 12,
              symbolShape: 'circle',
              symbolBorderColor: 'rgba(0, 0, 0, .5)',
              effects: [
                {
                  on: 'hover',
                  style: {
                    itemBackground: 'rgba(0, 0, 0, .03)',
                    itemOpacity: 1,
                  },
                },
              ],
            },
          ]}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: configuration.xAxis as string,
            legendOffset: 60,
            legendPosition: 'middle',
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: configuration.yAxis as string,
            legendOffset: -50,
            legendPosition: 'middle',
          }}
          style={style}
        />
      );
    case 'pie':
      return (
        <ResponsivePie
          data={data}
          {...commonProps}
          id="id" // The 'id' field in data should be mapped to category
          value="value" // The 'value' field in data should be mapped to value
          innerRadius={0.5}
          padAngle={0.7}
          cornerRadius={3}
          colors={{ scheme: 'paired' }}
          borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
          arcLinkLabelsTextColor="#333333"
          arcLinkLabelsThickness={2}
          arcLinkLabelsColor={{ from: 'color' }}
          arcLabelsSkipAngle={10}
          arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
          defs={[
            {
              id: 'dots',
              type: 'patternDots',
              background: 'inherit',
              color: 'rgba(255, 255, 255, 0.3)',
              size: 4,
              padding: 1,
              stagger: true,
            },
            {
              id: 'lines',
              type: 'patternLines',
              background: 'inherit',
              color: 'rgba(255, 255, 255, 0.3)',
              rotation: -45,
              lineWidth: 6,
              spacing: 10,
            },
          ]}
          fill={[
            {
              match: {
                id: 'ruby',
              },
              id: 'dots',
            },
            {
              match: {
                id: 'c',
              },
              id: 'dots',
            },
            {
              match: {
                id: 'go',
              },
              id: 'dots',
            },
            {
              match: {
                id: 'python',
              },
              id: 'dots',
            },
            {
              match: {
                id: 'scala',
              },
              id: 'lines',
            },
            {
              match: {
                id: 'lisp',
              },
              id: 'lines',
            },
            {
              match: {
                id: 'elixir',
              },
              id: 'lines',
            },
            {
              match: {
                id: 'javascript',
              },
              id: 'lines',
            },
          ]}
          legends={[
            {
              anchor: 'bottom',
              direction: 'row',
              justify: false,
              translateX: 0,
              translateY: 56,
              itemsSpacing: 0,
              itemWidth: 100,
              itemHeight: 18,
              itemTextColor: '#999',
              itemDirection: 'left-to-right',
              itemOpacity: 1,
              symbolSize: 18,
              symbolShape: 'circle',
              effects: [
                {
                  on: 'hover',
                  style: {
                    itemTextColor: '#000',
                  },
                },
              ],
            },
          ]}
          style={style}
        />
      );
    case 'scatterplot':
      // Nivo scatterplot expects data in [{ id: 'seriesA', data: [{ x: val, y: val, id: val }] }] format
      // Our backend sends it as [{ x: val, y: val, id: val, data: originalRow }]
      const scatterSeries = [{
        id: 'Data Series', // Can be dynamic if multiple series
        data: data.map(item => ({ x: item.x, y: item.y, id: item.id })),
      }];
      return (
        <ResponsiveScatterPlot
          data={scatterSeries}
          {...commonProps}
          xScale={{ type: 'linear', min: 'auto', max: 'auto' }}
          yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: configuration.xAxis as string,
            legendPosition: 'middle',
            legendOffset: 46,
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: configuration.yAxis as string,
            legendPosition: 'middle',
            legendOffset: -60,
          }}
          nodeSize={10}
          colors={{ scheme: 'set1' }}
          blendMode="multiply"
          tooltip={({ node }) => (
            <Box
              sx={{
                background: 'white',
                padding: '12px 16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <strong>X:</strong> {node.data.x}<br />
              <strong>Y:</strong> {node.data.y}<br />
              {/* You might want to display other data from node.data.data here */}
              {/* E.g., Object.entries(node.data.data || {}).map(([key, value]) => <div key={key}><strong>{key}:</strong> {String(value)}</div>) */}
            </Box>
          )}
          style={style}
        />
      );
    default:
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'error.main' }}>
          <Typography>Unsupported chart type: {type}</Typography>
        </Box>
      );
  }
};

export default ChartRenderer;
```