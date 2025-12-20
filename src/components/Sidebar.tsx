'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: 'รายการศูนย์พักพิง', href: '/', icon: 'bi-table' },
    { name: 'แดชบอร์ด & รายงาน', href: '/dashboard', icon: 'bi-speedometer2' },
    { name: 'รายการร้องขอทรัพยากร', href: '/requests', icon: 'bi-box-seam' },
    { name: 'สรุปรายการจัดส่ง (ด่วน)', href: '/requests/summary', icon: 'bi-truck' },
    { name: 'จัดการข้อมูล (Import)', href: '/admin/import', icon: 'bi-cloud-upload' },
    { name: 'แผนที่ศูนย์พักพิง', href: '/map', icon: 'bi-map' },
    { name: 'ตั้งค่าระบบ', href: '#', icon: 'bi-gear' },
  ];

  return (
    <div className="d-flex flex-column flex-shrink-0 p-3 text-theme border-end border-theme overflow-y-auto bg-dark-theme" style={{ width: '280px', height: '100%' }}>
      <ul className="nav nav-pills flex-column mb-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li className="nav-item mb-2" key={item.name}>
              <Link 
                href={item.href} 
                className={`nav-link d-flex align-items-center ${isActive ? 'active' : 'text-theme'}`}
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
        <div className="text-theme-secondary small text-center">
          &copy; 2025 SLCC Hub
        </div>
      </div>
    </div>
  );
}
