'use client';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark-theme">
      <div className="container-fluid px-4">
        <Link href="/" className="navbar-brand text-theme">
          SLCC Hub
        </Link>

        <div className="navbar-nav ms-auto d-flex flex-row align-items-center gap-3">
          <ThemeToggle />
          {session ? (
            <>
              <span className="nav-link text-theme mb-0">
                 {session.user?.name}
              </span>
              <Link
                href="/api/auth/signout"
                className="btn btn-outline-danger btn-sm"
              >
                Logout
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="btn btn-primary btn-sm"
            >
              เข้าสู่ระบบ
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
