import React, { useState, useEffect, useCallback } from 'react';
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
  Grid,
  Paper,
  MenuItem,
  LinearProgress,
  InputAdornment,
} from '@mui/material';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CancelIcon from '@mui/icons-material/Cancel';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SendIcon from '@mui/icons-material/Send';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { PageHeader } from '../../../components/common/PageHeader.js';
import { EmptyState } from '../../../components/common/EmptyState.js';
import { useOptionalAuth } from '../../auth/AuthContext.js';
import { api, ApiClientError } from '../../../lib/api.js';
import {
  CampaignDto,
  TemplateDto,
  WhatsAppAccountDto,
} from '@whatsapp-saas/contracts';
import { CampaignStatus } from '@whatsapp-saas/domain';

interface CampaignListResponse {
  items: CampaignDto[];
  total: number;
  page: number;
  limit: number;
}

export const CampaignsPage: React.FC = () => {
  const auth = useOptionalAuth();
  const currentWorkspace = auth?.currentWorkspace;

  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Create Dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formAccountId, setFormAccountId] = useState('');
  const [formTemplateId, setFormTemplateId] = useState('');
  const [formTagFilter, setFormTagFilter] = useState('');
  const [formScheduledAt, setFormScheduledAt] = useState('');

  // Dropdown data
  const [accounts, setAccounts] = useState<WhatsAppAccountDto[]>([]);
  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  const [dropdownsLoading, setDropdownsLoading] = useState(false);

  // Action loading (dispatching, cancelling)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<CampaignListResponse>(
        `/workspaces/${currentWorkspace.id}/campaigns?limit=100`
      );
      setCampaigns(res.items || []);
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load campaigns';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const loadDropdowns = async () => {
    if (!currentWorkspace?.id) return;
    setDropdownsLoading(true);
    try {
      const [accRes, tplRes] = await Promise.all([
        api.get<WhatsAppAccountDto[]>(`/workspaces/${currentWorkspace.id}/whatsapp-accounts`),
        api.get<{ items: TemplateDto[] }>(`/workspaces/${currentWorkspace.id}/templates?status=APPROVED`),
      ]);
      setAccounts(accRes || []);
      setTemplates(tplRes.items || []);

      if (accRes && accRes.length > 0 && !formAccountId) {
        setFormAccountId(accRes[0].id);
      }
      if (tplRes.items && tplRes.items.length > 0 && !formTemplateId) {
        setFormTemplateId(tplRes.items[0].id);
      }
    } catch {
      // Ignored
    } finally {
      setDropdownsLoading(false);
    }
  };

  const handleCreateOpen = () => {
    setFormName('');
    setFormTagFilter('');
    setFormScheduledAt('');
    setDialogError(null);
    setCreateOpen(true);
    loadDropdowns();
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id) return;

    if (!formName.trim() || !formAccountId || !formTemplateId) {
      setDialogError('Campaign name, WhatsApp account, and template are required.');
      return;
    }

    setSubmitting(true);
    setDialogError(null);

    const tagFilter = formTagFilter
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      await api.post(`/workspaces/${currentWorkspace.id}/campaigns`, {
        name: formName.trim(),
        whatsAppAccountId: formAccountId,
        templateId: formTemplateId,
        tagFilter: tagFilter.length > 0 ? tagFilter : undefined,
        scheduledAt: formScheduledAt ? new Date(formScheduledAt).toISOString() : undefined,
      });

      setSuccess(`Campaign "${formName}" created successfully.`);
      setCreateOpen(false);
      await loadCampaigns();
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to create campaign';
      setDialogError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatch = async (campaignId: string) => {
    if (!currentWorkspace?.id) return;
    setActionLoadingId(campaignId);
    setError(null);
    try {
      await api.post(`/workspaces/${currentWorkspace.id}/campaigns/${campaignId}/dispatch`, {});
      setSuccess('Campaign dispatch initiated.');
      await loadCampaigns();
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to dispatch campaign';
      setError(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (campaignId: string) => {
    if (!currentWorkspace?.id) return;
    setActionLoadingId(campaignId);
    setError(null);
    try {
      await api.post(`/workspaces/${currentWorkspace.id}/campaigns/${campaignId}/cancel`, {});
      setSuccess('Campaign cancelled.');
      await loadCampaigns();
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to cancel campaign';
      setError(msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Metrics calculation
  const totalCampaigns = campaigns.length;
  const totalRecipients = campaigns.reduce((acc, c) => acc + (c.recipientCount || 0), 0);
  const totalSent = campaigns.reduce((acc, c) => acc + (c.sentCount || 0), 0);
  const totalDelivered = campaigns.reduce((acc, c) => acc + (c.deliveredCount || 0), 0);
  const totalRead = campaigns.reduce((acc, c) => acc + (c.readCount || 0), 0);
  const totalFailed = campaigns.reduce((acc, c) => acc + (c.failedCount || 0), 0);

  // Filtered campaigns
  const filteredCampaigns = campaigns.filter((c) => {
    if (searchQuery.trim()) {
      const match = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!match) return false;
    }
    if (selectedStatus !== 'ALL' && c.status !== selectedStatus) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case CampaignStatus.COMPLETED:
        return (
          <Chip
            size="small"
            icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
            label="COMPLETED"
            color="success"
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          />
        );
      case CampaignStatus.RUNNING:
        return (
          <Chip
            size="small"
            icon={<CircularProgress size={12} color="inherit" />}
            label="RUNNING"
            color="primary"
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          />
        );
      case CampaignStatus.SCHEDULED:
        return (
          <Chip
            size="small"
            icon={<ScheduleIcon sx={{ fontSize: '14px !important' }} />}
            label="SCHEDULED"
            color="info"
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          />
        );
      case CampaignStatus.CANCELLED:
        return (
          <Chip
            size="small"
            icon={<CancelIcon sx={{ fontSize: '14px !important' }} />}
            label="CANCELLED"
            color="error"
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          />
        );
      default:
        return <Chip size="small" label={status.toUpperCase()} sx={{ fontWeight: 600, fontSize: '0.75rem' }} />;
    }
  };

  return (
    <Box id="campaigns-page-container" sx={{ pb: 6 }}>
      <PageHeader
        title="Broadcast Campaigns"
        subtitle="Schedule and orchestrate bulk WhatsApp notifications with queue telemetry"
        action={
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleCreateOpen}>
            New Campaign
          </Button>
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

      {/* Aggregate Metric Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Campaigns', value: totalCampaigns, icon: <CampaignOutlinedIcon color="primary" /> },
          { label: 'Total Audience', value: totalRecipients, icon: <SendIcon color="action" /> },
          { label: 'Sent', value: totalSent, icon: <DoneAllIcon color="info" /> },
          { label: 'Delivered', value: totalDelivered, icon: <DoneAllIcon color="primary" /> },
          { label: 'Read', value: totalRead, icon: <MarkEmailReadIcon color="success" /> },
          { label: 'Failed / Revoked', value: totalFailed, icon: <ErrorOutlineIcon color="error" /> },
        ].map((m, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {m.label}
                  </Typography>
                  {m.icon}
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {m.value.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filter and Search Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }} elevation={0} variant="outlined">
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={7}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1, fontWeight: 500 }}>
                Status:
              </Typography>
              {['ALL', 'DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED'].map((st) => (
                <Chip
                  key={st}
                  label={st}
                  size="small"
                  clickable
                  color={selectedStatus === st ? 'primary' : 'default'}
                  onClick={() => setSelectedStatus(st)}
                  variant={selectedStatus === st ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Campaigns List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredCampaigns.length === 0 ? (
        <EmptyState
          title="No Active Broadcasts"
          description={
            campaigns.length === 0
              ? 'Launch your first broadcast campaign to send approved WhatsApp templates to opted-in audiences.'
              : 'No campaigns match your search and filter criteria.'
          }
          icon={<CampaignOutlinedIcon sx={{ fontSize: 40, color: 'primary.main' }} />}
          actionLabel={campaigns.length === 0 ? 'Create First Campaign' : undefined}
          onAction={campaigns.length === 0 ? handleCreateOpen : undefined}
        />
      ) : (
        <Grid container spacing={3}>
          {filteredCampaigns.map((camp) => {
            const progress =
              camp.recipientCount > 0
                ? Math.min(100, Math.round(((camp.sentCount + camp.failedCount) / camp.recipientCount) * 100))
                : 0;

            const isActionLoading = actionLoadingId === camp.id;

            return (
              <Grid item xs={12} md={6} key={camp.id}>
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      boxShadow: 2,
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.05rem' }}>
                          {camp.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Created {new Date(camp.createdAt).toLocaleDateString()}
                          {camp.scheduledAt && ` • Scheduled for ${new Date(camp.scheduledAt).toLocaleString()}`}
                        </Typography>
                      </Box>
                      {getStatusBadge(camp.status)}
                    </Box>

                    {/* Progress Bar */}
                    <Box sx={{ my: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Dispatch Progress ({camp.sentCount + camp.failedCount} / {camp.recipientCount} recipients)
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {progress}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{ height: 8, borderRadius: 4 }}
                        color={camp.status === CampaignStatus.COMPLETED ? 'success' : 'primary'}
                      />
                    </Box>

                    {/* Metrics Breakdown Grid */}
                    <Grid container spacing={1} sx={{ mt: 1, p: 1.5, backgroundColor: 'background.default', borderRadius: 2 }}>
                      <Grid item xs={3}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Sent
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {camp.sentCount}
                        </Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Delivered
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'info.main' }}>
                          {camp.deliveredCount}
                        </Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Read
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                          {camp.readCount}
                        </Typography>
                      </Grid>
                      <Grid item xs={3}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Failed
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>
                          {camp.failedCount}
                        </Typography>
                      </Grid>
                    </Grid>

                    {/* Action Controls */}
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      {(camp.status === CampaignStatus.DRAFT || camp.status === CampaignStatus.SCHEDULED) && (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={isActionLoading ? <CircularProgress size={14} /> : <PlayArrowIcon />}
                          disabled={isActionLoading}
                          onClick={() => handleDispatch(camp.id)}
                        >
                          Dispatch Now
                        </Button>
                      )}

                      {camp.status !== CampaignStatus.COMPLETED && camp.status !== CampaignStatus.CANCELLED && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={isActionLoading ? <CircularProgress size={14} /> : <CancelIcon />}
                          disabled={isActionLoading}
                          onClick={() => handleCancel(camp.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={createOpen} onClose={() => !submitting && setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Create Broadcast Campaign</DialogTitle>
        <DialogContent dividers>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {dialogError}
            </Alert>
          )}

          {dropdownsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                label="Campaign Name"
                size="small"
                required
                fullWidth
                placeholder="e.g. October Product Launch"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />

              <TextField
                select
                label="WhatsApp Business Account"
                size="small"
                required
                fullWidth
                value={formAccountId}
                onChange={(e) => setFormAccountId(e.target.value)}
                helperText="Connected WhatsApp number to dispatch broadcast"
              >
                {accounts.map((acc) => (
                  <MenuItem key={acc.id} value={acc.id}>
                    {acc.displayName} ({acc.displayPhoneNumber})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Message Template (Approved Only)"
                size="small"
                required
                fullWidth
                value={formTemplateId}
                onChange={(e) => setFormTemplateId(e.target.value)}
                helperText="Only APPROVED Meta templates can be broadcast"
              >
                {templates.map((tpl) => (
                  <MenuItem key={tpl.id} value={tpl.id}>
                    {tpl.name} ({tpl.language} • {tpl.category})
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Audience Tag Filter (Optional)"
                size="small"
                fullWidth
                placeholder="e.g. vip, customers, leads"
                value={formTagFilter}
                onChange={(e) => setFormTagFilter(e.target.value)}
                helperText="Comma-separated tags to segment your contacts"
              />

              <TextField
                label="Schedule For Later (Optional)"
                type="datetime-local"
                size="small"
                fullWidth
                value={formScheduledAt}
                onChange={(e) => setFormScheduledAt(e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Leave empty to dispatch immediately"
              />

              <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                <strong>Consent Enforcement:</strong> Messages are strictly dispatched to contacts with confirmed
                opt-in consent (<code>opted_in</code>). Contacts marked as opted-out or suppressed are automatically
                excluded.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateSubmit}
            disabled={submitting || !formName || !formAccountId || !formTemplateId}
            startIcon={submitting ? <CircularProgress size={18} /> : undefined}
          >
            {submitting ? 'Creating...' : formScheduledAt ? 'Schedule Campaign' : 'Launch Campaign'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
