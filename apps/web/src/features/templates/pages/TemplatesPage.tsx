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
  IconButton,
  Grid,
  Tooltip,
  Paper,
  MenuItem,
  InputAdornment,
  Divider,
} from '@mui/material';
import MarkChatReadOutlinedIcon from '@mui/icons-material/MarkChatReadOutlined';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import { PageHeader } from '../../../components/common/PageHeader.js';
import { EmptyState } from '../../../components/common/EmptyState.js';
import { useOptionalAuth } from '../../auth/AuthContext.js';
import { api, ApiClientError } from '../../../lib/api.js';
import {
  TemplateDto,
  CreateTemplateRequest,
} from '@whatsapp-saas/contracts';
import {
  TemplateCategory,
  TemplateStatus,
} from '@whatsapp-saas/domain';

interface TemplateListResponse {
  items: TemplateDto[];
  total: number;
  page: number;
  limit: number;
}

export const TemplatesPage: React.FC = () => {
  const auth = useOptionalAuth();
  const currentWorkspace = auth?.currentWorkspace;

  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Create Dialog State
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<TemplateCategory>(TemplateCategory.MARKETING);
  const [formLanguage, setFormLanguage] = useState('en_US');
  const [formHeaderText, setFormHeaderText] = useState('');
  const [formBodyText, setFormBodyText] = useState('');
  const [formFooterText, setFormFooterText] = useState('');
  const [formButtonText, setFormButtonText] = useState('');
  const [formButtonUrl, setFormButtonUrl] = useState('');

  // Delete Dialog State
  const [deleteTarget, setDeleteTarget] = useState<TemplateDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTemplates = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<TemplateListResponse>(
        `/workspaces/${currentWorkspace.id}/templates?limit=100`
      );
      setTemplates(res.items || []);
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load templates';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleSync = async () => {
    if (!currentWorkspace?.id) return;
    setSyncing(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.post<{ syncedCount: number }>(
        `/workspaces/${currentWorkspace.id}/templates/sync`,
        {}
      );
      setSuccess(`Successfully synchronized ${res.syncedCount} templates from Meta WhatsApp.`);
      await loadTemplates();
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to sync templates from Meta';
      setError(msg);
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id) return;

    if (!formName.trim() || !formBodyText.trim()) {
      setDialogError('Template name and body text are required.');
      return;
    }

    setSubmitting(true);
    setDialogError(null);

    const components: CreateTemplateRequest['components'] = [];

    if (formHeaderText.trim()) {
      components.push({
        type: 'HEADER',
        format: 'TEXT',
        text: formHeaderText.trim(),
      });
    }

    components.push({
      type: 'BODY',
      text: formBodyText.trim(),
    });

    if (formFooterText.trim()) {
      components.push({
        type: 'FOOTER',
        text: formFooterText.trim(),
      });
    }

    if (formButtonText.trim()) {
      components.push({
        type: 'BUTTONS',
        buttons: [
          {
            type: formButtonUrl.trim() ? 'URL' : 'QUICK_REPLY',
            text: formButtonText.trim(),
            url: formButtonUrl.trim() || undefined,
          },
        ],
      });
    }

    try {
      await api.post(`/workspaces/${currentWorkspace.id}/templates`, {
        name: formName.trim().toLowerCase(),
        category: formCategory,
        language: formLanguage.trim(),
        components,
      });

      setSuccess(`Template "${formName}" submitted to Meta for approval.`);
      setCreateOpen(false);
      resetForm();
      await loadTemplates();
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to create template';
      setDialogError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentWorkspace?.id || !deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/workspaces/${currentWorkspace.id}/templates/${deleteTarget.id}`);
      setSuccess(`Template "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      await loadTemplates();
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to delete template';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormCategory(TemplateCategory.MARKETING);
    setFormLanguage('en_US');
    setFormHeaderText('');
    setFormBodyText('');
    setFormFooterText('');
    setFormButtonText('');
    setFormButtonUrl('');
    setDialogError(null);
  };

  // Filtered Templates
  const filteredTemplates = templates.filter((t) => {
    if (searchQuery.trim()) {
      const match = t.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!match) return false;
    }
    if (selectedCategory !== 'ALL' && t.category !== selectedCategory) {
      return false;
    }
    if (selectedStatus !== 'ALL' && t.status !== selectedStatus) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case TemplateStatus.APPROVED:
        return (
          <Chip
            size="small"
            icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
            label="APPROVED"
            color="success"
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          />
        );
      case TemplateStatus.PENDING:
        return (
          <Chip
            size="small"
            icon={<HourglassEmptyIcon sx={{ fontSize: '14px !important' }} />}
            label="PENDING META APPROVAL"
            color="warning"
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          />
        );
      case TemplateStatus.REJECTED:
        return (
          <Chip
            size="small"
            icon={<ErrorOutlineIcon sx={{ fontSize: '14px !important' }} />}
            label="REJECTED"
            color="error"
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          />
        );
      default:
        return <Chip size="small" label={status} sx={{ fontWeight: 600, fontSize: '0.75rem' }} />;
    }
  };

  return (
    <Box id="templates-page-container" sx={{ pb: 6 }}>
      <PageHeader
        title="Message Templates"
        subtitle="Meta pre-approved marketing, utility, and authentication message templates"
        action={
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={syncing ? <CircularProgress size={18} /> : <SyncIcon />}
              onClick={handleSync}
              disabled={syncing || loading}
            >
              {syncing ? 'Syncing...' : 'Sync from Meta'}
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => {
                resetForm();
                setCreateOpen(true);
              }}
            >
              Create Template
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

      {/* Filter and Search Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }} elevation={0} variant="outlined">
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search templates by name..."
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
                Category:
              </Typography>
              {['ALL', 'MARKETING', 'UTILITY', 'AUTHENTICATION'].map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  size="small"
                  clickable
                  color={selectedCategory === cat ? 'primary' : 'default'}
                  onClick={() => setSelectedCategory(cat)}
                  variant={selectedCategory === cat ? 'filled' : 'outlined'}
                />
              ))}

              <Typography variant="body2" color="text.secondary" sx={{ mx: 1, fontWeight: 500 }}>
                Status:
              </Typography>
              {['ALL', 'APPROVED', 'PENDING', 'REJECTED'].map((st) => (
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

      {/* Template List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredTemplates.length === 0 ? (
        <EmptyState
          title="No Message Templates Found"
          description={
            templates.length === 0
              ? 'Create a WhatsApp pre-approved message template or sync approved templates from Meta Graph API.'
              : 'No templates match your search and filter criteria.'
          }
          icon={<MarkChatReadOutlinedIcon sx={{ fontSize: 40, color: 'primary.main' }} />}
          actionLabel={templates.length === 0 ? 'Create First Template' : undefined}
          onAction={
            templates.length === 0
              ? () => {
                  resetForm();
                  setCreateOpen(true);
                }
              : undefined
          }
        />
      ) : (
        <Grid container spacing={3}>
          {filteredTemplates.map((template) => {
            const bodyComp = template.components?.find((c) => c.type === 'BODY');
            const headerComp = template.components?.find((c) => c.type === 'HEADER');
            const footerComp = template.components?.find((c) => c.type === 'FOOTER');
            const buttonComp = template.components?.find((c) => c.type === 'BUTTONS');

            return (
              <Grid item xs={12} md={6} lg={4} key={template.id}>
                <Card
                  variant="outlined"
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 2,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      boxShadow: 3,
                      borderColor: 'primary.main',
                    },
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Header info */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem', wordBreak: 'break-all' }}>
                          {template.name}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.8, mt: 0.5 }}>
                          <Chip size="small" variant="outlined" label={template.category} sx={{ fontSize: '0.7rem' }} />
                          <Chip size="small" variant="outlined" label={template.language} sx={{ fontSize: '0.7rem' }} />
                        </Box>
                      </Box>
                      {getStatusBadge(template.status)}
                    </Box>

                    {/* WhatsApp Bubble Preview */}
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        my: 1.5,
                        backgroundColor: 'background.default',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        position: 'relative',
                      }}
                    >
                      {headerComp?.text && (
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: 'text.primary' }}>
                          {headerComp.text}
                        </Typography>
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          color: 'text.primary',
                        }}
                      >
                        {bodyComp?.text || '(Empty Body)'}
                      </Typography>
                      {footerComp?.text && (
                        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                          {footerComp.text}
                        </Typography>
                      )}
                      {buttonComp?.buttons && buttonComp.buttons.length > 0 && (
                        <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {buttonComp.buttons.map((btn, idx) => (
                            <Button
                              key={idx}
                              variant="outlined"
                              size="small"
                              fullWidth
                              disabled
                              sx={{
                                color: 'primary.main',
                                borderColor: 'primary.light',
                                textTransform: 'none',
                                fontSize: '0.75rem',
                              }}
                            >
                              {btn.text}
                            </Button>
                          ))}
                        </Box>
                      )}
                    </Paper>

                    {/* Footer Actions */}
                    <Box sx={{ mt: 'auto', pt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {template.metaTemplateId ? `Meta ID: ${template.metaTemplateId}` : 'Meta ID: Pending'}
                      </Typography>
                      <Tooltip title="Delete Template">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setDeleteTarget(template)}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Create Template Dialog */}
      <Dialog
        open={createOpen}
        onClose={() => !submitting && setCreateOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Create Message Template</DialogTitle>
        <DialogContent dividers>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {dialogError}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Form Fields */}
            <Grid item xs={12} md={7}>
              <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="Template Name"
                  size="small"
                  required
                  placeholder="e.g. order_confirmation"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  helperText="Lowercase alphanumeric and underscores only"
                />

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      select
                      fullWidth
                      label="Category"
                      size="small"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as TemplateCategory)}
                    >
                      <MenuItem value={TemplateCategory.MARKETING}>MARKETING</MenuItem>
                      <MenuItem value={TemplateCategory.UTILITY}>UTILITY</MenuItem>
                      <MenuItem value={TemplateCategory.AUTHENTICATION}>AUTHENTICATION</MenuItem>
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      select
                      fullWidth
                      label="Language"
                      size="small"
                      value={formLanguage}
                      onChange={(e) => setFormLanguage(e.target.value)}
                    >
                      <MenuItem value="en_US">English (US)</MenuItem>
                      <MenuItem value="es_ES">Spanish (Spain)</MenuItem>
                      <MenuItem value="pt_BR">Portuguese (Brazil)</MenuItem>
                      <MenuItem value="hi_IN">Hindi (India)</MenuItem>
                    </TextField>
                  </Grid>
                </Grid>

                <TextField
                  label="Header Text (Optional)"
                  size="small"
                  placeholder="e.g. Special Offer Just for You!"
                  value={formHeaderText}
                  onChange={(e) => setFormHeaderText(e.target.value)}
                />

                <Box>
                  <TextField
                    label="Body Text"
                    size="small"
                    required
                    multiline
                    rows={4}
                    fullWidth
                    placeholder="Hello {{1}}, your order #{{2}} has been confirmed!"
                    value={formBodyText}
                    onChange={(e) => setFormBodyText(e.target.value)}
                    helperText="Use {{1}}, {{2}}, etc. for dynamic customer attributes"
                  />
                  <Box sx={{ mt: 0.5, display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => {
                        const count = (formBodyText.match(/{{\d+}}/g) || []).length;
                        setFormBodyText((prev) => `${prev} {{${count + 1}}}`);
                      }}
                    >
                      + Insert Variable
                    </Button>
                  </Box>
                </Box>

                <TextField
                  label="Footer Text (Optional)"
                  size="small"
                  placeholder="e.g. Reply STOP to unsubscribe"
                  value={formFooterText}
                  onChange={(e) => setFormFooterText(e.target.value)}
                />

                <Divider sx={{ my: 0.5 }} />

                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Interactive Button (Optional)
                </Typography>

                <TextField
                  label="Button Text"
                  size="small"
                  placeholder="e.g. View Order"
                  value={formButtonText}
                  onChange={(e) => setFormButtonText(e.target.value)}
                />

                {formButtonText && (
                  <TextField
                    label="Button URL (Optional)"
                    size="small"
                    placeholder="https://example.com/order"
                    value={formButtonUrl}
                    onChange={(e) => setFormButtonUrl(e.target.value)}
                    helperText="Leave empty for quick reply button"
                  />
                )}
              </Box>
            </Grid>

            {/* Live WhatsApp Preview */}
            <Grid item xs={12} md={5}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PhoneAndroidIcon fontSize="small" /> WhatsApp Message Preview
              </Typography>

              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  backgroundColor: '#e7fed9',
                  color: '#111b21',
                  borderRadius: 3,
                  borderTopLeftRadius: 1,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  minHeight: 200,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {formHeaderText ? (
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, color: '#111b21' }}>
                    {formHeaderText}
                  </Typography>
                ) : null}

                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#111b21' }}>
                  {formBodyText || 'Your message text will appear here...'}
                </Typography>

                {formFooterText ? (
                  <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#667781' }}>
                    {formFooterText}
                  </Typography>
                ) : null}

                {formButtonText ? (
                  <Box sx={{ mt: 'auto', pt: 1.5, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                    <Button
                      variant="text"
                      size="small"
                      fullWidth
                      disabled
                      sx={{
                        color: '#00a884',
                        fontWeight: 600,
                        textTransform: 'none',
                      }}
                    >
                      {formButtonText}
                    </Button>
                  </Box>
                ) : null}
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateSubmit}
            disabled={submitting || !formName || !formBodyText}
            startIcon={submitting ? <CircularProgress size={18} /> : undefined}
          >
            {submitting ? 'Submitting to Meta...' : 'Submit to Meta'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => !deleting && setDeleteTarget(null)}>
        <DialogTitle sx={{ fontWeight: 600 }}>Delete Message Template?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to delete template <strong>{deleteTarget?.name}</strong>?
            This will remove it from Pingza and delete it from your Meta WhatsApp Business Account.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={18} /> : undefined}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
