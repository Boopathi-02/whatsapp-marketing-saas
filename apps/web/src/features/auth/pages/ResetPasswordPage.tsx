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
  InputAdornment,
  IconButton,
} from '@mui/material';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { Link as RouterLink, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api.js';
import { PingzaLogo } from '../../../components/branding/PingzaLogo.js';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenFromUrl = searchParams.get('token') || '';

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token.trim()) {
      setErrorMessage('Reset token is missing or invalid.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post<{ message: string }>('/auth/reset-password', {
        token: token.trim(),
        newPassword,
      });
      setSuccessMessage(res.message);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to reset password.');
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
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <PingzaLogo variant="icon" size={44} />
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                bgcolor: 'primary.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'primary.main',
              }}
            >
              <KeyOutlinedIcon sx={{ fontSize: 26 }} />
            </Box>
            <Typography variant="h5" fontWeight={800} textAlign="center">
              Set new password
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Enter your reset token and your new secure Pingza password
            </Typography>
          </Box>

          {successMessage && (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              {successMessage} Redirecting to login...
            </Alert>
          )}

          {errorMessage && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {errorMessage}
            </Alert>
          )}

          {!successMessage && (
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {!tokenFromUrl && (
                <TextField
                  id="input-reset-token"
                  label="Reset Token"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  required
                  fullWidth
                  placeholder="Paste token from email"
                />
              )}

              <TextField
                id="input-new-password"
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                fullWidth
                autoComplete="new-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="Toggle password visibility"
                        onClick={() => setShowPassword(prev => !prev)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                id="input-confirm-password"
                label="Confirm New Password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                fullWidth
                autoComplete="new-password"
              />

              <Button
                id="btn-reset-submit"
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                disabled={isSubmitting}
                sx={{ py: 1.5, fontWeight: 700, borderRadius: 2 }}
              >
                {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Update Password'}
              </Button>
            </Box>
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
