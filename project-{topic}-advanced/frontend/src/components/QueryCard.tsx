```tsx
import React from 'react';
import { Card, CardContent, Typography, Button, Box, Chip } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DatabaseIcon from '@mui/icons-material/Storage';
import AppIcon from '@mui/icons-material/Apps';
import CodeIcon from '@mui/icons-material/Code';
import { SlowQuery } from '../types';
import { Link as RouterLink } from 'react-router-dom';

interface QueryCardProps {
  query: SlowQuery;
}

const QueryCard: React.FC<QueryCardProps> = ({ query }) => {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms} ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(2)} s`;
    const minutes = seconds / 60;
    return `${minutes.toFixed(2)} min`;
  };

  return (
    <Card variant="outlined" sx={{ mb: 2, borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: '#3f51b5' }}>
            Query ID: {query.id.substring(0, 8)}...
          </Typography>
          <Chip
            icon={<AccessTimeIcon />}
            label={formatTime(query.executionTimeMs)}
            color="secondary"
            sx={{ bgcolor: '#e0f2f7', color: '#0070a8', fontWeight: 'bold' }}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Chip icon={<DatabaseIcon />} label={query.database?.name || 'N/A'} variant="outlined" size="small" />
          {query.clientApplication && <Chip icon={<AppIcon />} label={query.clientApplication} variant="outlined" size="small" />}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: '100px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            mb: 2,
            p: 1,
            bgcolor: '#f5f5f5',
            borderRadius: '4px'
        }}>
          {query.query.length > 200 ? query.query.substring(0, 200) + '...' : query.query}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Reported: {new Date(query.reportedAt).toLocaleString()}
          </Typography>
          <Button
            component={RouterLink}
            to={`/queries/${query.id}`}
            variant="outlined"
            size="small"
            startIcon={<CodeIcon />}
            sx={{ textTransform: 'none' }}
          >
            View Details
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default QueryCard;
```

#### `frontend/src/components/QueryDetail.tsx`