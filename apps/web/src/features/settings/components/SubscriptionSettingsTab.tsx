import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Grid,
  LinearProgress,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
} from '@mui/material';
import CardMembershipIcon from '@mui/icons-material/CardMembership';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import MessageOutlinedIcon from '@mui/icons-material/MessageOutlined';
import ContactsOutlinedIcon from '@mui/icons-material/ContactsOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined';
import { PlanDto, SubscriptionDto } from '@whatsapp-saas/contracts';
import { useOptionalAuth } from '../../auth/AuthContext.js';
import { api, ApiClientError } from '../../../lib/api.js';
import { formatDuration, formatMinor } from '../../billing/money.js';

interface SubscriptionSettingsTabProps {
  onNavigateTab?: (tab: string) => void;
}

const STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  trialing: 'info',
  active: 'success',
  past_due: 'warning',
  suspended: 'error',
  cancelled: 'default',
  expired: 'error',
};

const DENIAL_TEXT: Record<string, string> = {
  TRIAL_EXPIRED: 'Your trial has ended. Messaging is paused until a plan is activated.',
  SUBSCRIPTION_PAST_DUE: 'Payment is past due. Messaging is paused.',
  SUBSCRIPTION_SUSPENDED: 'This subscription is suspended. Contact support.',
  SUBSCRIPTION_CANCELLED: 'This subscription is cancelled.',
  WORKSPACE_NOT_ACTIVE: 'This workspace is not active.',
};

function errorText(err: unknown): string {
  return err instanceof ApiClientError || err instanceof Error ? err.message : 'Something went wrong.';
}

