import Link from 'next/link';
import { getServerSession } from 'next-auth';

export default async function Navbar() {
  const session = await getServerSession();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
      <div className="container">
        <Link href="/" className="navbar-brand">
          ศูนย์ข้อมูลผู้อพยพ
        </Link>

        <div className="navbar-nav ms-auto">
          {session ? (
            <>
              <span className="nav-link text-white">
                ยินดีต้อนรับ, {session.user?.name}
              </span>
              <Link
                href="/api/auth/signout"
                className="btn btn-outline-light btn-sm ms-2"
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
