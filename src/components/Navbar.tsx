'use client';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import ThemeToggle from './ThemeToggle';

import { useSidebar } from '@/contexts/SidebarContext';

export default function Navbar() {
  const { data: session } = useSession();
  const { toggleSidebar } = useSidebar();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark-theme border-bottom border-theme">
      <div className="container-fluid px-3 px-md-4">
        <div className="d-flex align-items-center">
          <button 
            className="btn btn-link text-theme d-lg-none me-2 p-0" 
            onClick={toggleSidebar}
            aria-label="Toggle Sidebar"
          >
            <i className="bi bi-list fs-3"></i>
          </button>
          <Link href="/" className="navbar-brand text-theme fw-bold">
            SLCC Hub
          </Link>
        </div>

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
