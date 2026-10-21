import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Grid,
  Button,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Paper,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BusinessIcon from '@mui/icons-material/Business';
import PublicIcon from '@mui/icons-material/Public';
import SecurityIcon from '@mui/icons-material/Security';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import { useAuth } from '../../auth/AuthContext.js';
import { api } from '../../../lib/api.js';

interface GeneralSettingsTabProps {
  onNavigateTab?: (tab: string) => void;
}

const TIMEZONES = [
  'UTC',
  'America/New_York (EST/EDT)',
  'America/Chicago (CST/CDT)',
  'America/Los_Angeles (PST/PDT)',
  'Europe/London (GMT/BST)',
  'Europe/Paris (CET/CEST)',
  'Asia/Dubai (GST)',
  'Asia/Kolkata (IST)',
  'Asia/Singapore (SGT)',
  'Asia/Tokyo (JST)',
  'Australia/Sydney (AEST/AEDT)',
];

const COUNTRY_CODES = [
  { code: '+1', label: '+1 (US & Canada)' },
  { code: '+44', label: '+44 (United Kingdom)' },
  { code: '+91', label: '+91 (India)' },
  { code: '+61', label: '+61 (Australia)' },
  { code: '+49', label: '+49 (Germany)' },
  { code: '+33', label: '+33 (France)' },
  { code: '+55', label: '+55 (Brazil)' },
  { code: '+971', label: '+971 (United Arab Emirates)' },
  { code: '+65', label: '+65 (Singapore)' },
];

