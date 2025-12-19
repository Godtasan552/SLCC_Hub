import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="vh-100 d-flex flex-column overflow-hidden">
        <Navbar />
        <div className="d-flex flex-grow-1 overflow-hidden">
          <Sidebar />
          <main className="flex-grow-1 p-4 bg-dark text-light overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}