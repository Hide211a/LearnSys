import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { ukUA } from '@mui/material/locale';
import App from './App';
import './print.css';
import './responsive.css';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

const theme = createTheme(
  {
    palette: {
      primary: { main: '#1565c0' },
      secondary: { main: '#f9a825' },
      background: { default: '#f5f7fa' },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h3: {
        fontSize: '2rem',
        '@media (max-width:600px)': { fontSize: '1.5rem' },
      },
      h4: {
        fontSize: '1.75rem',
        '@media (max-width:600px)': { fontSize: '1.25rem' },
      },
      h5: {
        fontSize: '1.25rem',
        '@media (max-width:600px)': { fontSize: '1.1rem' },
      },
      h6: {
        fontSize: '1.1rem',
        '@media (max-width:600px)': { fontSize: '1rem' },
      },
    },
    components: {
      MuiToolbar: {
        styleOverrides: {
          root: {
            '@media (max-width:600px)': {
              paddingLeft: 8,
              paddingRight: 8,
              gap: 4,
            },
          },
        },
      },
      MuiTabs: {
        defaultProps: {
          variant: 'scrollable',
          scrollButtons: 'auto',
          allowScrollButtonsMobile: true,
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            '@media (max-width:600px)': {
              margin: 12,
              width: 'calc(100% - 24px)',
              maxWidth: 'calc(100% - 24px) !important',
            },
          },
        },
      },
    },
  },
  ukUA
);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);
