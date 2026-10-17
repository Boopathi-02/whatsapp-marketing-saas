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
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.js';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!displayName.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      await register({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
        workspaceName: workspaceName.trim() || undefined,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Registration failed. Please check your information.');
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
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Logo & Header */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 8px 16px rgba(16, 185, 129, 0.25)',
              }}
            >
              <WhatsAppIcon sx={{ fontSize: 28 }} />
            </Box>
            <Typography variant="h5" fontWeight={700} textAlign="center">
              Create your account
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Start marketing via official WhatsApp Business API
            </Typography>
          </Box>

          {errorMessage && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              id="input-display-name"
              label="Full Name / Display Name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              fullWidth
              autoFocus
            />

            <TextField
              id="input-email"
              label="Work Email Address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              fullWidth
              autoComplete="email"
            />

            <TextField
              id="input-workspace-name"
              label="Company / Workspace Name (Optional)"
              value={workspaceName}
              onChange={e => setWorkspaceName(e.target.value)}
              placeholder="e.g. Acme Marketing"
              fullWidth
            />

            <TextField
              id="input-password"
              label="Password (min 8 chars, 1 uppercase, 1 number)"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
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

            <Button
              id="btn-register"
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={isSubmitting}
              sx={{
                py: 1.5,
                fontWeight: 700,
                borderRadius: 2,
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              }}
            >
              {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Get Started Free'}
            </Button>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link
                id="link-login"
                component={RouterLink}
                to="/login"
                fontWeight={600}
                color="primary"
                underline="hover"
              >
                Sign in here
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
