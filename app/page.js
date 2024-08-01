'use client';

import { useState, useEffect } from 'react';
import {
  Box, Stack, Typography, Button, Modal, TextField, IconButton, Snackbar, Alert, InputBase, Paper
} from '@mui/material';
import { firestore, auth } from '@/firebase';
import { collection, doc, getDocs, query, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Add, Remove } from '@mui/icons-material';
import Auth from './auth';
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
            border: '2px solid #D14469',
            '& fieldset': {
              borderColor: '#D14469',
            },
            '&:hover fieldset': {
              borderColor: '#D14469',
            },
          },
        },
      },
    },
  },
});

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'white',
  boxShadow: 24,
  p: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  borderRadius: '20px',
  border: '2px solid #D14469',
};

const itemBoxStyle = {
  width: '100%',
  padding: 2,
  backgroundColor: '#FFD1DC',
  border: '2px solid #D14469',
  borderRadius: '20px',
  boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 2,
};

export default function Page() {
  const [inventory, setInventory] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [openRemove, setOpenRemove] = useState(false);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [user, setUser] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [searchTerm, setSearchTerm] = useState('');
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('name');

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        updateInventory(currentUser.uid);
      }
    });
  }, []);

  const updateInventory = async (userId) => {
    const snapshot = query(collection(firestore, `users/${userId}/inventory`));
    const docs = await getDocs(snapshot);
    const inventoryList = [];
    docs.forEach((doc) => {
      inventoryList.push({ name: doc.id, ...doc.data() });
    });
    setInventory(inventoryList);
  };

  const addItem = async (item, qty) => {
    if (!user) return;
    const normalizedItem = item.toLowerCase();
    const docRef = doc(collection(firestore, `users/${user.uid}/inventory`), normalizedItem);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const { quantity } = docSnap.data();
      await setDoc(docRef, { quantity: quantity + qty });
    } else {
      await setDoc(docRef, { quantity: qty });
    }
    await updateInventory(user.uid);
  };

  const removeItem = async (item, qty) => {
    if (!user) return;
    const normalizedItem = item.toLowerCase();
    const docRef = doc(collection(firestore, `users/${user.uid}/inventory`), normalizedItem);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const { quantity } = docSnap.data();
      if (quantity <= qty) {
        await deleteDoc(docRef);
      } else {
        await setDoc(docRef, { quantity: quantity - qty });
      }
    }
    await updateInventory(user.uid);
  };

  const handleOpenAdd = () => setOpenAdd(true);
  const handleCloseAdd = () => setOpenAdd(false);

  const handleOpenRemove = () => setOpenRemove(true);
  const handleCloseRemove = () => setOpenRemove(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setSnackbarMessage('Sign out successful!');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
    } catch (error) {
      console.error('Error signing out:', error);
      setSnackbarMessage(error.message);
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleRequestSort = (property) => {
    const isAscending = orderBy === property && order === 'asc';
    setOrder(isAscending ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedFilteredInventory = inventory
    .filter((item) => item.name.includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (order === 'asc') {
        return a[orderBy] > b[orderBy] ? 1 : -1;
      } else {
        return a[orderBy] < b[orderBy] ? 1 : -1;
      }
    });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box width="100vw" height="100vh" bgcolor="#FFD1DC" display="flex" flexDirection="column" alignItems="center" justifyContent="center">
        {!user ? (
          <Box display="flex" flexDirection="column" alignItems="center" p={4}>
            <Typography variant="h2" sx={{ color: '#BC1456', fontWeight: 700 }} mb={2} textAlign="center">
              Welcome to Pantry
            </Typography>
            <Auth onUserChange={(user) => user && updateInventory(user.uid)} />
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" alignItems="center" gap={2} p={2}>
            <Stack direction="row" spacing={2}>
              <Button variant="contained" onClick={handleSignOut}>
                Sign Out
              </Button>
              <Button variant="contained" onClick={handleOpenAdd}>
                Add New Item
              </Button>
              <Button variant="contained" onClick={handleOpenRemove}>
                Remove Item
              </Button>
            </Stack>
            <Modal
              open={openAdd}
              onClose={handleCloseAdd}
              aria-labelledby="modal-modal-title"
              aria-describedby="modal-modal-description"
            >
              <Box sx={modalStyle}>
                <Typography id="modal-modal-title" variant="h6" sx={{ color: '#BC1456', fontWeight: 700 }} component="h2">
                  Add Item
                </Typography>
                <Stack width="100%" direction="row" spacing={2}>
                  <TextField
                    id="outlined-basic"
                    label="Item"
                    variant="outlined"
                    fullWidth
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                  />
                  <TextField
                    id="outlined-basic"
                    label="Quantity"
                    type="number"
                    variant="outlined"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                  />
                  <Button
                    variant="contained"
                    onClick={() => {
                      addItem(itemName, quantity);
                      setItemName('');
                      setQuantity(1);
                      handleCloseAdd();
                    }}
                  >
                    Add
                  </Button>
                </Stack>
              </Box>
            </Modal>
            <Modal
              open={openRemove}
              onClose={handleCloseRemove}
              aria-labelledby="modal-modal-title"
              aria-describedby="modal-modal-description"
            >
              <Box sx={modalStyle}>
                <Typography id="modal-modal-title" variant="h6" sx={{ color: '#BC1456', fontWeight: 700 }} component="h2">
                  Remove Item
                </Typography>
                <Stack width="100%" direction="row" spacing={2}>
                  <TextField
                    id="outlined-basic"
                    label="Item"
                    variant="outlined"
                    fullWidth
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                  />
                  <TextField
                    id="outlined-basic"
                    label="Quantity"
                    type="number"
                    variant="outlined"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                  />
                  <Button
                    variant="contained"
                    onClick={() => {
                      removeItem(itemName, quantity);
                      setItemName('');
                      setQuantity(1);
                      handleCloseRemove();
                    }}
                  >
                    Remove
                  </Button>
                </Stack>
              </Box>
            </Modal>
            <Box
              sx={{
                width: '80%',
                maxWidth: 800,
                padding: 2,
                backgroundColor: '#FFD1DC',
                border: '2px solid #D14469',
                borderRadius: '20px',
                boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Typography variant="h5" sx={{ color: '#BC1456', fontWeight: 700 }}>
                Inventory Items
              </Typography>
              <InputBase
                placeholder="Search items..."
                value={searchTerm}
                onChange={handleSearch}
                sx={{
                  bgcolor: '#F0F0F0',
                  borderRadius: 2,
                  p: 1,
                  width: '200px',
                  boxShadow: '0 0 5px rgba(0,0,0,0.1)',
                }}
              />
              <Box sx={{ width: '100%' }}>
                {sortedFilteredInventory.map(({ name, quantity }) => (
                  <Paper key={name} sx={itemBoxStyle}>
                    <Typography sx={{ fontFamily: 'Raleway, sans-serif' }}>
                      {name.charAt(0).toUpperCase() + name.slice(1)}
                    </Typography>
                    <Typography sx={{ fontFamily: 'Raleway, sans-serif' }}>{quantity}</Typography>
                    <Box>
                      <IconButton onClick={() => removeItem(name, 1)}>
                        <Remove sx={{ color: '#BC1456' }} />
                      </IconButton>
                      <IconButton onClick={() => addItem(name, 1)}>
                        <Add sx={{ color: '#BC1456' }} />
                      </IconButton>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Box>
          </Box>
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
