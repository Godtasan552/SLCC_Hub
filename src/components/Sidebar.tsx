'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSidebar } from '@/contexts/SidebarContext';

interface UserWithRole {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { isOpen, closeSidebar } = useSidebar();
  const { data: session } = useSession();
  const role = (session?.user as UserWithRole)?.role;

  const menuGroups = [
    {
      title: 'ศูนย์อำนวยการ',
      icon: 'bi-building',
      items: [
        { name: 'จัดการศูนย์พักพิง', href: '/admin/import', icon: 'bi-list-ul', roles: ['admin', 'staff'] },
        { name: 'เพิ่มศูนย์/คลังใหม่', href: '/admin/centers/create', icon: 'bi-plus-circle', roles: ['admin'] },
        { name: 'ศูนย์บริหารจัดการคลัง', href: '/admin/hubs', icon: 'bi-building-gear', roles: ['admin'] },
        { name: 'จัดการคลังสิ่งของ', href: '/admin/supplies', icon: 'bi-box-seam', roles: ['admin'] },
        { name: 'ส่งออกข้อมูล', href: '/admin/export', icon: 'bi-cloud-download', roles: ['admin'] },
        { name: 'รายการอนุมัติคำขอ', href: '/requests/summary', icon: 'bi-hexagon', roles: ['admin'] },
      ],
    },
    {
      title: 'ศูนย์พักพิง',
      icon: 'bi-hospital',
      items: [
        { name: 'รายชื่อศูนย์', href: '/', icon: 'bi-list-task' },
        { name: 'รายการสิ่งของ', href: '/supplies', icon: 'bi-box' },
        { name: 'สร้างคำร้องขอ', href: '/requests/create', icon: 'bi-plus-square', roles: ['admin', 'staff'] },
        { name: 'คำร้องขอสิ่งของ', href: '/requests', icon: 'bi-folder2-open', roles: ['admin','staff'] },

      ],
    },
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
        className={`d-flex flex-column flex-shrink-0 text-theme border-end border-theme overflow-y-auto bg-dark-theme sidebar-container ${isOpen ? 'show' : ''}`} 
        style={{ zIndex: 1050, padding: 0 }}
      >
        {/* Main Home Button */}
        <div className="p-3">
            <Link 
              href="/dashboard" 
              className={`btn btn-primary w-100 d-flex align-items-center justify-content-start fw-bold shadow-sm ${pathname === '/dashboard' ? 'active' : ''}`}
              style={{ borderRadius: '8px', padding: '10px 15px' }}
              onClick={closeSidebar}
            >
              <i className="bi bi-house-door-fill me-2 fs-5"></i>
              <span>หน้าหลัก</span>
            </Link>
        </div>

        <div className="px-3 pb-3">
          {menuGroups.map((group) => {
            // Filter items based on role
            const visibleItems = group.items.filter(item => {
              if (!item.roles) return true; 
              if (!role) return false; 
              return item.roles.includes(role);
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="mb-3">
                {/* Group Header */}
                <div className="d-flex align-items-center mb-2 px-2" style={{ color: 'var(--text-primary)' }}>
                  <i className={`bi ${group.icon} me-2`}></i>
                  <span className="fw-semibold">{group.title}</span>
                </div>

                {/* Group Items with Left Border Line */}
                <div className="d-flex flex-column" style={{ marginLeft: '11px', borderLeft: '2px solid rgba(128, 128, 128, 0.3)', paddingLeft: '15px' }}>
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link 
                        key={item.name}
                        href={item.href} 
                        className={`d-flex align-items-center mb-2 text-decoration-none ${isActive ? 'text-primary' : 'text-theme-secondary'}`}
                        style={{ padding: '6px 0', fontSize: '0.95rem', transition: 'all 0.2s ease' }}
                        onClick={closeSidebar}
                      >
                        <i className={`bi ${item.icon} me-2 ${isActive ? 'fw-bold' : ''}`} style={{ fontSize: '1.1rem' }}></i>
                        <span className={isActive ? 'fw-bold' : ''}>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-auto border-top border-secondary pt-3 pb-3 px-3 mx-2">
          <div className="text-theme-secondary small text-center">
            &copy; 2025 SLCC Hub
          </div>
        </div>
      </div>
    </>
  );
}