export const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({ onNavigateTab }) => {
  const { currentWorkspace, refreshWorkspaces } = useAuth();
  const [name, setName] = useState(currentWorkspace?.name || '');
  const [timezone, setTimezone] = useState('UTC');
  const [countryCode, setCountryCode] = useState('+1');
  const [optOutKeywords, setOptOutKeywords] = useState('STOP, UNSUBSCRIBE, CANCEL');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const role = currentWorkspace?.role;
  const isOwner = role === 'owner';
  const isAdmin = isOwner || role === 'admin';

  useEffect(() => {
    if (currentWorkspace?.name) {
      setName(currentWorkspace.name);
    }
  }, [currentWorkspace?.name]);

  const handleCopyId = async () => {
    if (!currentWorkspace?.id) return;
    try {
      await navigator.clipboard.writeText(currentWorkspace.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id || !isAdmin) return;

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setErrorMessage('Workspace name must be at least 2 characters');
      return;
    }
    if (trimmed.length > 60) {
      setErrorMessage('Workspace name cannot exceed 60 characters');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      await api.patch(`/workspaces/${currentWorkspace.id}`, { name: trimmed });
      await refreshWorkspaces();
      setSuccessMessage('Workspace settings successfully updated.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update workspace settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Alert notifications */}
      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ borderRadius: 2 }}>
          {successMessage}
        </Alert>
      )}

      {errorMessage && (
        <Alert severity="error" onClose={() => setErrorMessage(null)} sx={{ borderRadius: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Workspace Identity & General Info */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <BusinessIcon color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  Workspace Identity
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Configure public organization branding, workspace identifiers, and system metadata.
              </Typography>

              <Box component="form" onSubmit={handleSave}>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      id="input-workspace-name"
                      label="Workspace Name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      disabled={!isAdmin || isSaving}
                      helperText={
                        isAdmin
                          ? 'This name will appear on notifications and across member workspaces.'
                          : 'Read-only: Contact your workspace owner to change the organization name.'
                      }
                      required
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Active Role
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={role?.toUpperCase() || 'MEMBER'}
                          color={isOwner ? 'primary' : isAdmin ? 'info' : 'default'}
                          size="medium"
                          sx={{ fontWeight: 700, borderRadius: 1.5 }}
                        />
                        <Chip
                          label={currentWorkspace?.status?.toUpperCase() || 'ACTIVE'}
                          color="success"
                          variant="outlined"
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="input-workspace-slug"
                      label="Workspace Slug / URL Path"
                      value={currentWorkspace?.slug || 'workspace-slug'}
                      disabled
                      helperText="System-generated URL slug identifier"
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ position: 'relative' }}>
                      <TextField
                        fullWidth
                        id="input-workspace-id"
                        label="Workspace Unique ID"
                        value={currentWorkspace?.id || ''}
                        disabled
                        helperText="Required for API authorization & webhook routing"
                        InputProps={{
                          endAdornment: (
                            <Tooltip title={copiedId ? 'Copied!' : 'Copy Workspace ID'}>
                              <IconButton
                                size="small"
                                onClick={handleCopyId}
                                aria-label="Copy workspace ID"
                                sx={{ color: copiedId ? 'success.main' : 'text.secondary' }}
                              >
                                {copiedId ? <CheckCircleOutlineIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                          ),
                        }}
                      />
                    </Box>
                  </Grid>

                  {isAdmin && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 1 }}>
                        <Button
                          id="btn-save-workspace-settings"
                          type="submit"
                          variant="contained"
                          color="primary"
                          disabled={isSaving || name.trim() === currentWorkspace?.name}
                          startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : null}
                          sx={{ fontWeight: 700, px: 3, borderRadius: 2 }}
                        >
                          {isSaving ? 'Saving Changes…' : 'Save Changes'}
                        </Button>
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Workspace Stats / Summary */}
        <Grid item xs={12} lg={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: theme =>
                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              Workspace Profile Summary
            </Typography>
            <Divider />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Organization:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {currentWorkspace?.name || 'Acme Workspace'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Your Access Level:
              </Typography>
              <Chip
                label={role || 'member'}
                size="small"
                color={isOwner ? 'primary' : 'default'}
                sx={{ textTransform: 'capitalize', fontWeight: 600 }}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Created:
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {currentWorkspace?.createdAt
                  ? new Date(currentWorkspace.createdAt).toLocaleDateString()
                  : 'Recent'}
              </Typography>
            </Box>

            <Divider />

            <Typography variant="caption" color="text.secondary">
              Managing team members, changing roles, and purchasing plans are accessible through the tabs above.
            </Typography>
          </Paper>
        </Grid>

        {/* Regional & Communication Defaults */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <PublicIcon color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  Regional & Localization
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Configure dispatch schedule timezones and regional phone dial defaults.
              </Typography>

              <Grid container spacing={2.5}>
                <Grid item xs={12}>
                  <FormControl fullWidth size="medium">
                    <InputLabel id="timezone-select-label">Default Dispatch Timezone</InputLabel>
                    <Select
                      labelId="timezone-select-label"
                      id="select-timezone"
                      value={timezone}
                      label="Default Dispatch Timezone"
                      onChange={e => setTimezone(e.target.value)}
                      disabled={!isAdmin}
                    >
                      {TIMEZONES.map(tz => (
                        <MenuItem key={tz} value={tz}>
                          {tz}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth size="medium">
                    <InputLabel id="country-code-select-label">Default Country Code</InputLabel>
                    <Select
                      labelId="country-code-select-label"
                      id="select-country-code"
                      value={countryCode}
                      label="Default Country Code"
                      onChange={e => setCountryCode(e.target.value)}
                      disabled={!isAdmin}
                    >
                      {COUNTRY_CODES.map(c => (
                        <MenuItem key={c.code} value={c.code}>
                          {c.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Communication & Compliance Defaults */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <SecurityIcon color="primary" />
                <Typography variant="h5" fontWeight={700}>
                  Compliance & Messaging Policies
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Automatic opt-out triggers and safety thresholds for WhatsApp broadcast campaigns.
              </Typography>

              <Grid container spacing={2.5}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    id="input-opt-out-keywords"
                    label="Automated Opt-Out Keywords"
                    value={optOutKeywords}
                    onChange={e => setOptOutKeywords(e.target.value)}
                    disabled={!isAdmin}
                    helperText="Inbound messages matching these keywords immediately unsubscribe the contact."
                  />
                </Grid>

                <Grid item xs={12}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: theme =>
                        theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.08)' : 'rgba(76, 175, 80, 0.05)',
                      border: '1px solid',
                      borderColor: 'success.light',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                    }}
                  >
                    <CheckCircleOutlineIcon color="success" fontSize="small" />
                    <Typography variant="caption" color="text.secondary">
                      Meta Cloud API compliance protection active: Rate limiting, 24h conversation windows, and opt-out suppression are automatically enforced.
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Danger Zone (Owner Only) */}
        {isOwner && (
          <Grid item xs={12}>
            <Card
              sx={{
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'error.main',
                backgroundColor: theme =>
                  theme.palette.mode === 'dark' ? 'rgba(211, 47, 47, 0.04)' : 'rgba(211, 47, 47, 0.02)',
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <WarningAmberOutlinedIcon color="error" />
                  <Typography variant="h5" fontWeight={700} color="error.main">
                    Danger Zone
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Transferring workspace ownership or closing the organization cannot be undone.
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => onNavigateTab?.('team')}
                    sx={{ fontWeight: 600, borderRadius: 2 }}
                  >
                    Transfer Ownership in Team Tab
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};
