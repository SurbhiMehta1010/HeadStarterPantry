'use client'

import { useState, useEffect } from 'react';
import { Box, Stack, Typography, Button, Modal, TextField, IconButton, Snackbar, Alert, InputBase, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TableSortLabel } from '@mui/material';
import { firestore, auth } from '@/firebase';
import { collection, doc, getDocs, query, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Add, Remove } from '@mui/icons-material';
import Auth from './auth';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'white',
  border: '2px solid #BC1456',
  boxShadow: 24,
  p: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
};

export default function Home() {
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
    <Box>
      {!user ? (
        <Box
          width="100vw"
          height="100vh"
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          bgcolor="#FFA2BB"
          p={4}
        >
          <Typography variant="h2" color="#BC1456" mb={2} textAlign="center">
            Welcome to Your Cute Pantry
          </Typography>
          <Typography variant="h6" color="white" mb={4} textAlign="center">
            Manage your inventory with ease and style!
          </Typography>
          <Auth onUserChange={(user) => user && updateInventory(user.uid)} />
        </Box>
      ) : (
        <Box
          width="100vw"
          height="100vh"
          display="flex"
          flexDirection="column"
          alignItems="center"
          gap={2}
          bgcolor="#FFA2BB"
          p={2}
        >
          <Button variant="contained" sx={{ bgcolor: '#BC1456', color: 'white', marginBottom: 2 }} onClick={handleSignOut}>
            Sign Out
          </Button>
          <Button variant="contained" sx={{ bgcolor: '#BC1456', color: 'white' }} onClick={handleOpenAdd}>
            Add New Item
          </Button>
          <Button variant="contained" sx={{ bgcolor: '#BC1456', color: 'white', marginBottom: 2 }} onClick={handleOpenRemove}>
            Remove Item
          </Button>
          <Modal
            open={openAdd}
            onClose={handleCloseAdd}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
          >
            <Box sx={style}>
              <Typography id="modal-modal-title" variant="h6" component="h2">
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
                  variant="outlined"
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
            <Box sx={style}>
              <Typography id="modal-modal-title" variant="h6" component="h2">
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
                  variant="outlined"
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
            width="800px"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
            bgcolor="white"
            p={1}
            borderRadius={2}
          >
            <Typography variant="h5" color="#BC1456">
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
          </Box>
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'name'}
                      direction={orderBy === 'name' ? order : 'asc'}
                      onClick={() => handleRequestSort('name')}
                    >
                      Item
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel
                      active={orderBy === 'quantity'}
                      direction={orderBy === 'quantity' ? order : 'asc'}
                      onClick={() => handleRequestSort('quantity')}
                    >
                      Quantity
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedFilteredInventory.map(({ name, quantity }) => (
                  <TableRow key={name}>
                    <TableCell component="th" scope="row">
                      {name.charAt(0).toUpperCase() + name.slice(1)}
                    </TableCell>
                    <TableCell align="right">{quantity}</TableCell>
                    <TableCell align="center">
                      <IconButton color="primary" onClick={() => removeItem(name, 1)}>
                        <Remove />
                      </IconButton>
                      <IconButton color="primary" onClick={() => addItem(name, 1)}>
                        <Add />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
      <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
