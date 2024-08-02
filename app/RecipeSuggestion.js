'use client';

import { Button } from '@mui/material';
import { useRouter } from 'next/navigation';

const RecipeSuggestion = ({ inventory }) => {
  const router = useRouter();

  const handleSuggestRecipe = () => {
    if (inventory && inventory.length > 0) {
      localStorage.setItem('inventory', JSON.stringify(inventory));
      console.log('Saved inventory:', JSON.stringify(inventory)); // Debugging line
      router.push('/recipe-suggestions');
    } else {
      alert('No inventory items to suggest recipes for.');
    }
  };

  return (
    <Button variant="contained" onClick={handleSuggestRecipe}>
      Suggest Recipe
    </Button>
  );
};

export default RecipeSuggestion;
