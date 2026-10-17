import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Link,
  CircularProgress,
} from '@mui/material';
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { api } from '../../../lib/api.js';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post<{ message: string }>('/auth/forgot-password', {
        email: email.trim(),
      });
      setSuccessMessage(res.message);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit request.');
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
          maxWidth: 440,
          width: '100%',
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
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
              <LockResetOutlinedIcon sx={{ fontSize: 28 }} />
            </Box>
            <Typography variant="h5" fontWeight={700} textAlign="center">
              Forgot password?
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Enter your email and we'll dispatch single-use reset instructions
            </Typography>
          </Box>

          {successMessage && (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              {successMessage}
            </Alert>
          )}

          {errorMessage && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {errorMessage}
            </Alert>
          )}

          {!successMessage ? (
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                id="input-forgot-email"
                label="Email Address"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                fullWidth
                autoFocus
              />

              <Button
                id="btn-forgot-submit"
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={isSubmitting}
                sx={{ py: 1.5, fontWeight: 700, borderRadius: 2 }}
              >
                {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Link'}
              </Button>
            </Box>
          ) : (
            <Button
              component={RouterLink}
              to="/login"
              variant="outlined"
              fullWidth
              sx={{ py: 1.5, borderRadius: 2 }}
            >
              Return to Login
            </Button>
          )}

          <Box sx={{ textAlign: 'center' }}>
            <Link component={RouterLink} to="/login" variant="body2" color="text.secondary" underline="hover">
              Back to Sign In
            </Link>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
