import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RefreshIcon from '@mui/icons-material/Refresh';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import LockIcon from '@mui/icons-material/Lock';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { api, ApiClientError } from '../../../lib/api.js';
import { WhatsAppAccountDto, WhatsAppAccountHealthDto } from '@whatsapp-saas/contracts';

export interface ConnectionHealthDialogProps {
  open: boolean;
  onClose: () => void;
  account: WhatsAppAccountDto | null;
  workspaceId?: string;
  onReconnect?: () => void;
}

export const ConnectionHealthDialog: React.FC<ConnectionHealthDialogProps> = ({
  open,
  onClose,
  account,
  workspaceId,
  onReconnect,
}) => {
  const [health, setHealth] = useState<WhatsAppAccountHealthDto | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    if (!account || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<WhatsAppAccountHealthDto>(
        `/workspaces/${workspaceId}/whatsapp-accounts/${account.id}/health`
      );
      setHealth(data);
    } catch (err: unknown) {
      setError(
        err instanceof ApiClientError ? err.message : 'Failed to retrieve connection health metrics'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && account) {
      fetchHealth();
    } else {
      setHealth(null);
      setError(null);
    }
  }, [open, account?.id]);

  const isHealthy =
    health &&
    health.status === 'connected' &&
    health.tokenValid &&
    health.permissionsValid &&
    health.wabaSubscribed &&
    health.phoneRegistered;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1, fontWeight: 700 }}>
        <HealthAndSafetyIcon sx={{ color: 'primary.main', fontSize: 28 }} />
        WhatsApp Connection Health & Security Audit
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Real-time verification of Meta Cloud API token validity, permission scopes, WABA webhook subscription, and phone number registration for{' '}
          <strong>{account?.displayName || account?.displayPhoneNumber}</strong>.
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, gap: 2 }}>
            <CircularProgress color="primary" />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Querying Meta Graph API and verifying integration dimensions...
            </Typography>
          </Box>
        ) : error ? (
          <Alert
            severity="error"
            sx={{ my: 2 }}
            action={
              <Button color="inherit" size="small" onClick={fetchHealth}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : health ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Overall Health Status Banner */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: isHealthy ? 'success.light' : 'warning.light',
                bgcolor: isHealthy ? 'rgba(16, 185, 129, 0.05)' : 'rgba(245, 158, 11, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {isHealthy ? (
                  <CheckCircleIcon sx={{ color: 'success.main', fontSize: 28 }} />
                ) : (
                  <WarningAmberIcon sx={{ color: 'warning.main', fontSize: 28 }} />
                )}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {isHealthy ? 'Connection Fully Verified & Healthy' : 'Action Required / Degraded'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Checked {new Date(health.lastCheckedAt).toLocaleTimeString()}
                  </Typography>
                </Box>
              </Box>
              <Chip
                label={health.status.toUpperCase()}
                size="small"
                color={isHealthy ? 'success' : 'warning'}
                sx={{ fontWeight: 700 }}
              />
            </Paper>

            {/* Checklist of 5 Health Dimensions */}
            <List dense sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 1 }}>
              {/* 1. Meta Access Token */}
              <ListItem>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {health.tokenValid ? (
                    <CheckCircleIcon color="success" fontSize="small" />
                  ) : (
                    <ErrorOutlineIcon color="error" fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LockIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Meta Access Token Validity
                      </Typography>
                    </Box>
                  }
                  secondary={
                    health.tokenValid
                      ? 'Encrypted with AES-256-GCM. Verified active on Meta Graph API.'
                      : 'Token is invalid, expired, or has been revoked by Meta.'
                  }
                />
              </ListItem>
              <Divider component="li" />

              {/* 2. Graph API Permissions */}
              <ListItem>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {health.permissionsValid ? (
                    <CheckCircleIcon color="success" fontSize="small" />
                  ) : (
                    <ErrorOutlineIcon color="error" fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <VerifiedUserIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Required Permissions (whatsapp_business_messaging & management)
                      </Typography>
                    </Box>
                  }
                  secondary={
                    health.permissionsValid
                      ? 'All required Meta messaging and account permissions are active.'
                      : 'Missing required permissions. Reconnection required.'
                  }
                />
              </ListItem>
              <Divider component="li" />

              {/* 3. WABA Webhook Subscription */}
              <ListItem>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {health.wabaSubscribed ? (
                    <CheckCircleIcon color="success" fontSize="small" />
                  ) : (
                    <WarningAmberIcon color="warning" fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <NotificationsActiveIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        WABA Webhook Subscription
                      </Typography>
                    </Box>
                  }
                  secondary={
                    health.wabaSubscribed
                      ? 'WABA is subscribed to receive message events and status updates.'
                      : 'WABA is not subscribed to Pingza webhook endpoint.'
                  }
                />
              </ListItem>
              <Divider component="li" />

              {/* 4. Phone Registration */}
              <ListItem>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {health.phoneRegistered ? (
                    <CheckCircleIcon color="success" fontSize="small" />
                  ) : (
                    <WarningAmberIcon color="warning" fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PhoneAndroidIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Phone Number Two-Step Registration
                      </Typography>
                    </Box>
                  }
                  secondary={
                    health.phoneRegistered
                      ? 'Registered for Cloud API two-step verification.'
                      : 'Phone number has not completed registration.'
                  }
                />
              </ListItem>
              <Divider component="li" />

              {/* 5. Inbound Webhook Activity */}
              <ListItem>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {health.lastWebhookReceivedAt ? (
                    <CheckCircleIcon color="success" fontSize="small" />
                  ) : (
                    <InfoOutlinedIcon color="action" fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Latest Webhook Activity
                    </Typography>
                  }
                  secondary={
                    health.lastWebhookReceivedAt
                      ? `Last webhook received: ${new Date(health.lastWebhookReceivedAt).toLocaleString()}`
                      : 'No inbound webhooks recorded yet for this phone number.'
                  }
                />
              </ListItem>
            </List>

            {/* Actionable Issues List */}
            {health.issues && health.issues.length > 0 && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Actionable Remediation Required:
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  {health.issues.map((issue, idx) => (
                    <li key={idx}>
                      <Typography variant="caption">{issue}</Typography>
                    </li>
                  ))}
                </Box>
              </Alert>
            )}
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 1, justifyContent: 'space-between' }}>
        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchHealth}
          disabled={loading}
          sx={{ textTransform: 'none' }}
        >
          Re-check Health
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {!isHealthy && onReconnect && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                onClose();
                onReconnect();
              }}
              sx={{ textTransform: 'none' }}
            >
              Reconnect Account
            </Button>
          )}
          <Button onClick={onClose} variant="outlined" color="inherit">
            Close
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
