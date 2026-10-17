import React from 'react';
import { Box, Card, CardContent, Typography, Grid, Chip } from '@mui/material';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import CheckIcon from '@mui/icons-material/Check';
import { PageHeader } from '../../../components/common/PageHeader.js';

export const BillingPage: React.FC = () => {
  const tiers = [
    {
      name: 'Starter Tier',
      price: '$49/mo',
      quota: '5,000 WhatsApp Messages',
      contacts: 'Up to 10,000 Contacts',
      waba: '2 Phone Numbers',
    },
    {
      name: 'Growth Tier (Current)',
      price: '$149/mo',
      quota: '50,000 WhatsApp Messages',
      contacts: 'Up to 100,000 Contacts',
      waba: '5 Phone Numbers',
      current: true,
    },
    {
      name: 'Enterprise Tier',
      price: 'Custom',
      quota: '1,000,000+ Messages',
      contacts: 'Unlimited Contacts',
      waba: '50 Phone Numbers',
    },
  ];

  return (
    <Box id="billing-page-container">
      <PageHeader
        title="Subscription & Usage"
        subtitle="Stripe billing portal, monthly messaging quotas, and invoice receipts"
      />

      <Grid container spacing={3}>
        {tiers.map(tier => (
          <Grid item xs={12} md={4} key={tier.name}>
            <Card
              sx={{
                height: '100%',
                p: 2,
                border: tier.current ? '2px solid' : '1px solid',
                borderColor: tier.current ? 'primary.main' : 'divider',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h4" fontWeight={700}>
                    {tier.name}
                  </Typography>
                  {tier.current && <Chip label="ACTIVE" color="primary" size="small" sx={{ fontWeight: 700 }} />}
                </Box>
                <Typography variant="h3" fontWeight={800} sx={{ mb: 2 }}>
                  {tier.price}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckIcon sx={{ fontSize: 18, color: 'success.main' }} />
                    <Typography variant="body2">{tier.quota}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckIcon sx={{ fontSize: 18, color: 'success.main' }} />
                    <Typography variant="body2">{tier.contacts}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckIcon sx={{ fontSize: 18, color: 'success.main' }} />
                    <Typography variant="body2">{tier.waba}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box
        sx={{
          mt: 4,
          p: 3,
          borderRadius: 2,
          backgroundColor: theme =>
            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <CreditCardOutlinedIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>
            Stripe Checkout Integration (Phase 5 Roadmap)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Payment webhooks, credit-card tokenization, and live usage metering will be activated in Phase 5.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
