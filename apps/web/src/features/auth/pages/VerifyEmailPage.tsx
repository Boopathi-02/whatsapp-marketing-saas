import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { api } from '../../../lib/api.js';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token in request.');
      return;
    }

    async function verify() {
      try {
        const res = await api.post<{ message: string }>('/auth/verify-email', { token });
        setStatus('success');
        setMessage(res.message);
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Verification token is invalid or has expired.');
      }
    }

    verify();
  }, [token]);

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
          maxWidth: 440,
          width: '100%',
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5 }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 3,
              bgcolor: status === 'error' ? 'error.light' : 'success.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: status === 'error' ? 'error.main' : 'success.main',
            }}
          >
            <MarkEmailReadOutlinedIcon sx={{ fontSize: 32 }} />
          </Box>

          <Typography variant="h5" fontWeight={700} textAlign="center">
            Email Verification
          </Typography>

          {status === 'verifying' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 }}>
              <CircularProgress size={36} color="primary" />
              <Typography variant="body2" color="text.secondary">
                Verifying your email token...
              </Typography>
            </Box>
          )}

          {status === 'success' && (
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                {message || 'Email verified successfully!'}
              </Alert>
              <Button
                id="btn-verify-proceed"
                component={RouterLink}
                to="/"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                sx={{ py: 1.5, fontWeight: 700, borderRadius: 2 }}
              >
                Continue to Dashboard
              </Button>
            </Box>
          )}

          {status === 'error' && (
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {message}
              </Alert>
              <Button
                component={RouterLink}
                to="/login"
                variant="outlined"
                fullWidth
                sx={{ py: 1.5, borderRadius: 2 }}
              >
                Back to Sign In
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
