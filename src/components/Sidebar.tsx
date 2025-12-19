'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: 'แดชบอร์ด', href: '/', icon: 'bi-speedometer2' },
    { name: 'จัดการข้อมูล (Import)', href: '/admin/import', icon: 'bi-cloud-upload' },
    { name: 'แผนที่ศูนย์พักพิง', href: '#', icon: 'bi-map' }, // Placeholder
    { name: 'ตั้งค่าระบบ', href: '#', icon: 'bi-gear' },
  ];

  return (
    <div className="d-flex flex-column flex-shrink-0 p-3 text-white border-end border-secondary overflow-y-auto" style={{ width: '280px', height: '100%', backgroundColor: '#16191c' }}>
      <ul className="nav nav-pills flex-column mb-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li className="nav-item mb-2" key={item.name}>
              <Link 
                href={item.href} 
                className={`nav-link d-flex align-items-center ${isActive ? 'active' : 'text-white'}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <i className={`bi ${item.icon} me-3 fs-5`}></i>
                {item.name}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto border-top border-secondary pt-3">
        <div className="text-secondary small text-center">
          &copy; 2025 SLCC Hub
        </div>
      </div>
    </div>
  );
}
