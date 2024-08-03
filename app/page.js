// Path: app/page.js

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Stack, Typography, Button, Modal, TextField, IconButton, Snackbar, Alert, InputBase, Paper, Grid
} from '@mui/material';
import { firestore, auth, storage } from '@/firebase';
import { collection, getDocs, writeBatch, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Add, Remove, CameraAlt as CameraAltIcon } from '@mui/icons-material';
import Auth from './auth';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

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
            borderColor: '#D14469',
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
  width: 400,
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

const FOOD_ITEMS = [
  'apple', 'banana', 'orange', 'bread', 'carrot', 'pizza', 'burger', 'cake', 'sandwich', 'salad', 'egg', 'chicken',
  // Add more known food items here...
];

const openRouterAPIKey = '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';
const openRouterModelURL = 'https://openrouter.ai/api/v1/chat/completions';

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
  const [capturedImage, setCapturedImage] = useState(null);
  const [classificationResult, setClassificationResult] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelError, setModelError] = useState(null);
  const [recommendedRecipes, setRecommendedRecipes] = useState([]);

  const webcamRef = useRef(null);
  const modelRef = useRef(null);

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadInventory(currentUser.uid);
      }
    });

    // Load the MobileNet model
    loadModel();
  }, []);

  const loadModel = async () => {
    setIsModelLoading(true);
    try {
      const model = await mobilenet.load();
      modelRef.current = model;
      setIsModelLoading(false);
      console.log('Model loaded successfully');
    } catch (error) {
      console.error('Failed to load model:', error);
      setModelError('Model not found or failed to load');
      setIsModelLoading(false);
    }
  };

  const loadInventory = useCallback(async (userId) => {
    const snapshot = await getDocs(collection(firestore, `users/${userId}/inventory`));
    const inventoryList = [];
    snapshot.forEach((doc) => {
      inventoryList.push({ name: doc.id, ...doc.data() });
    });
    setInventory(inventoryList.filter(item => !item.imageName));
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
    setInventory(localInventory.filter(item => item.quantity > 0 && !item.imageName));
    setSnackbarMessage('Inventory synced successfully!');
    setSnackbarSeverity('success');
    setOpenSnackbar(true);
  }, [localInventory, user]);

  const addItem = (item, qty) => {
    setLocalInventory((prevInventory) => {
      const existingItem = prevInventory.find(i => i.name === item);
      if (existingItem) {
        return prevInventory.map(i => i.name === item ? { ...i, quantity: i.quantity + qty } : i);
      } else {
        return [...prevInventory, { name: item, quantity: qty }];
      }
    });
  };

  const removeItem = (item, qty) => {
    setLocalInventory((prevInventory) => {
      return prevInventory.map(i => 
        i.name === item ? { ...i, quantity: Math.max(0, i.quantity - qty) } : i
      );
    });
  };

  const handleOpenAdd = () => setOpenAdd(true);
  const handleCloseAdd = () => setOpenAdd(false);

  const handleOpenRemove = () => setOpenRemove(true);
  const handleCloseRemove = () => setOpenRemove(false);

  const handleOpenScan = () => setOpenScan(true);
  const handleCloseScan = () => setOpenScan(false);

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

  const handleCapture = async () => {
    if (!modelRef.current) {
      setSnackbarMessage('Model not loaded yet. Please wait.');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
      return;
    }

    if (webcamRef.current) {
      try {
        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
          throw new Error('Unable to capture image');
        }
        setCapturedImage(imageSrc);
        console.log('Captured Image:', imageSrc);

        const imageName = `images/${Date.now()}.jpg`;
        const storageRef = ref(storage, imageName);
        await uploadString(storageRef, imageSrc, 'data_url');
        const downloadURL = await getDownloadURL(storageRef);

        console.log('Image uploaded to Firebase Storage:', downloadURL);

        // Classify the image using MobileNet
        const classificationResult = await classifyImageMobileNet(imageSrc);
        console.log('Classification Result:', classificationResult);
        setClassificationResult(classificationResult);

        // Store the classification result in Firestore
        await storeClassificationResult(imageName, classificationResult);

        setSnackbarMessage('Image uploaded and classified successfully!');
        setSnackbarSeverity('success');
        setOpenSnackbar(true);
      } catch (error) {
        console.error('Error capturing or uploading image:', error);
        setSnackbarMessage(`Error capturing or uploading image: ${error.message}. Please try again.`);
        setSnackbarSeverity('error');
        setOpenSnackbar(true);
      }
    } else {
      console.error('No camera device accessible.');
      setSnackbarMessage('No camera device accessible. Please connect your camera or try a different browser.');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  const classifyImageMobileNet = async (imageSrc) => {
    const image = new Image();
    image.src = imageSrc;

    return new Promise((resolve, reject) => {
      image.onload = async () => {
        const tensor = tf.browser.fromPixels(image)
          .resizeNearestNeighbor([224, 224])
          .toFloat()
          .expandDims()
          .div(tf.scalar(127.5))
          .sub(tf.scalar(1));

        try {
          const predictions = await modelRef.current.classify(tensor);
          const foodPredictions = predictions.filter(prediction => 
            FOOD_ITEMS.some(food => prediction.className.toLowerCase().includes(food))
          );
          resolve(foodPredictions.length > 0 ? foodPredictions[0] : { className: 'non-food item', probability: 1 });
        } catch (error) {
          reject(error);
        }
      };

      image.onerror = (error) => reject(error);
    });
  };

  const storeClassificationResult = async (imageName, classificationResult) => {
    if (!user) return;

    const docRef = doc(collection(firestore, `users/${user.uid}/classified_images`), uuidv4());
    await setDoc(docRef, {
      imageName,
      classificationResult: classificationResult || { className: 'non-food item', probability: 1 }
    });
  };

  const getRecipeRecommendations = async (inventoryItems) => {
    const prompt = `Given the following ingredients: ${inventoryItems.join(', ')}. Suggest some healthy recipes.`;

    try {
      const response = await fetch(openRouterModelURL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openRouterAPIKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "openai/gpt-3.5-turbo",
          messages: [
            { role: "user", content: prompt }
          ],
        }),
      });

      const data = await response.json();
      if (response.ok) {
        return data.choices[0].message.content.trim().split('\n');
      } else {
        console.error('Error getting recipe recommendations:', data);
        throw new Error(data.error.message || 'Failed to get recipe recommendations');
      }
    } catch (error) {
      console.error('Error getting recipe recommendations:', error);
      throw error;
    }
  };

  const handleGetRecipes = async () => {
    const inventoryItems = localInventory.map(item => item.name);
    try {
      const recipes = await getRecipeRecommendations(inventoryItems);
      setRecommendedRecipes(recipes);
    } catch (error) {
      console.error('Error getting recipes:', error);
      setSnackbarMessage('Failed to get recipe recommendations');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  };

  const sortedFilteredInventory = localInventory
    .filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()) && !item.imageName)
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
              <Button variant="contained" startIcon={<CameraAltIcon />} onClick={handleOpenScan}>
                Scan Items
              </Button>
              <Button variant="contained" onClick={handleGetRecipes}>
                Get Recipes
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
              aria-labelledby="modal-scan-title"
              aria-describedby="modal-scan-description"
            >
              <Box sx={modalStyle}>
                <Typography id="modal-scan-title" variant="h6" sx={{ color: '#BC1456', fontWeight: 700 }} component="h2">
                  Scan Item
                </Typography>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  width="100%"
                />
                <Box display="flex" justifyContent="flex-end" gap={1}>
                  <Button onClick={handleCloseScan}>Cancel</Button>
                  <Button onClick={handleCapture} variant="contained">Capture</Button>
                </Box>
                {isModelLoading ? (
                  <Typography>Loading model, please wait...</Typography>
                ) : (
                  classificationResult && (
                    <Box mt={2}>
                      <Typography variant="h6">Classification Result:</Typography>
                      <Typography>{classificationResult.className}: {(classificationResult.probability * 100).toFixed(2)}%</Typography>
                    </Box>
                  )
                )}
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
              <Box
                sx={{
                  width: '100%',
                  padding: 2,
                  backgroundColor: '#FFD1DC',
                  border: '2px solid #D14469',
                  borderRadius: '20px',
                  boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  marginTop: 2,
                }}
              >
                <Typography variant="h5" sx={{ color: '#BC1456', fontWeight: 700 }}>
                  Recommended Recipes
                </Typography>
                {recommendedRecipes.length > 0 ? (
                  recommendedRecipes.map((recipe, index) => (
                    <Typography key={index} sx={{ fontFamily: 'Raleway, sans-serif' }}>
                      {recipe}
                    </Typography>
                  ))
                ) : (
                  <Typography sx={{ fontFamily: 'Raleway, sans-serif' }}>
                    No recipes to display.
                  </Typography>
                )}
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
