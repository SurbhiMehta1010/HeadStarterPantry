'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Snackbar, Alert, CircularProgress, Button } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { Configuration, OpenAIApi } from 'openai';
import { useRouter } from 'next/navigation';

const theme = createTheme({
  typography: {
    fontFamily: 'Raleway, sans-serif',
  },
});

const RecipeSuggestions = () => {
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const router = useRouter();

  useEffect(() => {
    const storedInventory = localStorage.getItem('inventory');
    if (storedInventory) {
      try {
        const parsedInventory = JSON.parse(storedInventory);
        if (Array.isArray(parsedInventory)) {
          setInventory(parsedInventory);
          suggestRecipe(parsedInventory);
        } else {
          throw new Error('Invalid inventory format');
        }
      } catch (error) {
        console.error('Error parsing inventory:', error);
        setSnackbarMessage('Error reading inventory data.');
        setSnackbarSeverity('error');
        setOpenSnackbar(true);
        setLoading(false);
      }
    } else {
      setLoading(false);
      setSnackbarMessage('No inventory items found.');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    }
  }, []);

  const suggestRecipe = async (items) => {
    const configuration = new Configuration({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    });
    const openai = new OpenAIApi(configuration);

    const itemNames = items.map(item => item.name).join(', ');
    const prompt = `Given the following pantry items: ${itemNames}, suggest a recipe that can be made using these items.`;

    try {
      const response = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt: prompt,
        max_tokens: 150,
        temperature: 0.7,
      });

      const recipesText = response.data.choices[0].text.trim();
      const recipesList = recipesText.split('\n').filter(recipe => recipe);
      setRecipes(recipesList);
      setLoading(false);
    } catch (error) {
      console.error('Error generating recipe suggestions:', error);
      setSnackbarMessage('Error generating recipe suggestions');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box width="100vw" height="100vh" display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={4}>
        <Typography variant="h2" sx={{ color: '#BC1456', fontWeight: 700 }} mb={2} textAlign="center">
          Recipe Suggestions
        </Typography>
        {loading ? (
          <CircularProgress />
        ) : (
          recipes.map((recipe, index) => (
            <Typography key={index} variant="h6" sx={{ color: '#BC1456', fontWeight: 500, mb: 1 }}>
              {recipe}
            </Typography>
          ))
        )}
        <Button variant="contained" onClick={() => router.push('/')}>
          Go Back
        </Button>
        <Snackbar open={openSnackbar} autoHideDuration={6000} onClose={() => setOpenSnackbar(false)}>
          <Alert onClose={() => setOpenSnackbar(false)} severity={snackbarSeverity}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
};

export default RecipeSuggestions;
