import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="navbar navbar-dark bg-primary mb-4">
      <div className="container">
        <Link href="/" className="navbar-brand">
          Shelter Command Center
        </Link>
      </div>
    </nav>
  );
}
