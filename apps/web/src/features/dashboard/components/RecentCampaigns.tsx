import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';
import { CampaignSummaryItem } from '@whatsapp-saas/contracts';
import { StatusBadge } from '../../../components/common/StatusBadge.js';

interface RecentCampaignsProps {
  campaigns: CampaignSummaryItem[];
}

export const RecentCampaigns: React.FC<RecentCampaignsProps> = ({ campaigns }) => {
  return (
    <Card id="table-recent-campaigns" sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3, pb: '16px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="h3" fontWeight={700}>
              Recent Campaigns
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Latest broadcast performance and execution state
            </Typography>
          </Box>
        </Box>

        <TableContainer>
          <Table size="medium" sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Campaign</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Audience</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>Delivery Rate</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }} align="right">
                  Timeline
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.map(camp => {
                const deliveryRate =
                  camp.sentCount > 0 ? Math.round((camp.deliveredCount / camp.sentCount) * 100) : 0;

                return (
                  <TableRow
                    key={camp.id}
                    hover
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color="text.primary">
                        {camp.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Template: {camp.templateName}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={camp.status} />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {camp.recipientsCount.toLocaleString()}
                      </Typography>
                      {camp.status === 'sending' && (
                        <Box sx={{ width: 90, mt: 0.5 }}>
                          <LinearProgress
                            variant="determinate"
                            value={(camp.sentCount / camp.recipientsCount) * 100}
                            color="info"
                            sx={{ height: 4, borderRadius: 2 }}
                          />
                        </Box>
                      )}
                    </TableCell>

                    <TableCell>
                      {camp.sentCount > 0 ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={600} color="text.primary">
                            {deliveryRate}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({camp.deliveredCount.toLocaleString()} delivered)
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Pending dispatch
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell align="right">
                      <Typography variant="caption" color="text.secondary">
                        {camp.completedAt || camp.scheduledAt || 'Draft'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};
