'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useSidebar } from '@/contexts/SidebarContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { isOpen, closeSidebar } = useSidebar();

  const menuItems = [
    { name: 'รายการศูนย์พักพิง', href: '/', icon: 'bi-table' },
    { name: 'แดชบอร์ด & รายงาน', href: '/dashboard', icon: 'bi-speedometer2' },
    { name: 'รายการร้องขอทรัพยากร', href: '/requests', icon: 'bi-box-seam' },
    { name: 'สรุปรายการจัดส่ง (ด่วน)', href: '/requests/summary', icon: 'bi-truck' },
    { name: 'จัดการข้อมูล (Import)', href: '/admin/import', icon: 'bi-cloud-upload' },
    { name: 'จัดการสิ่งของ (Import)', href: '/admin/supplies', icon: 'bi-box2' },
    { name: 'ตั้งค่าระบบ', href: '#', icon: 'bi-gear' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="position-fixed top-0 start-0 w-100 vh-100 bg-dark opacity-50 d-lg-none" 
          style={{ zIndex: 1040 }}
          onClick={closeSidebar}
        ></div>
      )}

      <div 
        className={`d-flex flex-column flex-shrink-0 p-3 text-theme border-end border-theme overflow-y-auto bg-dark-theme sidebar-container ${isOpen ? 'show' : ''}`} 
        style={{ zIndex: 1050 }}
      >
        <div className="d-flex justify-content-between align-items-center mb-4 d-lg-none">
          <span className="fw-bold fs-5">เมนู</span>
          <button className="btn btn-link text-theme p-0" onClick={closeSidebar}>
            <i className="bi bi-x-lg fs-3"></i>
          </button>
        </div>
        <ul className="nav nav-pills flex-column mb-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li className="nav-item mb-2" key={item.name}>
                <Link 
                  href={item.href} 
                  className={`nav-link d-flex align-items-center ${isActive ? 'active' : 'text-theme'}`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => closeSidebar()}
                >
                  <i className={`bi ${item.icon} me-3 fs-5`}></i>
                  <span className="sidebar-text">{item.name}</span>
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
    </>
  );
}
