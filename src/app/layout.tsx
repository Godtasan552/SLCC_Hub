import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import AuthProvider from '@/components/AuthProvider';
import { ThemeProvider } from '@/contexts/ThemeContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './globals.css';

import { SidebarProvider } from '@/contexts/SidebarContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="vh-100 d-flex flex-column overflow-hidden" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <SidebarProvider>
              <Navbar />
              <div className="d-flex flex-grow-1 overflow-hidden position-relative">
                <Sidebar />
                <main className="flex-grow-1 p-3 p-md-4 overflow-auto w-100" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                  {children}
                </main>
              </div>
            </SidebarProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}