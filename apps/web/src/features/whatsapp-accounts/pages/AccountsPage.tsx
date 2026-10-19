import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  IconButton,
  Grid,
  Tooltip,
  Paper,
  InputAdornment,
  Divider,
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SecurityIcon from '@mui/icons-material/Security';
import { PageHeader } from '../../../components/common/PageHeader.js';
import { EmptyState } from '../../../components/common/EmptyState.js';
import { useOptionalAuth } from '../../auth/AuthContext.js';
import { api, ApiClientError } from '../../../lib/api.js';
import { WhatsAppAccountDto, SyncWhatsAppAccountResponse } from '@whatsapp-saas/contracts';
import { useMetaEmbeddedSignup } from '../hooks/useMetaEmbeddedSignup.js';
import RefreshIcon from '@mui/icons-material/Refresh';
import BusinessIcon from '@mui/icons-material/Business';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import { BusinessProfileDialog } from '../components/BusinessProfileDialog.js';
import { ConnectionHealthDialog } from '../components/ConnectionHealthDialog.js';

export const AccountsPage: React.FC = () => {
  const auth = useOptionalAuth();
  const currentWorkspace = auth?.currentWorkspace;

  const [accounts, setAccounts] = useState<WhatsAppAccountDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Meta WhatsApp Embedded Signup v4 Hook
  const {
    status: signupStatus,
    errorMessage: signupError,
    connectingStep,
    launchEmbeddedSignup,
    resetStatus,
  } = useMetaEmbeddedSignup({
    workspaceId: currentWorkspace?.id,
    onSuccess: (newAccount) => {
      setSuccess(
        `WhatsApp Business Account connected successfully via Meta Embedded Signup! (${newAccount.displayName || newAccount.displayPhoneNumber})`
      );
      fetchAccounts();
    },
    onError: (err) => {
      setError(err);
    },
  });

  // Connect Dialog State
  const [connectOpen, setConnectOpen] = useState(false);
  const [wabaId, setWabaId] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Disconnect & Delete confirmation
  const [disconnectTarget, setDisconnectTarget] = useState<WhatsAppAccountDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WhatsAppAccountDto | null>(null);
  const [profileTarget, setProfileTarget] = useState<WhatsAppAccountDto | null>(null);
  const [healthTarget, setHealthTarget] = useState<WhatsAppAccountDto | null>(null);

  const fetchAccounts = async () => {
    if (!currentWorkspace?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<WhatsAppAccountDto[]>(
        `/workspaces/${currentWorkspace.id}/whatsapp-accounts`
      );
      setAccounts(data);
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load WhatsApp accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [currentWorkspace?.id]);

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id) return;
    if (!wabaId.trim() || !phoneNumberId.trim() || !accessToken.trim()) {
      setFormError('WABA ID, Phone Number ID, and System User Access Token are required');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      await api.post<WhatsAppAccountDto>(
        `/workspaces/${currentWorkspace.id}/whatsapp-accounts`,
        {
          wabaId: wabaId.trim(),
          phoneNumberId: phoneNumberId.trim(),
          accessToken: accessToken.trim(),
          displayName: displayName.trim() || undefined,
          displayPhoneNumber: displayPhoneNumber.trim() || undefined,
        }
      );

      setConnectOpen(false);
      setWabaId('');
      setPhoneNumberId('');
      setAccessToken('');
      setDisplayName('');
      setDisplayPhoneNumber('');
      setSuccess('WhatsApp Business Account connected successfully! Credentials encrypted at rest.');
      fetchAccounts();
    } catch (err: unknown) {
      setFormError(err instanceof ApiClientError ? err.message : 'Failed to connect WhatsApp account');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleSync = async (accountId: string) => {
    if (!currentWorkspace?.id) return;
    setActionLoading(`sync-${accountId}`);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post<SyncWhatsAppAccountResponse>(
        `/workspaces/${currentWorkspace.id}/whatsapp-accounts/${accountId}/sync`
      );
      setSuccess(`Account synchronized successfully! Quality rating: ${res.account.qualityRating}`);
      fetchAccounts();
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to sync WhatsApp account');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async () => {
    if (!currentWorkspace?.id || !disconnectTarget) return;
    setActionLoading(`disconnect-${disconnectTarget.id}`);
    setError(null);
    try {
      await api.post<WhatsAppAccountDto>(
        `/workspaces/${currentWorkspace.id}/whatsapp-accounts/${disconnectTarget.id}/disconnect`
      );
      setSuccess(`Account disconnected safely.`);
      setDisconnectTarget(null);
      fetchAccounts();
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to disconnect account');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!currentWorkspace?.id || !deleteTarget) return;
    setActionLoading(`delete-${deleteTarget.id}`);
    setError(null);
    try {
      await api.delete(
        `/workspaces/${currentWorkspace.id}/whatsapp-accounts/${deleteTarget.id}`
      );
      setSuccess('WhatsApp Account deleted permanently.');
      setDeleteTarget(null);
      fetchAccounts();
    } catch (err: unknown) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to delete account');
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setSuccess(`${label} copied to clipboard!`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'GREEN':
        return { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' };
      case 'YELLOW':
        return { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' };
      case 'RED':
        return { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return { bg: '#CCFBF1', color: '#0F766E' };
      case 'disconnected':
        return { bg: '#F1F5F9', color: '#475569' };
      case 'degraded':
        return { bg: '#FEF3C7', color: '#B45309' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280' };
    }
  };

  return (
    <Box id="accounts-page-container" sx={{ pb: 6 }}>
      <PageHeader
        title="WhatsApp Business Accounts"
        subtitle="Manage official Meta Cloud API phone numbers, encrypted WABA credentials, and real-time quality ratings"
        action={
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Button
              variant="contained"
              startIcon={
                signupStatus === 'CONNECTING' ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <WhatsAppIcon />
                )
              }
              onClick={launchEmbeddedSignup}
              disabled={signupStatus === 'CONNECTING'}
              sx={{
                fontWeight: 600,
                bgcolor: '#128C7E',
                '&:hover': { bgcolor: '#075E54' },
                color: '#fff',
                px: 2.5,
              }}
            >
              {signupStatus === 'CONNECTING' ? 'Connecting...' : 'Connect WhatsApp'}
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<AddIcon />}
              onClick={() => setConnectOpen(true)}
              sx={{ fontWeight: 500 }}
            >
              Manual Setup
            </Button>
          </Box>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Embedded Signup Progress & State Alerts */}
      {signupStatus === 'CONNECTING' && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 2,
            border: '1px solid',
            borderColor: '#128C7E',
            bgcolor: 'rgba(18, 140, 126, 0.05)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={28} sx={{ color: '#128C7E' }} />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Connecting to Meta WhatsApp Business Platform...
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {connectingStep || 'Please complete authorization in the Meta login popup window.'}
                </Typography>
              </Box>
            </Box>
            <Button variant="outlined" size="small" onClick={resetStatus} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
          </Box>
        </Paper>
      )}

      {signupStatus === 'FAILED' && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button color="inherit" size="small" onClick={launchEmbeddedSignup}>
                Retry Signup
              </Button>
              <Button color="inherit" size="small" onClick={() => setConnectOpen(true)}>
                Manual Setup
              </Button>
            </Box>
          }
          onClose={resetStatus}
        >
          <strong>Signup Failed:</strong> {signupError || 'An error occurred during Meta Embedded Signup.'}
        </Alert>
      )}

      {/* Meta Prerequisites Guide Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 4,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'primary.light',
          bgcolor: 'rgba(20, 184, 166, 0.04)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <InfoOutlinedIcon sx={{ color: 'primary.main', mt: 0.5 }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Official Meta Cloud API Setup Instructions
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, lineHeight: 1.6 }}>
              Connect your official Meta WhatsApp Business Platform account. Ensure your Meta System User token contains both{' '}
              <strong>whatsapp_business_messaging</strong> and <strong>whatsapp_business_management</strong> permissions.
              Tokens are securely encrypted with <strong>AES-256-GCM</strong> and never exposed to the browser.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Loading Indicator */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : accounts.length === 0 ? (
        <EmptyState
          title="No WhatsApp Accounts Connected"
          description="Connect your verified WhatsApp Business Account (WABA) to start synchronizing phone numbers, templates, and receiving webhook status updates."
          icon={<WhatsAppIcon sx={{ fontSize: 40, color: '#14B8A6' }} />}
          actionLabel="Connect WhatsApp Business Account"
          onAction={() => setConnectOpen(true)}
        />
      ) : (
        <Grid container spacing={3}>
          {accounts.map(acc => {
            const qualityStyles = getQualityColor(acc.qualityRating);
            const statusStyles = getStatusColor(acc.status);

            return (
              <Grid item xs={12} md={6} key={acc.id}>
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    borderColor: acc.status === 'connected' ? 'primary.light' : 'divider',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            bgcolor: 'rgba(20, 184, 166, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <WhatsAppIcon sx={{ color: '#14B8A6', fontSize: 26 }} />
                        </Box>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                            {acc.displayName || 'WhatsApp Account'}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                            {acc.displayPhoneNumber}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                          label={acc.status.toUpperCase()}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            bgcolor: statusStyles.bg,
                            color: statusStyles.color,
                          }}
                        />
                        <Chip
                          label={`Rating: ${acc.qualityRating}`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            bgcolor: qualityStyles.bg,
                            color: qualityStyles.color,
                            border: `1px solid ${qualityStyles.border}`,
                          }}
                        />
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Metadata attributes */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          PHONE NUMBER ID
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {acc.phoneNumberId}
                          </Typography>
                          <Tooltip title="Copy Phone Number ID">
                            <IconButton
                              size="small"
                              onClick={() => copyToClipboard(acc.phoneNumberId, 'Phone Number ID')}
                            >
                              <ContentCopyIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          WABA ID
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                            {acc.wabaId}
                          </Typography>
                          <Tooltip title="Copy WABA ID">
                            <IconButton
                              size="small"
                              onClick={() => copyToClipboard(acc.wabaId, 'WABA ID')}
                            >
                              <ContentCopyIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          LAST SYNCHRONIZED
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {acc.lastSyncedAt ? new Date(acc.lastSyncedAt).toLocaleString() : 'Never synced'}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Action Buttons */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1 }}>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="primary"
                          startIcon={
                            actionLoading === `sync-${acc.id}` ? (
                              <CircularProgress size={16} />
                            ) : (
                              <SyncIcon />
                            )
                          }
                          disabled={actionLoading !== null}
                          onClick={() => handleSync(acc.id)}
                        >
                          Sync Status
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="inherit"
                          startIcon={<BusinessIcon />}
                          onClick={() => setProfileTarget(acc)}
                          disabled={actionLoading !== null || acc.status !== 'connected'}
                        >
                          Profile
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="secondary"
                          startIcon={<HealthAndSafetyIcon />}
                          onClick={() => setHealthTarget(acc)}
                          disabled={actionLoading !== null}
                        >
                          Health
                        </Button>
                      </Box>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                        {acc.status !== 'connected' && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            startIcon={<RefreshIcon />}
                            onClick={launchEmbeddedSignup}
                            disabled={signupStatus === 'CONNECTING'}
                          >
                            Reconnect
                          </Button>
                        )}
                        {acc.status === 'connected' && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            startIcon={<LinkOffIcon />}
                            onClick={() => setDisconnectTarget(acc)}
                            disabled={actionLoading !== null}
                          >
                            Disconnect
                          </Button>
                        )}
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteTarget(acc)}
                          disabled={actionLoading !== null}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Connect WhatsApp Account Dialog */}
      <Dialog
        open={connectOpen}
        onClose={() => !formSubmitting && setConnectOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <form onSubmit={handleConnectSubmit}>
          <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>
            Connect WhatsApp Account (Interim / Admin-Assisted)
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Administrator-Assisted Connection:</strong> Direct System User token entry is an interim onboarding method for administrators and staging testing. Production self-service tenant onboarding requires Meta Embedded Signup.
            </Alert>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              Enter your Meta Cloud API account credentials. We securely verify and register your phone number for this workspace.
            </Typography>

            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
              <TextField
                label="WhatsApp Business Account ID (WABA ID)"
                placeholder="e.g. 102938475612345"
                fullWidth
                required
                value={wabaId}
                onChange={e => setWabaId(e.target.value)}
                disabled={formSubmitting}
                helperText="Found in Meta Business Manager under WhatsApp Accounts"
              />

              <TextField
                label="Phone Number ID"
                placeholder="e.g. 987654321098765"
                fullWidth
                required
                value={phoneNumberId}
                onChange={e => setPhoneNumberId(e.target.value)}
                disabled={formSubmitting}
                helperText="Found in Meta App Dashboard > WhatsApp > API Setup"
              />

              <TextField
                label="System User Access Token"
                type={showToken ? 'text' : 'password'}
                placeholder="EAAG..."
                fullWidth
                required
                value={accessToken}
                onChange={e => setAccessToken(e.target.value)}
                disabled={formSubmitting}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowToken(!showToken)}
                        edge="end"
                      >
                        {showToken ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                helperText="Never shared with the client. Encrypted server-side using AES-256-GCM."
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Display Name (Optional)"
                  placeholder="e.g. Customer Support"
                  fullWidth
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  disabled={formSubmitting}
                />
                <TextField
                  label="Display Phone Number (Optional)"
                  placeholder="e.g. +1 555-0199"
                  fullWidth
                  value={displayPhoneNumber}
                  onChange={e => setDisplayPhoneNumber(e.target.value)}
                  disabled={formSubmitting}
                />
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'rgba(20, 184, 166, 0.08)',
                  border: '1px solid rgba(20, 184, 166, 0.2)',
                }}
              >
                <SecurityIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  <strong>Zero-Leakage Security:</strong> Tokens are encrypted at rest with AES-256-GCM and never logged or serialized in client responses.
                </Typography>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1 }}>
            <Button onClick={() => setConnectOpen(false)} disabled={formSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={formSubmitting}
              startIcon={formSubmitting ? <CircularProgress size={16} /> : <CheckCircleIcon />}
            >
              {formSubmitting ? 'Verifying...' : 'Connect Account'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Disconnect Confirmation Dialog */}
      <Dialog
        open={disconnectTarget !== null}
        onClose={() => setDisconnectTarget(null)}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Disconnect WhatsApp Account?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Are you sure you want to disconnect{' '}
            <strong>{disconnectTarget?.displayName || disconnectTarget?.displayPhoneNumber}</strong>? Outgoing message dispatches will be paused until reconnected.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDisconnectTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleDisconnect}
            disabled={actionLoading !== null}
          >
            Disconnect Account
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>
          Delete WhatsApp Account Registration?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            This will permanently remove the credentials and account registration for{' '}
            <strong>{deleteTarget?.displayName || deleteTarget?.displayPhoneNumber}</strong> from this workspace.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={actionLoading !== null}
          >
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>
      {/* Business Profile Dialog */}
      <BusinessProfileDialog
        open={profileTarget !== null}
        onClose={() => setProfileTarget(null)}
        account={profileTarget}
        workspaceId={currentWorkspace?.id}
        onSuccess={fetchAccounts}
      />
      {/* Connection Health & Security Audit Dialog */}
      <ConnectionHealthDialog
        open={healthTarget !== null}
        onClose={() => setHealthTarget(null)}
        account={healthTarget}
        workspaceId={currentWorkspace?.id}
        onReconnect={launchEmbeddedSignup}
      />
    </Box>
  );
};
