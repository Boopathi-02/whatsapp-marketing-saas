import React, { useState } from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { MessageVolumeDataPoint } from '@whatsapp-saas/contracts';

interface VolumeChartProps {
  data: MessageVolumeDataPoint[];
}

export const VolumeChart: React.FC<VolumeChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxSent = Math.max(...data.map(d => d.sent), 1);

  return (
    <Card id="chart-message-volume" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h3" fontWeight={700}>
              Message Volume & Delivery Funnel
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Daily dispatch totals with deliverability and read receipt ratios
            </Typography>
          </Box>

          {/* Legend */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#6366F1' }} />
              <Typography variant="caption" color="text.secondary">
                Sent
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#14B8A6' }} />
              <Typography variant="caption" color="text.secondary">
                Delivered
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#0EA5E9' }} />
              <Typography variant="caption" color="text.secondary">
                Read
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Bar Chart Container */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: { xs: 1, sm: 2 },
            height: 240,
            pt: 2,
            pb: 1,
            position: 'relative',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {data.map((item, index) => {
            const isHovered = hoveredIndex === index;
            const sentHeightPercent = Math.max((item.sent / maxSent) * 100, 10);
            const deliveredHeightPercent = (item.delivered / item.sent) * sentHeightPercent;
            const readHeightPercent = (item.read / item.sent) * sentHeightPercent;

            return (
              <Box
                key={item.date}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                {/* Hover Tooltip Card */}
                {isHovered && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: '105%',
                      zIndex: 10,
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                      border: '1px solid',
                      borderColor: 'divider',
                      minWidth: 140,
                      pointerEvents: 'none',
                    }}
                  >
                    <Typography variant="caption" fontWeight={700} display="block" color="text.primary">
                      {item.date} Details
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ color: '#6366F1' }}>
                      Sent: {item.sent.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ color: '#14B8A6' }}>
                      Delivered: {item.delivered.toLocaleString()} (
                      {Math.round((item.delivered / item.sent) * 100)}%)
                    </Typography>
                    <Typography variant="caption" display="block" sx={{ color: '#0EA5E9' }}>
                      Read: {item.read.toLocaleString()} ({Math.round((item.read / item.sent) * 100)}
                      %)
                    </Typography>
                  </Box>
                )}

                {/* Triple Stacked / Nested Bar */}
                <Box
                  sx={{
                    width: '100%',
                    maxWidth: 44,
                    height: `${sentHeightPercent}%`,
                    bgcolor: 'rgba(99, 102, 241, 0.25)',
                    borderRadius: '6px 6px 0 0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    transform: isHovered ? 'scaleY(1.02)' : 'none',
                    overflow: 'hidden',
                  }}
                >
                  {/* Delivered Bar */}
                  <Box
                    sx={{
                      width: '100%',
                      height: `${(deliveredHeightPercent / sentHeightPercent) * 100}%`,
                      bgcolor: 'rgba(20, 184, 166, 0.35)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                    }}
                  >
                    {/* Read Bar */}
                    <Box
                      sx={{
                        width: '100%',
                        height: `${(readHeightPercent / deliveredHeightPercent) * 100}%`,
                        bgcolor: '#14B8A6',
                        borderRadius: '4px 4px 0 0',
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* X-Axis Labels */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5, px: 1 }}>
          {data.map(item => (
            <Typography
              key={item.date}
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              sx={{ textAlign: 'center', flex: 1 }}
            >
              {item.date}
            </Typography>
          ))}
        </Box>

        {/* Footer Insight */}
        <Box
          sx={{
            mt: 3,
            p: 1.5,
            borderRadius: 2,
            bgcolor: theme =>
              theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Weekly Aggregate: <strong>{data.reduce((acc, d) => acc + d.sent, 0).toLocaleString()}</strong> messages sent
          </Typography>
          <Chip
            size="small"
            label="Peak Volume: Friday"
            variant="outlined"
            color="primary"
            sx={{ height: 20, fontSize: '0.6875rem' }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};
