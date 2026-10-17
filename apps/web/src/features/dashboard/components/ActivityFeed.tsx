import React from 'react';
import { Card, CardContent, Typography, Box, List, ListItem, ListItemText, ListItemAvatar, Avatar } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { ActivityItem } from '@whatsapp-saas/contracts';

interface ActivityFeedProps {
  activities: ActivityItem[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'campaign_completed':
        return {
          icon: <CheckCircleOutlineIcon fontSize="small" />,
          color: '#10B981',
          bg: 'rgba(16, 185, 129, 0.12)',
        };
      case 'template_approved':
        return {
          icon: <VerifiedOutlinedIcon fontSize="small" />,
          color: '#6366F1',
          bg: 'rgba(99, 102, 241, 0.12)',
        };
      case 'contacts_imported':
        return {
          icon: <GroupAddOutlinedIcon fontSize="small" />,
          color: '#0EA5E9',
          bg: 'rgba(14, 165, 233, 0.12)',
        };
      case 'account_connected':
        return {
          icon: <WhatsAppIcon fontSize="small" />,
          color: '#22C55E',
          bg: 'rgba(34, 197, 94, 0.12)',
        };
    }
  };

  return (
    <Card id="list-recent-activity" sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h3" fontWeight={700}>
          Recent Activity
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Real-time account lifecycle and automation updates
        </Typography>

        <List disablePadding>
          {activities.map((item, idx) => {
            const meta = getActivityIcon(item.type);
            const isLast = idx === activities.length - 1;

            return (
              <ListItem
                key={item.id}
                alignItems="flex-start"
                disableGutters
                sx={{
                  py: 1.5,
                  borderBottom: isLast ? 'none' : '1px solid',
                  borderColor: 'divider',
                }}
              >
                <ListItemAvatar sx={{ minWidth: 46 }}>
                  <Avatar
                    sx={{
                      width: 34,
                      height: 34,
                      bgcolor: meta.bg,
                      color: meta.color,
                    }}
                  >
                    {meta.icon}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight={700} color="text.primary">
                        {item.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.timestamp}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {item.description}
                    </Typography>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      </CardContent>
    </Card>
  );
};
