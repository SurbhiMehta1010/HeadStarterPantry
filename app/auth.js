'use client';

import { useState } from 'react';
import { auth } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Box, TextField, Button, Typography, Snackbar, Alert, Stack } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

const theme = createTheme({
  typography: {
    fontFamily: 'Raleway, sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: '#D14469',
          color: 'white',
          border: '2px solid #D14469',
          borderRadius: '20px',
          fontWeight: 700,
          '&:hover': {
            backgroundColor: '#FF85A2',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '20px',
            '& fieldset': {
              borderColor: '#D14469',
            },
            '&:hover fieldset': {
              borderColor: '#D14469',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#D14469',
            },
          },
        },
      },
    },
  },
});

export default function Auth({ onUserChange }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const handleRegister = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      onUserChange(userCredential.user);
      setSnackbarMessage('Registration successful!');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
    } catch (error) {
      console.error('Error registering:', error);
      setSnackbarMessage(error.message);
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      onUserChange(userCredential.user);
      setSnackbarMessage('Login successful!');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
    } catch (error) {
      console.error('Error logging in:', error);
      setSnackbarMessage(error.message);
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      onUserChange(null);
      setSnackbarMessage('Logout successful!');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
    } catch (error) {
      console.error('Error logging out:', error);
      setSnackbarMessage(error.message);
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box display="flex" flexDirection="column" alignItems="center">
        {user ? (
          <Stack spacing={2} alignItems="center">
            <Typography variant="h6" sx={{ color: '#BC1456', fontWeight: 700 }}>
              Welcome, {user.email}
            </Typography>
            <Button onClick={handleLogout}>
              Logout
            </Button>
          </Stack>
        ) : (
          <Stack spacing={2} alignItems="center">
            <TextField
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <Button variant="contained" onClick={handleLogin}>
                Login
              </Button>
              <Button variant="contained" onClick={handleRegister}>
                Register
              </Button>
            </Stack>
          </Stack>
        )}
        <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
          <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
