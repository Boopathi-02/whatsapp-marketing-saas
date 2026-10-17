import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from '../lib/queryClient.js';
import { ThemeModeProvider } from '../hooks/useThemeMode.js';
import { AuthProvider } from '../features/auth/AuthContext.js';
import { router } from './router.js';

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ThemeModeProvider>
    </QueryClientProvider>
  );
};

export default App;
