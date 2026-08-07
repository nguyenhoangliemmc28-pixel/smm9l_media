import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/lib/toast';
import App from '@/App';

export default function Root() {
  return (
    <ToastProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ToastProvider>
  );
}
