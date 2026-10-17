import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { api } from '../../../lib/api.js';
import { useAuth } from '../../auth/AuthContext.js';
import { WorkspaceDto } from '@whatsapp-saas/contracts';

interface CreateWorkspaceDialogProps {
  open: boolean;
  onClose: () => void;
}

export const CreateWorkspaceDialog: React.FC<CreateWorkspaceDialogProps> = ({ open, onClose }) => {
  const { refreshWorkspaces, switchWorkspace } = useAuth();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter a workspace name.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newWs = await api.post<WorkspaceDto>('/workspaces', { name: name.trim() });
      await refreshWorkspaces();
      switchWorkspace(newWs.id);
      setName('');
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700 }}>Create New Workspace</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {errorMessage && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {errorMessage}
            </Alert>
          )}
          <TextField
            id="input-create-workspace-name"
            label="Workspace Name"
            placeholder="e.g. European Operations"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            fullWidth
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={isSubmitting} color="inherit">
            Cancel
          </Button>
          <Button
            id="btn-confirm-create-workspace"
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitting}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            {isSubmitting ? <CircularProgress size={20} color="inherit" /> : 'Create Workspace'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
