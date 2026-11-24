import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata = { title: 'TriageSync', description: 'Support triage and resource-slot scheduling' };
export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