export const SubscriptionSettingsTab: React.FC<SubscriptionSettingsTabProps> = ({ onNavigateTab }) => {
  const auth = useOptionalAuth();
  const workspace = auth?.currentWorkspace;
  const role = workspace?.role;
  const isOwner = role === 'owner';
  const base = workspace ? `/workspaces/${workspace.id}/billing` : null;

  const [subscription, setSubscription] = useState<SubscriptionDto | null>(null);
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);

  const load = useCallback(async () => {
    if (!base) return;
    setLoading(true);
    setError(null);
    try {
      const [sub, planList] = await Promise.all([
        api.get<SubscriptionDto>(`${base}/subscription`),
        api.get<PlanDto[]>(`${base}/plans`),
      ]);
      setSubscription(sub);
      setPlans(planList);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    void load();
  }, [load]);

  const cancelSubscription = async () => {
    if (!base) return;
    setCancelBusy(true);
    try {
      const updated = await api.post<SubscriptionDto>(`${base}/subscription/cancel`, {});
      setSubscription(updated);
      setNotice('Subscription cancelled.');
      setConfirmCancel(false);
    } catch (err) {
      setError(errorText(err));
      setConfirmCancel(false);
    } finally {
      setCancelBusy(false);
    }
  };

  if (!workspace) {
    return <Alert severity="info">Select a workspace to view subscription details.</Alert>;
  }

  const trialTotal = subscription
    ? new Date(subscription.trialEndsAt).getTime() - new Date(subscription.trialStartedAt).getTime()
    : 0;
  const trialPct =
    subscription && trialTotal > 0
      ? Math.min(100, Math.max(0, 100 - ((subscription.trialSecondsRemaining * 1000) / trialTotal) * 100))
      : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Notifications */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" onClose={() => setNotice(null)} sx={{ borderRadius: 2 }}>
          {notice}
        </Alert>
      )}

      {loading && !subscription ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }} role="status" aria-label="Loading subscription">
          <CircularProgress />
        </Box>
      ) : (
        subscription && (
          <Grid container spacing={3}>
            {/* Active Subscription Hero Card */}
            <Grid item xs={12} lg={7}>
              <Card sx={{ height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <CardMembershipIcon color="primary" />
                      <Typography variant="h5" fontWeight={700}>
                        Current Plan: {subscription.planKey.toUpperCase()}
                      </Typography>
                    </Box>
                    <Chip
                      label={subscription.status.replace('_', ' ').toUpperCase()}
                      color={STATUS_COLOR[subscription.status] ?? 'default'}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                    Subscription Plan: <strong>{subscription.planKey}</strong> (version {subscription.planVersion})
                  </Typography>

                  {/* Trial countdown */}
                  {subscription.storedStatus === 'trialing' && subscription.status === 'trialing' && (
                    <Box
                      sx={{
                        p: 2.5,
                        mb: 2.5,
                        borderRadius: 2,
                        backgroundColor: theme =>
                          theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.08)' : 'rgba(33, 150, 243, 0.05)',
                        border: '1px solid',
                        borderColor: 'info.light',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight={700} color="info.main">
                          Trial: {formatDuration(subscription.trialSecondsRemaining)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Ends {new Date(subscription.trialEndsAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={trialPct}
                        aria-label="Trial progress"
                        sx={{ height: 8, borderRadius: 4 }}
                      />
                    </Box>
                  )}

                  {/* Messaging Denial Warning */}
                  {!subscription.canDispatch && (
                    <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
                      {DENIAL_TEXT[subscription.denialReason ?? ''] ?? 'Messaging is currently disabled.'}
                    </Alert>
                  )}

                  {/* Quick Action row */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', pt: 1 }}>
                    {onNavigateTab && (
                      <Button
                        variant="outlined"
                        color="primary"
                        onClick={() => onNavigateTab('billing')}
                        sx={{ fontWeight: 600, borderRadius: 2 }}
                      >
                        Manage Wallet & Billing
                      </Button>
                    )}

                    {isOwner && subscription.status !== 'cancelled' && subscription.status !== 'expired' && (
                      <Button
                        color="error"
                        onClick={() => setConfirmCancel(true)}
                        sx={{ fontWeight: 600 }}
                      >
                        Cancel subscription
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Plan Entitlements & Resource Limits */}
            <Grid item xs={12} lg={5}>
              <Card sx={{ height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
                    Plan Entitlements
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                    Resource quotas and monthly allocations included with your active tier:
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: theme =>
                          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <MessageOutlinedIcon color="primary" fontSize="small" />
                        <Typography variant="body2" fontWeight={600}>
                          Monthly Messages
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={700}>
                        {subscription.entitlements.monthlyMessageLimit.toLocaleString()} messages / month
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: theme =>
                          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <ContactsOutlinedIcon color="primary" fontSize="small" />
                        <Typography variant="body2" fontWeight={600}>
                          Contacts Limit
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={700}>
                        {subscription.entitlements.contactLimit.toLocaleString()} contacts
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: theme =>
                          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <GroupOutlinedIcon color="primary" fontSize="small" />
                        <Typography variant="body2" fontWeight={600}>
                          Team Seats
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={700}>
                        {subscription.entitlements.userLimit} user(s)
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: theme =>
                          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <WhatsAppIcon color="success" fontSize="small" />
                        <Typography variant="body2" fontWeight={600}>
                          WhatsApp Channels
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={700}>
                        {subscription.entitlements.whatsappAccountLimit} WhatsApp number(s)
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Available Upgrade Plans */}
            <Grid item xs={12}>
              <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <AutoAwesomeOutlinedIcon color="primary" />
                    <Typography variant="h5" fontWeight={700}>
                      Available Plans
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Scale your marketing operations with higher broadcast throughput and multi-agent inboxes.
                  </Typography>

                  {plans.length === 0 ? (
                    <Box
                      sx={{
                        p: 4,
                        textAlign: 'center',
                        borderRadius: 2,
                        backgroundColor: theme =>
                          theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
                        border: '1px dashed',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body1" color="text.secondary">
                        No paid plans have been published yet.
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        Custom enterprise tiers and multi-channel packages can be configured via administrative support.
                      </Typography>
                    </Box>
                  ) : (
                    <Grid container spacing={2.5}>
                      {plans.map(p => {
                        const isCurrent = p.planKey === subscription.planKey;

                        return (
                          <Grid item xs={12} sm={6} md={4} key={`${p.planKey}-${p.version}`}>
                            <Card
                              elevation={0}
                              sx={{
                                height: '100%',
                                p: 2.5,
                                borderRadius: 3,
                                border: '2px solid',
                                borderColor: isCurrent ? 'primary.main' : 'divider',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                              }}
                            >
                              <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Typography variant="h6" fontWeight={700}>
                                    {p.name}
                                  </Typography>
                                  {isCurrent && (
                                    <Chip label="Current Plan" color="primary" size="small" sx={{ fontWeight: 700 }} />
                                  )}
                                </Box>

                                <Typography variant="h4" fontWeight={800} sx={{ my: 1.5 }}>
                                  {p.prices.length > 0
                                    ? p.prices.map(x => `${formatMinor(x.amountMinor, x.currency)} / ${x.interval}`).join(' · ')
                                    : 'Pricing not configured'}
                                </Typography>

                                <Divider sx={{ my: 2 }} />

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CheckCircleOutlineIcon color="success" fontSize="small" />
                                    <Typography variant="body2">Dedicated WhatsApp Cloud API channel</Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CheckCircleOutlineIcon color="success" fontSize="small" />
                                    <Typography variant="body2">Interactive message templates</Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CheckCircleOutlineIcon color="success" fontSize="small" />
                                    <Typography variant="body2">Full live inbox & automated opt-out</Typography>
                                  </Box>
                                </Box>
                              </Box>

                              <Box sx={{ mt: 3 }}>
                                {!p.purchasable ? (
                                  <Typography variant="caption" color="text.secondary">
                                    Not available for purchase yet.
                                  </Typography>
                                ) : isCurrent ? (
                                  <Button fullWidth variant="outlined" disabled sx={{ fontWeight: 700 }}>
                                    Active Plan
                                  </Button>
                                ) : (
                                  <Button fullWidth variant="contained" color="primary" sx={{ fontWeight: 700 }}>
                                    Upgrade to {p.name}
                                  </Button>
                                )}
                              </Box>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={confirmCancel} onClose={() => setConfirmCancel(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Cancel subscription?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Messaging will stop when your current access ends. This cannot be undone from this screen.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setConfirmCancel(false)} color="inherit">
            Keep subscription
          </Button>
          <Button
            id="btn-confirm-cancel-subscription"
            color="error"
            variant="contained"
            onClick={cancelSubscription}
            disabled={cancelBusy}
            sx={{ fontWeight: 700 }}
          >
            {cancelBusy ? <CircularProgress size={20} color="inherit" /> : 'Confirm Cancellation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
