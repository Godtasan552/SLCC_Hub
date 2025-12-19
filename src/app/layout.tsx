// app/layout.tsx
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <nav className="navbar navbar-dark bg-primary mb-4">
          <div className="container">
            <span className="navbar-brand">Shelter Command Center</span>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}