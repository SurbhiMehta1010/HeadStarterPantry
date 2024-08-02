'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Stack, Typography, Button, Modal, TextField, IconButton, Snackbar, Alert, InputBase, Paper, Grid, CircularProgress
} from '@mui/material';
import { firestore, auth, storage } from '@/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Add, Remove } from '@mui/icons-material';
import { Camera } from 'react-camera-pro';
import * as mobilenet from '@tensorflow-models/mobilenet';
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

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: 400,
  bgcolor: 'white',
  boxShadow: 24,
  p: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  borderRadius: '20px',
  border: '2px solid #D14469',
};

const itemBoxStyle = {
  padding: 2,
  backgroundColor: '#FFD1DC',
  border: '2px solid #D14469',
  borderRadius: '20px',
  boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const itemContentStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
  gap: 1,
};

export default function Page() {
  const [inventory, setInventory] = useState([]);
  const [localInventory, setLocalInventory] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [openRemove, setOpenRemove] = useState(false);
  const [openScan, setOpenScan] = useState(false);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [user, setUser] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [searchTerm, setSearchTerm] = useState('');
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('name');
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadInventory(currentUser.uid);
      }
    });
  }, []);

  const loadInventory = useCallback(async (userId) => {
    const snapshot = await getDocs(collection(firestore, `users/${userId}/inventory`));
    const inventoryList = [];
    snapshot.forEach((doc) => {
      inventoryList.push({ name: doc.id, ...doc.data() });
    });
    setInventory(inventoryList);
    setLocalInventory(inventoryList);
  }, []);

  const syncInventory = useCallback(async () => {
    if (!user) return;
    const batch = writeBatch(firestore);
    localInventory.forEach(item => {
      const docRef = doc(collection(firestore, `users/${user.uid}/inventory`), item.name);
      if (item.quantity > 0) {
        batch.set(docRef, { quantity: item.quantity });
      } else {
        batch.delete(docRef);
      }
    });
    await batch.commit();
    setSnackbarMessage('Inventory synced successfully!');
    setSnackbarSeverity('success');
    setOpenSnackbar(true);
  }, [localInventory, user]);

  const addItem = (item, qty) => {
    setLocalInventory((prevInventory) => {
      const updatedInventory = prevInventory.map(i => i.name === item ? { ...i, quantity: i.quantity + qty } : i);
      if (!updatedInventory.find(i => i.name === item)) {
        updatedInventory.push({ name: item, quantity: qty });
      }
      return updatedInventory;
    });
  };

  const removeItem = (item, qty) => {
    setLocalInventory((prevInventory) => {
      const updatedInventory = prevInventory.map(i => i.name === item ? { ...i, quantity: Math.max(0, i.quantity - qty) } : i);
      return updatedInventory.filter(i => i.quantity > 0);
    });
  };

  const handleOpenAdd = () => setOpenAdd(true);
  const handleCloseAdd = () => setOpenAdd(false);

  const handleOpenRemove = () => setOpenRemove(true);
  const handleCloseRemove = () => setOpenRemove(false);

  const handleOpenScan = () => setOpenScan(true);
  const handleCloseScan = () => setOpenScan(false);

  const handleCapture = async () => {
    if (cameraRef.current) {
      try {
        const imageSrc = cameraRef.current.takePhoto();
        console.log('Captured Image:', imageSrc);

        const storageRef = ref(storage, `images/${Date.now()}.jpg`);
        await uploadString(storageRef, imageSrc, 'data_url');
        const downloadURL = await getDownloadURL(storageRef);

        console.log('Image uploaded to Firebase Storage:', downloadURL);

        // Load and classify image
        setLoading(true);
        const model = await mobilenet.load();
        const img = new Image();
        img.src = imageSrc;
        img.onload = async () => {
          const predictions = await model.classify(img);
          const predictedItem = predictions[0]?.className || 'Unknown';
          setLoading(false);
          setSnackbarMessage(`Image classified as: ${predictedItem}`);
          setSnackbarSeverity('success');
          setOpenSnackbar(true);
          addItem(predictedItem.toLowerCase(), 1);  // Add the classified item to the inventory
        };
      } catch (error) {
        console.error('Error capturing or uploading image:', error);
        setSnackbarMessage('Error capturing or uploading image. Please try again.');
        setSnackbarSeverity('error');
        setOpenSnackbar(true);
        setLoading(false);
      }
    } else {
      console.error('No camera device accessible.');
      setSnackbarMessage('No camera device accessible. Please connect your camera or try a different browser.');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

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

  const sortedFilteredInventory = localInventory
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
            <Auth onUserChange={(user) => user && loadInventory(user.uid)} />
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" alignItems="center" gap={2} p={2} width="90%" height="100%">
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
              <Button variant="contained" onClick={syncInventory}>
                Save Changes
              </Button>
              <Button variant="contained" onClick={handleOpenScan}>
                Scan Items
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
                <Stack direction="row" spacing={2}>
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
                </Stack>
                <Button
                  variant="contained"
                  onClick={() => {
                    addItem(itemName, quantity);
                    setItemName('');
                    setQuantity(1);
                    handleCloseAdd();
                  }}
                  sx={{ mt: 2 }}
                >
                  Add
                </Button>
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
                <Stack direction="row" spacing={2}>
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
                </Stack>
                <Button
                  variant="contained"
                  onClick={() => {
                    removeItem(itemName, quantity);
                    setItemName('');
                    setQuantity(1);
                    handleCloseRemove();
                  }}
                  sx={{ mt: 2 }}
                >
                  Remove
                </Button>
              </Box>
            </Modal>
            <Modal
              open={openScan}
              onClose={handleCloseScan}
              aria-labelledby="modal-modal-title"
              aria-describedby="modal-modal-description"
            >
              <Box sx={modalStyle}>
                <Typography id="modal-modal-title" variant="h6" sx={{ color: '#BC1456', fontWeight: 700 }} component="h2">
                  Scan Item
                </Typography>
                <Camera ref={cameraRef} facingMode="environment" aspectRatio={16 / 9} />
                <Box display="flex" justifyContent="flex-end" gap={1} mt={2}>
                  <Button onClick={handleCloseScan}>Cancel</Button>
                  <Button variant="contained" onClick={handleCapture} disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : 'Capture'}
                  </Button>
                </Box>
              </Box>
            </Modal>
            <Box
              sx={{
                width: '100%',
                flex: 1,
                overflowY: 'auto',
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
              <Grid container spacing={2}>
                {sortedFilteredInventory.map(({ name, quantity }) => (
                  <Grid item xs={12} sm={6} md={4} key={name}>
                    <Paper sx={{ ...itemBoxStyle, minHeight: '100px' }}>
                      <Box sx={itemContentStyle}>
                        <Typography sx={{ fontFamily: 'Raleway, sans-serif', wordBreak: 'break-word' }}>
                          {name.charAt(0).toUpperCase() + name.slice(1)}
                        </Typography>
                        <Box display="flex" alignItems="center">
                          <IconButton onClick={() => removeItem(name, 1)} size="small">
                            <Remove sx={{ color: '#BC1456' }} />
                          </IconButton>
                          <Typography sx={{ mx: 1, fontFamily: 'Raleway, sans-serif' }}>{quantity}</Typography>
                          <IconButton onClick={() => addItem(name, 1)} size="small">
                            <Add sx={{ color: '#BC1456' }} />
                          </IconButton>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
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
