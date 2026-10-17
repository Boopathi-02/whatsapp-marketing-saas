import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';

interface ActionModalState {
  open: boolean;
  title: string;
  phase: string;
  description: string;
}

export const QuickActions: React.FC = () => {
  const [modal, setModal] = useState<ActionModalState>({
    open: false,
    title: '',
    phase: '',
    description: '',
  });

  const handleOpen = (title: string, phase: string, description: string) => {
    setModal({
      open: true,
      title,
      phase,
      description,
    });
  };

  const handleClose = () => {
    setModal(prev => ({ ...prev, open: false }));
  };

  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        <Button
          id="btn-quick-create-campaign"
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() =>
            handleOpen(
              'Campaign Dispatch Workflow',
              'Phase 4',
              'Bulk campaign composition, audience segmentation, and Redis/BullMQ queue scheduling are scheduled for implementation in Phase 4.'
            )
          }
        >
          Create Campaign
        </Button>

        <Button
          id="btn-quick-import-contacts"
          variant="outlined"
          color="inherit"
          startIcon={<UploadFileIcon />}
          onClick={() =>
            handleOpen(
              'Bulk Contact Import',
              'Phase 3',
              'CSV and Excel contact ingestion, international phone number sanitization, and opt-in consent verification are scheduled for implementation in Phase 3.'
            )
          }
        >
          Import Contacts
        </Button>

        <Button
          id="btn-quick-connect-whatsapp"
          variant="outlined"
          color="inherit"
          startIcon={<WhatsAppIcon />}
          onClick={() =>
            handleOpen(
              'Meta Cloud API Onboarding',
              'Phase 3',
              'Meta Embedded Signup, WhatsApp Business Account (WABA) verification, and webhook signature synchronization are scheduled for implementation in Phase 3.'
            )
          }
        >
          Connect Account
        </Button>

        <Button
          id="btn-quick-create-template"
          variant="outlined"
          color="inherit"
          startIcon={<NoteAddOutlinedIcon />}
          onClick={() =>
            handleOpen(
              'Message Template Editor',
              'Phase 3',
              'Template creation with Meta Graph API submission, variable interpolation, and automated approval tracking are scheduled for implementation in Phase 3.'
            )
          }
        >
          New Template
        </Button>
      </Box>

      {/* Development Roadmap Feedback Dialog */}
      <Dialog
        open={modal.open}
        onClose={handleClose}
        aria-labelledby="dialog-phase-title"
        aria-describedby="dialog-phase-description"
        PaperProps={{ sx: { borderRadius: 3, p: 1, maxWidth: 480 } }}
      >
        <DialogTitle id="dialog-phase-title" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          {modal.title}
          <Chip label={modal.phase} color="info" size="small" sx={{ fontWeight: 700 }} />
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="dialog-phase-description" sx={{ color: 'text.secondary', pt: 1 }}>
            {modal.description}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button id="btn-dialog-close" onClick={handleClose} variant="contained" color="primary">
            Understood
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
