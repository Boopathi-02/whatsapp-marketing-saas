import React from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { DashboardMetrics } from '@whatsapp-saas/contracts';

interface MetricsOverviewProps {
  metrics: DashboardMetrics;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ metrics }) => {
  const cards = [
    {
      id: 'metric-total-contacts',
      label: 'Total Contacts',
      value: metrics.totalContacts.toLocaleString(),
      trend: `+${metrics.contactsGrowthPercentage}% this month`,
      trendPositive: true,
      icon: <PeopleAltOutlinedIcon fontSize="medium" />,
      color: '#10B981',
      bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.03) 100%)',
    },
    {
      id: 'metric-messages-sent',
      label: 'Messages Sent (30d)',
      value: metrics.messagesSent.toLocaleString(),
      trend: `+${metrics.messagesGrowthPercentage}% vs last period`,
      trendPositive: true,
      icon: <SendOutlinedIcon fontSize="medium" />,
      color: '#6366F1',
      bgGradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.03) 100%)',
    },
    {
      id: 'metric-delivery-rate',
      label: 'Average Delivery Rate',
      value: `${metrics.deliveryRatePercentage}%`,
      trend: `+${metrics.deliveryRateTrend}% benchmark`,
      trendPositive: true,
      icon: <CheckCircleOutlineOutlinedIcon fontSize="medium" />,
      color: '#0EA5E9',
      bgGradient: 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0.03) 100%)',
    },
    {
      id: 'metric-active-campaigns',
      label: 'Active Campaigns',
      value: metrics.activeCampaignsCount.toString(),
      trend: `${metrics.activeCampaignsTrend} scheduled today`,
      trendPositive: true,
      icon: <CampaignOutlinedIcon fontSize="medium" />,
      color: '#F59E0B',
      bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.03) 100%)',
    },
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      {cards.map(card => (
        <Grid item xs={12} sm={6} lg={3} key={card.id}>
          <Card
            id={card.id}
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: theme =>
                  theme.palette.mode === 'dark'
                    ? '0 12px 24px -10px rgba(0, 0, 0, 0.6)'
                    : '0 12px 24px -10px rgba(0, 0, 0, 0.1)',
              },
            }}
          >
            <CardContent sx={{ p: 2.5, pb: '20px !important' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  {card.label}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    background: card.bgGradient,
                    color: card.color,
                  }}
                >
                  {card.icon}
                </Box>
              </Box>

              <Typography variant="h2" component="div" fontWeight={800} sx={{ mb: 1, letterSpacing: '-0.03em' }}>
                {card.value}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                  {card.trend}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};
