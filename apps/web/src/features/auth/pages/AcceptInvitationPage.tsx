import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { useAuth } from '../AuthContext.js';
import { PingzaLogo } from '../../../components/branding/PingzaLogo.js';

export const AcceptInvitationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, refreshWorkspaces, switchWorkspace } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRejected, setIsRejected] = useState(false);

  const handleAccept = async () => {
    if (!token) return;
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/invitations/${token}` } } });
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const res = await api.post<{ workspaceId: string; message: string }>(
        `/invitations/${token}/accept`
      );

      setSuccessMessage(res.message);
      await refreshWorkspaces();
      if (res.workspaceId) {
        switchWorkspace(res.workspaceId);
      }
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to accept invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!token) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await api.post(`/invitations/${token}/reject`);
      setIsRejected(true);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to reject invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background: theme =>
          theme.palette.mode === 'dark'
            ? 'radial-gradient(ellipse at 50% 20%, #1e293b 0%, #0f172a 100%)'
            : 'radial-gradient(ellipse at 50% 20%, #f0fdf4 0%, #f8fafc 100%)',
      }}
    >
      <Card
        sx={{
          maxWidth: 480,
          width: '100%',
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5 }}>
          <PingzaLogo variant="icon" size={48} />

          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2.5,
              bgcolor: 'primary.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.main',
            }}
          >
            <GroupAddOutlinedIcon sx={{ fontSize: 28 }} />
          </Box>

          <Typography variant="h5" fontWeight={800} textAlign="center">
            Team Workspace Invitation
          </Typography>

          <Typography variant="body2" color="text.secondary" textAlign="center">
            You have been invited to join Pingza and collaborate on WhatsApp marketing operations in this workspace.
          </Typography>

          {successMessage && (
            <Alert severity="success" sx={{ width: '100%', borderRadius: 2 }}>
              {successMessage} Loading your workspace...
            </Alert>
          )}

          {isRejected && (
            <Alert severity="info" sx={{ width: '100%', borderRadius: 2 }}>
              You have declined this workspace invitation.
            </Alert>
          )}

          {errorMessage && (
            <Alert severity="error" sx={{ width: '100%', borderRadius: 2 }}>
              {errorMessage}
            </Alert>
          )}

          {!successMessage && !isRejected && (
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
              <Button
                id="btn-accept-invitation"
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                disabled={isSubmitting}
                onClick={handleAccept}
                sx={{ py: 1.5, fontWeight: 700, borderRadius: 2 }}
              >
                {isSubmitting ? (
                  <CircularProgress size={24} color="inherit" />
                ) : isAuthenticated ? (
                  'Accept Invitation & Join'
                ) : (
                  'Sign In to Accept Invitation'
                )}
              </Button>

              <Button
                id="btn-reject-invitation"
                variant="outlined"
                color="inherit"
                fullWidth
                disabled={isSubmitting}
                onClick={handleReject}
                sx={{ py: 1, borderRadius: 2 }}
              >
                Decline
              </Button>
            </Box>
          )}

          {(successMessage || isRejected) && (
            <Button
              component={RouterLink}
              to="/"
              variant="outlined"
              fullWidth
              sx={{ py: 1.5, borderRadius: 2 }}
            >
              Return Home
            </Button>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
