import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Fade,
  Zoom,
  CircularProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6); // Only numbers, max 6 digits
    setCode(value);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (code.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);

    try {
      await login(code);
      setSuccess(true);
      
      // Show success animation for 1.5 seconds then navigate
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid code. Please try again.');
      setCode('');
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, position: 'relative', overflow: 'hidden' }}>
        {success && (
          <Fade in={success}>
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'success.main',
                color: 'white',
                zIndex: 1000,
              }}
            >
              <Zoom in={success} timeout={500}>
                <Box sx={{ textAlign: 'center' }}>
                  <CheckCircleIcon sx={{ fontSize: 80, mb: 2 }} />
                  <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Login Successful!
                  </Typography>
                  <Typography variant="body1">
                    Redirecting...
                  </Typography>
                </Box>
              </Zoom>
            </Box>
          </Fade>
        )}

        <Typography variant="h4" component="h1" gutterBottom align="center">
          Aaradhya Fashion
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" gutterBottom>
          Lehenga Choli Business Management
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, mt: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Enter 6-Digit Code"
            value={code}
            onChange={handleCodeChange}
            margin="normal"
            required
            autoFocus
            inputProps={{
              inputMode: 'numeric',
              pattern: '[0-9]*',
              maxLength: 6,
              style: {
                fontSize: '2rem',
                textAlign: 'center',
                letterSpacing: '0.5rem',
                fontWeight: 'bold',
              },
            }}
            sx={{
              mt: 4,
              '& .MuiOutlinedInput-root': {
                fontSize: '1.5rem',
              },
            }}
            placeholder="000000"
            disabled={loading || success}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 4, mb: 2, py: 1.5, fontSize: '1.1rem' }}
            disabled={loading || success || code.length !== 6}
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {loading ? 'Verifying...' : success ? 'Success!' : 'Login'}
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
