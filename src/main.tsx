import { createRoot } from 'react-dom/client';
import { AppRouter } from './app/router';
import { AuthProvider } from './features/auth/hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { ToastProvider } from './hooks/useToast';
import { QueryProvider } from './hooks/useQueryClient';
import './styles/globals.css';

function App() {
  return (
    <QueryProvider>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<App />);