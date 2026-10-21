import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import { WhatsAppAccountDto, BlockedUsersPageDto, BlockUsersResultDto } from '@whatsapp-saas/contracts';
import { api, ApiClientError } from '../../../lib/api.js';

interface BlockedUsersDialogProps {
  open: boolean;
  onClose: () => void;
  account: WhatsAppAccountDto | null;
  workspaceId?: string;
}

const PHONE_PATTERN = /^\+?[1-9]\d{6,14}$/;

export const BlockedUsersDialog: React.FC<BlockedUsersDialogProps> = ({ open, onClose, account, workspaceId }) => {
  const [page, setPage] = useState<BlockedUsersPageDto>({ items: [], after: null, before: null });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const base = workspaceId && account ? `/workspaces/${workspaceId}/whatsapp-accounts/${account.id}/blocked-users` : null;

  const load = useCallback(
    async (after?: string) => {
      if (!base) return;
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<BlockedUsersPageDto>(`${base}?limit=25${after ? `&after=${encodeURIComponent(after)}` : ''}`);
        setPage(prev => (after ? { ...data, items: [...prev.items, ...data.items] } : data));
      } catch (err) {
        setError(err instanceof ApiClientError ? err.message : 'Failed to load blocked users');
      } finally {
        setLoading(false);
      }
    },
    [base]
  );

  useEffect(() => {
    if (open) {
      setNotice(null);
      setInput('');
      void load();
    }
  }, [open, load]);

  const parsed = input
    .split(/[\s,;]+/)
    .map(s => s.trim())
    .filter(Boolean);
  const invalid = parsed.some(p => !PHONE_PATTERN.test(p));
  const canBlock = parsed.length > 0 && parsed.length <= 25 && !invalid && !busy;

  const mutate = async (kind: 'block' | 'unblock', users: string[]) => {
    if (!base || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.post<BlockUsersResultDto>(kind === 'block' ? base : `${base}/unblock`, { users });
      setNotice(
        `${result.changed.length} number(s) ${kind === 'block' ? 'blocked' : 'unblocked'}` +
          (result.failed.length ? `; ${result.failed.length} failed: ${result.failed[0]!.message}` : '.')
      );
      if (kind === 'block') setInput('');
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : `Failed to ${kind} users`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} maxWidth="sm" fullWidth aria-labelledby="blocked-users-title">
      <DialogTitle id="blocked-users-title" sx={{ fontWeight: 700 }}>
        Blocked users: {account?.displayPhoneNumber}
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

        <Box component="form" onSubmit={e => { e.preventDefault(); if (canBlock) void mutate('block', parsed); }} sx={{ mb: 3 }}>
          <TextField
            label="Phone numbers to block"
            placeholder="+15551234567, +15557654321"
            value={input}
            onChange={e => setInput(e.target.value)}
            fullWidth
            size="small"
            error={invalid}
            helperText={invalid ? 'Use international format, e.g. +15551234567' : 'Separate multiple numbers with commas or spaces (max 25).'}
            disabled={busy}
          />
          <Button type="submit" variant="contained" color="warning" disabled={!canBlock} sx={{ mt: 1 }}>
            {busy ? 'Working…' : 'Block'}
          </Button>
        </Box>

        {loading && page.items.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }} role="status" aria-label="Loading blocked users">
            <CircularProgress />
          </Box>
        ) : page.items.length === 0 ? (
          <Typography color="text.secondary">No blocked users.</Typography>
        ) : (
          <List disablePadding>
            {page.items.map(u => (
              <ListItem
                key={u.waId}
                divider
                secondaryAction={
                  <Button size="small" disabled={busy} onClick={() => mutate('unblock', [u.waId])} aria-label={`Unblock ${u.waId}`}>
                    Unblock
                  </Button>
                }
              >
                <ListItemText primary={`+${u.waId}`} secondary={u.name ?? 'Unknown contact'} />
              </ListItem>
            ))}
          </List>
        )}
        {page.after && (
          <Button onClick={() => load(page.after ?? undefined)} disabled={loading} sx={{ mt: 1 }}>
            Load more
          </Button>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
