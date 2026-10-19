import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Avatar,
  MenuItem,
  Grid,
  Divider,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import SaveIcon from '@mui/icons-material/Save';
import { WhatsAppAccountDto, BusinessProfileDto } from '@whatsapp-saas/contracts';
import { api, ApiClientError } from '../../../lib/api.js';

interface BusinessProfileDialogProps {
  open: boolean;
  onClose: () => void;
  account: WhatsAppAccountDto | null;
  workspaceId?: string;
  onSuccess?: () => void;
}

const VERTICAL_OPTIONS = [
  { value: 'UNDEFINED', label: 'Not Specified' },
  { value: 'OTHER', label: 'Other' },
  { value: 'AUTO', label: 'Automotive' },
  { value: 'BEAUTY', label: 'Beauty & Personal Care' },
  { value: 'APPAREL', label: 'Clothing & Apparel' },
  { value: 'EDU', label: 'Education' },
  { value: 'ENTERTAIN', label: 'Entertainment' },
  { value: 'EVENT_PLAN', label: 'Event Planning' },
  { value: 'FINANCE', label: 'Finance & Banking' },
  { value: 'GROCERY', label: 'Grocery Store' },
  { value: 'GOVT', label: 'Government & Public Services' },
  { value: 'HOTEL', label: 'Hotel & Lodging' },
  { value: 'HEALTH', label: 'Health & Medical' },
  { value: 'NONPROFIT', label: 'Non-profit Organization' },
  { value: 'PROF_SERVICES', label: 'Professional Services' },
  { value: 'RETAIL', label: 'Retail & Shopping' },
  { value: 'TRAVEL', label: 'Travel & Transportation' },
  { value: 'RESTAURANT', label: 'Restaurant & Food' },
];

export const BusinessProfileDialog: React.FC<BusinessProfileDialogProps> = ({
  open,
  onClose,
  account,
  workspaceId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profile form state
  const [about, setAbout] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [vertical, setVertical] = useState('UNDEFINED');
  const [website1, setWebsite1] = useState('');
  const [website2, setWebsite2] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (open && account && workspaceId) {
      loadProfile();
    } else {
      resetForm();
    }
  }, [open, account?.id, workspaceId]);

  const resetForm = () => {
    setAbout('');
    setDescription('');
    setAddress('');
    setEmail('');
    setVertical('UNDEFINED');
    setWebsite1('');
    setWebsite2('');
    setProfilePictureUrl(undefined);
    setError(null);
    setSuccessMsg(null);
  };

  const loadProfile = async () => {
    if (!account || !workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<BusinessProfileDto>(
        `/workspaces/${workspaceId}/whatsapp-accounts/${account.id}/profile`
      );
      setAbout(data.about || '');
      setDescription(data.description || '');
      setAddress(data.address || '');
      setEmail(data.email || '');
      setVertical(data.vertical || 'UNDEFINED');
      setProfilePictureUrl(data.profilePictureUrl);
      if (data.websites && data.websites.length > 0) {
        setWebsite1(data.websites[0] || '');
        setWebsite2(data.websites[1] || '');
      } else {
        setWebsite1('');
        setWebsite2('');
      }
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to load business profile from Meta';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !workspaceId) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const websites: string[] = [];
    if (website1.trim()) websites.push(website1.trim());
    if (website2.trim()) websites.push(website2.trim());

    try {
      await api.patch(
        `/workspaces/${workspaceId}/whatsapp-accounts/${account.id}/profile`,
        {
          about: about.trim() || undefined,
          description: description.trim() || undefined,
          address: address.trim() || undefined,
          email: email.trim() || undefined,
          vertical: vertical !== 'UNDEFINED' ? vertical : undefined,
          websites: websites.length > 0 ? websites : undefined,
        }
      );

      setSuccessMsg('Business profile successfully updated on WhatsApp!');
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to update business profile on Meta';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BusinessIcon color="primary" />
          WhatsApp Business Profile: {account?.displayName || account?.displayPhoneNumber}
        </DialogTitle>

        <DialogContent dividers sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {successMsg && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMsg}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress color="primary" />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Profile Header info */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Avatar
                  src={profilePictureUrl}
                  sx={{ width: 64, height: 64, bgcolor: 'primary.light', fontSize: '1.5rem' }}
                >
                  {account?.displayName ? account.displayName.charAt(0).toUpperCase() : 'W'}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {account?.displayName || 'WhatsApp Business Account'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                    {account?.displayPhoneNumber}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Official Meta Cloud API Profile
                  </Typography>
                </Box>
              </Box>

              <Divider />

              <TextField
                label="About / Status Text"
                placeholder="e.g. Always here to help you."
                fullWidth
                value={about}
                onChange={e => setAbout(e.target.value)}
                inputProps={{ maxLength: 139 }}
                helperText={`${about.length}/139 characters. Shown in WhatsApp chat details.`}
                disabled={saving}
              />

              <TextField
                label="Business Description"
                placeholder="Describe your business, services, and operating mission..."
                fullWidth
                multiline
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                inputProps={{ maxLength: 512 }}
                helperText={`${description.length}/512 characters. Full business description.`}
                disabled={saving}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Physical Address"
                    placeholder="e.g. 123 Market St, Suite 400, City, State"
                    fullWidth
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    inputProps={{ maxLength: 256 }}
                    disabled={saving}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Customer Contact Email"
                    placeholder="support@yourcompany.com"
                    type="email"
                    fullWidth
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={saving}
                  />
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Primary Website"
                    placeholder="https://www.yourcompany.com"
                    fullWidth
                    value={website1}
                    onChange={e => setWebsite1(e.target.value)}
                    disabled={saving}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Secondary Website"
                    placeholder="https://blog.yourcompany.com"
                    fullWidth
                    value={website2}
                    onChange={e => setWebsite2(e.target.value)}
                    disabled={saving}
                  />
                </Grid>
              </Grid>

              <TextField
                select
                label="Industry Vertical / Category"
                value={vertical}
                onChange={e => setVertical(e.target.value)}
                fullWidth
                disabled={saving}
                helperText="Primary industry category registered with Meta"
              >
                {VERTICAL_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading || saving}
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            {saving ? 'Saving...' : 'Save Profile to Meta'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
