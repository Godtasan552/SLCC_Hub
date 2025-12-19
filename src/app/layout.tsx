import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import AuthProvider from '@/components/AuthProvider';
import { ThemeProvider } from '@/contexts/ThemeContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="vh-100 d-flex flex-column overflow-hidden">
        <ThemeProvider>
          <AuthProvider>
            <Navbar />
            <div className="d-flex flex-grow-1 overflow-hidden">
              <Sidebar />
              <main className="flex-grow-1 p-4 overflow-auto" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                {children}
              </main>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}