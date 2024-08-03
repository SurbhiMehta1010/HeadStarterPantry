'use client';

import { useState } from 'react';
import { storage } from '@/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Box, Button, Typography } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

const theme = createTheme({
  typography: {
    fontFamily: 'Raleway, sans-serif',
  },
});

const ImageUpload = () => {
  const [image, setImage] = useState(null);
  const [url, setUrl] = useState('');

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    const storageRef = ref(storage, `images/${image.name}`);
    uploadBytes(storageRef, image).then((snapshot) => {
      getDownloadURL(snapshot.ref).then((downloadURL) => {
        setUrl(downloadURL);
        console.log('File available at', downloadURL);
      });
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
        <Typography variant="h6" sx={{ color: '#BC1456', fontWeight: 700 }}>
          Upload an Image
        </Typography>
        <input type="file" onChange={handleImageChange} />
        <Button variant="contained" onClick={handleUpload}>
          Upload
        </Button>
        {url && <img src={url} alt="Uploaded" style={{ marginTop: '10px', maxWidth: '100%' }} />}
      </Box>
    </ThemeProvider>
  );
};

export default ImageUpload;
