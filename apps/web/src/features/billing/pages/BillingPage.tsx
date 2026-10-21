import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  LedgerEntryDto,
  PaymentDto,
  PlanDto,
  SubscriptionDto,
  WalletDto,
} from '@whatsapp-saas/contracts';
import { PageHeader } from '../../../components/common/PageHeader.js';
import { EmptyState } from '../../../components/common/EmptyState.js';
import { useOptionalAuth } from '../../auth/AuthContext.js';
import { api, ApiClientError } from '../../../lib/api.js';
import { formatDuration, formatMinor, parseToMinor } from '../money.js';

interface TransactionsPage {
  items: LedgerEntryDto[];
  nextCursor: string | null;
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

export const BillingPage: React.FC = () => {
  const auth = useOptionalAuth();
  const workspace = auth?.currentWorkspace;
  const role = workspace?.role;
  const canSeeWallet = role === 'owner' || role === 'admin';
  const isOwner = role === 'owner';
  const base = workspace ? `/workspaces/${workspace.id}/billing` : null;

  const [subscription, setSubscription] = useState<SubscriptionDto | null>(null);
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [wallet, setWallet] = useState<WalletDto | null>(null);
  const [transactions, setTransactions] = useState<LedgerEntryDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [topUpBusy, setTopUpBusy] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [providerMissing, setProviderMissing] = useState(false);
  const [moreBusy, setMoreBusy] = useState(false);

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const submitting = useRef(false);

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
      if (canSeeWallet) {
        const [w, tx, pay] = await Promise.all([
          api.get<WalletDto>(`${base}/wallet`),
          api.get<TransactionsPage>(`${base}/wallet/transactions?limit=20`),
          api.get<PaymentDto[]>(`${base}/wallet/top-ups`),
        ]);
        setWallet(w);
        setTransactions(tx.items);
        setNextCursor(tx.nextCursor);
        setPayments(pay);
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [base, canSeeWallet]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = async () => {
    if (!base || !nextCursor) return;
    setMoreBusy(true);
    try {
      const page = await api.get<TransactionsPage>(`${base}/wallet/transactions?limit=20&cursor=${nextCursor}`);
      setTransactions(prev => [...prev, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setMoreBusy(false);
    }
  };

  const currency = wallet?.currency ?? 'USD';
  const parsedAmount = parseToMinor(amount, currency);

  const submitTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!base || parsedAmount === null || submitting.current) return;
    submitting.current = true;
    setTopUpBusy(true);
    setTopUpError(null);
    try {
      await api.post<PaymentDto>(`${base}/wallet/top-ups`, { amountMinor: parsedAmount, currency });
      setAmount('');
      setNotice('Top-up created. Your balance updates after the payment provider confirms the payment.');
      await load();
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'PAYMENT_PROVIDER_NOT_CONFIGURED') {
        setProviderMissing(true);
      }
      setTopUpError(errorText(err));
    } finally {
      submitting.current = false;
      setTopUpBusy(false);
    }
  };

  const cancelSubscription = async () => {
    if (!base) return;
    setCancelBusy(true);
    try {
      setSubscription(await api.post<SubscriptionDto>(`${base}/subscription/cancel`, {}));
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
    return <EmptyState title="No workspace selected" description="Select a workspace to view billing." />;
  }

  const trialTotal = subscription
    ? new Date(subscription.trialEndsAt).getTime() - new Date(subscription.trialStartedAt).getTime()
    : 0;
  const trialPct =
    subscription && trialTotal > 0
      ? Math.min(100, Math.max(0, 100 - ((subscription.trialSecondsRemaining * 1000) / trialTotal) * 100))
      : 0;

  return (
    <Box id="billing-page-container">
      <PageHeader title="Subscription & Wallet" subtitle="Trial status, plan entitlements, prepaid wallet and transactions" />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      {loading && !subscription ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }} role="status" aria-label="Loading billing">
          <CircularProgress />
        </Box>
      ) : (
        subscription && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h5" fontWeight={700}>
                      Subscription
                    </Typography>
                    <Chip
                      label={subscription.status.replace('_', ' ').toUpperCase()}
                      color={STATUS_COLOR[subscription.status] ?? 'default'}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Plan: {subscription.planKey} (v{subscription.planVersion})
                  </Typography>

                  {subscription.storedStatus === 'trialing' && subscription.status === 'trialing' && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2">
                        Trial: {formatDuration(subscription.trialSecondsRemaining)}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={trialPct}
                        aria-label="Trial progress"
                        sx={{ mt: 0.5, height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Ends {new Date(subscription.trialEndsAt).toLocaleString()}
                      </Typography>
                    </Box>
                  )}

                  {!subscription.canDispatch && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      {DENIAL_TEXT[subscription.denialReason ?? ''] ?? 'Messaging is currently disabled.'}
                    </Alert>
                  )}

                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Entitlements
                  </Typography>
                  <Typography variant="body2">
                    {subscription.entitlements.monthlyMessageLimit.toLocaleString()} messages / month ·{' '}
                    {subscription.entitlements.contactLimit.toLocaleString()} contacts ·{' '}
                    {subscription.entitlements.userLimit} users · {subscription.entitlements.whatsappAccountLimit} WhatsApp
                    numbers
                  </Typography>

                  {isOwner && subscription.status !== 'cancelled' && subscription.status !== 'expired' && (
                    <Button color="error" sx={{ mt: 2 }} onClick={() => setConfirmCancel(true)}>
                      Cancel subscription
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
                    Plans
                  </Typography>
                  {plans.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No paid plans have been published yet.
                    </Typography>
                  ) : (
                    plans.map(p => (
                      <Box key={`${p.planKey}-${p.version}`} sx={{ mb: 1.5 }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {p.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {p.prices.length > 0
                            ? p.prices.map(x => `${formatMinor(x.amountMinor, x.currency)} / ${x.interval}`).join(' · ')
                            : 'Pricing not configured'}
                        </Typography>
                        {!p.purchasable && (
                          <Typography variant="caption" color="text.secondary">
                            Not available for purchase yet.
                          </Typography>
                        )}
                      </Box>
                    ))
                  )}
                </CardContent>
              </Card>
            </Grid>

            {canSeeWallet ? (
              <>
                <Grid item xs={12} md={5}>
                  <Card>
                    <CardContent>
                      <Typography variant="h5" fontWeight={700}>
                        Wallet
                      </Typography>
                      {wallet && (
                        <>
                          <Typography variant="h3" fontWeight={800} sx={{ my: 1 }} data-testid="available-balance">
                            {formatMinor(wallet.availableMinor, wallet.currency)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Available · Reserved {formatMinor(wallet.reservedMinor, wallet.currency)} · Posted{' '}
                            {formatMinor(wallet.postedMinor, wallet.currency)}
                          </Typography>
                          {wallet.lowBalance && (
                            <Alert severity="warning" sx={{ mt: 2 }}>
                              Low balance. Add funds to keep campaigns running.
                            </Alert>
                          )}
                        </>
                      )}

                      <Box component="form" onSubmit={submitTopUp} sx={{ mt: 3 }} noValidate>
                        <TextField
                          label={`Top-up amount (${currency})`}
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                          size="small"
                          fullWidth
                          disabled={providerMissing}
                          error={amount !== '' && parsedAmount === null}
                          helperText={
                            amount !== '' && parsedAmount === null ? 'Enter a positive amount, e.g. 25.00' : ' '
                          }
                          inputProps={{ inputMode: 'decimal' }}
                        />
                        <Button
                          type="submit"
                          variant="contained"
                          disabled={parsedAmount === null || topUpBusy || providerMissing}
                          sx={{ mt: 1 }}
                        >
                          {topUpBusy ? 'Creating…' : 'Add funds'}
                        </Button>
                        {providerMissing && (
                          <Alert severity="info" sx={{ mt: 2 }}>
                            Online top-ups are not enabled yet because no payment provider is configured.
                          </Alert>
                        )}
                        {topUpError && !providerMissing && (
                          <Alert severity="error" sx={{ mt: 2 }}>
                            {topUpError}
                          </Alert>
                        )}
                      </Box>

                      {payments.some(p => p.status === 'pending') && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                          {payments.filter(p => p.status === 'pending').length} payment(s) awaiting confirmation.
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={7}>
                  <Card>
                    <CardContent>
                      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
                        Transactions
                      </Typography>
                      {transactions.length === 0 ? (
                        <EmptyState title="No transactions yet" description="Top-ups, charges and adjustments appear here." />
                      ) : (
                        <>
                          <Table size="small" aria-label="Wallet transactions">
                            <TableHead>
                              <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell align="right">Amount</TableCell>
                                <TableCell align="right">Balance</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {transactions.map(t => (
                                <TableRow key={t.id}>
                                  <TableCell>{new Date(t.createdAt).toLocaleString()}</TableCell>
                                  <TableCell>{t.type.replace(/_/g, ' ')}</TableCell>
                                  <TableCell align="right" sx={{ color: t.walletDeltaMinor < 0 ? 'error.main' : 'success.main' }}>
                                    {t.walletDeltaMinor > 0 ? '+' : ''}
                                    {formatMinor(t.walletDeltaMinor, t.currency)}
                                  </TableCell>
                                  <TableCell align="right">{formatMinor(t.balanceAfterMinor, t.currency)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {nextCursor && (
                            <Button onClick={loadMore} disabled={moreBusy} sx={{ mt: 1 }}>
                              {moreBusy ? 'Loading…' : 'Load more'}
                            </Button>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </>
            ) : (
              <Grid item xs={12}>
                <Alert severity="info">Wallet details are visible to workspace owners and admins.</Alert>
              </Grid>
            )}
          </Grid>
        )
      )}

      <Dialog open={confirmCancel} onClose={() => setConfirmCancel(false)}>
        <DialogTitle>Cancel subscription?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Messaging will stop when your current access ends. This cannot be undone from this screen.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCancel(false)}>Keep subscription</Button>
          <Button color="error" onClick={cancelSubscription} disabled={cancelBusy}>
            Cancel subscription
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
