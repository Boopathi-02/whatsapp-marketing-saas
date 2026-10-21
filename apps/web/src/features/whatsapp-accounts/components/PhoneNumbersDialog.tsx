import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { WhatsAppAccountDto, WabaPhoneNumberDto } from '@whatsapp-saas/contracts';
import { api, ApiClientError } from '../../../lib/api.js';

interface PhoneNumbersDialogProps {
  open: boolean;
  onClose: () => void;
  account: WhatsAppAccountDto | null;
  workspaceId?: string;
  onAdded?: () => void;
}

/** Lists every phone number under the account's WABA and lets an admin connect the others. */
export const PhoneNumbersDialog: React.FC<PhoneNumbersDialogProps> = ({
  open,
  onClose,
  account,
  workspaceId,
  onAdded,
}) => {
  const [phones, setPhones] = useState<WabaPhoneNumberDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const base = workspaceId && account ? `/workspaces/${workspaceId}/whatsapp-accounts/${account.id}` : null;

  const load = useCallback(async () => {
    if (!base) return;
    setLoading(true);
    setError(null);
    try {
      setPhones(await api.get<WabaPhoneNumberDto[]>(`${base}/phone-numbers`));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load phone numbers from Meta');
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    if (open) {
      setNotice(null);
      void load();
    }
  }, [open, load]);

  const add = async (phone: WabaPhoneNumberDto) => {
    if (!base || addingId) return;
    setAddingId(phone.id);
    setError(null);
    setNotice(null);
    try {
      await api.post(`${base}/phone-numbers`, { phoneNumberId: phone.id });
      setNotice(`${phone.displayPhoneNumber ?? phone.id} connected.`);
      onAdded?.();
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to connect phone number');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="phone-numbers-title">
      <DialogTitle id="phone-numbers-title" sx={{ fontWeight: 700 }}>
        Phone numbers on {account?.displayName ?? 'this account'}
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {notice && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {notice}
          </Alert>
        )}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }} role="status" aria-label="Loading phone numbers">
            <CircularProgress />
          </Box>
        ) : phones.length === 0 && !error ? (
          <Typography color="text.secondary">No phone numbers were found on this WhatsApp Business Account.</Typography>
        ) : (
          <List disablePadding>
            {phones.map(p => (
              <ListItem
                key={p.id}
                divider
                secondaryAction={
                  p.connected ? (
                    <Chip label="Connected" color="success" size="small" />
                  ) : p.unavailable ? (
                    <Chip label="In use elsewhere" size="small" />
                  ) : (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => add(p)}
                      disabled={addingId !== null}
                      aria-label={`Connect ${p.displayPhoneNumber ?? p.id}`}
                    >
                      {addingId === p.id ? 'Connecting…' : 'Connect'}
                    </Button>
                  )
                }
              >
                <ListItemText
                  primary={p.displayPhoneNumber ?? p.id}
                  secondary={[p.verifiedName, p.nameStatus && `Name: ${p.nameStatus}`, `Quality: ${p.qualityRating}`]
                    .filter(Boolean)
                    .join(' · ')}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
