import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  TableContainer,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { LedgerEntryDto, PaymentDto, WalletDto } from '@whatsapp-saas/contracts';
import { useOptionalAuth } from '../../auth/AuthContext.js';
import { api, ApiClientError } from '../../../lib/api.js';
import { formatMinor, parseToMinor } from '../../billing/money.js';
import { EmptyState } from '../../../components/common/EmptyState.js';

interface TransactionsPage {
  items: LedgerEntryDto[];
  nextCursor: string | null;
}

function errorText(err: unknown): string {
  return err instanceof ApiClientError || err instanceof Error ? err.message : 'Something went wrong.';
}

const PRESET_AMOUNTS = ['25', '50', '100', '250'];

export const BillingWalletSettingsTab: React.FC = () => {
  const auth = useOptionalAuth();
  const workspace = auth?.currentWorkspace;
  const role = workspace?.role;
  const canSeeWallet = role === 'owner' || role === 'admin';
  const base = workspace ? `/workspaces/${workspace.id}/billing` : null;

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

  const submitting = useRef(false);

  const load = useCallback(async () => {
    if (!base) return;
    setLoading(true);
    setError(null);
    try {
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

  if (!workspace) {
    return <Alert severity="info">Select a workspace to view billing & wallet.</Alert>;
  }

  if (!canSeeWallet) {
    return (
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        Wallet details are visible to workspace owners and admins.
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Alert Notices */}
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

      {loading && !wallet ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }} role="status" aria-label="Loading wallet">
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Prepaid Wallet Card */}
          <Grid item xs={12} lg={5}>
            <Card sx={{ height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <AccountBalanceWalletIcon color="primary" />
                  <Typography variant="h5" fontWeight={700}>
                    Prepaid Balance
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Prepaid funds consumed per broadcast message and conversation window.
                </Typography>

                {wallet && (
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2.5,
                      backgroundColor: theme =>
                        theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                      border: '1px solid',
                      borderColor: 'divider',
                      mb: 3,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
                      Available Balance
                    </Typography>
                    <Typography
                      variant="h3"
                      fontWeight={800}
                      sx={{ my: 0.5, color: wallet.lowBalance ? 'warning.main' : 'text.primary' }}
                      data-testid="available-balance"
                    >
                      {formatMinor(wallet.availableMinor, wallet.currency)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Available · Reserved {formatMinor(wallet.reservedMinor, wallet.currency)} · Posted{' '}
                      {formatMinor(wallet.postedMinor, wallet.currency)}
                    </Typography>

                    {wallet.lowBalance && (
                      <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                        Low balance. Add funds to keep campaigns running.
                      </Alert>
                    )}
                  </Box>
                )}

                {/* Add Funds Form */}
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  Add Funds to Wallet
                </Typography>

                {/* Preset Chips */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {PRESET_AMOUNTS.map(preset => (
                    <Chip
                      key={preset}
                      label={`+${currency} ${preset}`}
                      clickable
                      onClick={() => setAmount(preset)}
                      color={amount === preset ? 'primary' : 'default'}
                      variant={amount === preset ? 'filled' : 'outlined'}
                      sx={{ fontWeight: 600 }}
                    />
                  ))}
                </Box>

                <Box component="form" onSubmit={submitTopUp} noValidate>
                  <TextField
                    id="input-top-up-amount"
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
                    id="btn-add-funds"
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    startIcon={topUpBusy ? <CircularProgress size={18} color="inherit" /> : <AddCircleOutlineIcon />}
                    disabled={parsedAmount === null || topUpBusy || providerMissing}
                    sx={{ mt: 1, py: 1, fontWeight: 700, borderRadius: 2 }}
                  >
                    {topUpBusy ? 'Creating…' : 'Add funds'}
                  </Button>

                  {providerMissing && (
                    <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                      Online top-ups are not enabled yet because no payment provider is configured.
                    </Alert>
                  )}

                  {topUpError && !providerMissing && (
                    <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
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

          {/* Transaction Ledger Card */}
          <Grid item xs={12} lg={7}>
            <Card sx={{ height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <ReceiptLongIcon color="primary" />
                  <Typography variant="h5" fontWeight={700}>
                    Transaction History
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                  Real-time ledger entries for top-ups, campaign dispatches, and balance adjustments.
                </Typography>

                {transactions.length === 0 ? (
                  <EmptyState
                    title="No transactions yet"
                    description="Top-ups, charges and adjustments appear here."
                  />
                ) : (
                  <>
                    <TableContainer sx={{ maxHeight: 420 }}>
                      <Table size="small" aria-label="Wallet transactions">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              Amount
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              Balance After
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {transactions.map(t => (
                            <TableRow key={t.id} hover>
                              <TableCell>
                                <Typography variant="body2">
                                  {new Date(t.createdAt).toLocaleDateString()}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={t.type.replace(/_/g, ' ').toUpperCase()}
                                  size="small"
                                  color={t.walletDeltaMinor >= 0 ? 'success' : 'default'}
                                  variant="outlined"
                                  sx={{ fontWeight: 600, fontSize: '0.6875rem' }}
                                />
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  fontWeight: 700,
                                  color: t.walletDeltaMinor < 0 ? 'error.main' : 'success.main',
                                }}
                              >
                                {t.walletDeltaMinor > 0 ? '+' : ''}
                                {formatMinor(t.walletDeltaMinor, t.currency)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>
                                {formatMinor(t.balanceAfterMinor, t.currency)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {nextCursor && (
                      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Button
                          onClick={loadMore}
                          disabled={moreBusy}
                          variant="outlined"
                          size="small"
                          sx={{ borderRadius: 2, fontWeight: 600 }}
                        >
                          {moreBusy ? 'Loading…' : 'Load more transactions'}
                        </Button>
                      </Box>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};
