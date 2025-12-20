'use client';
import { useState } from 'react';
import { Shelter } from "@/types/shelter";

interface CriticalSheltersProps {
  shelters: Shelter[];
}

const ITEMS_PER_PAGE = 6;

export default function CriticalShelters({ shelters }: CriticalSheltersProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const criticalList = shelters.filter(s => s.capacityStatus === 'ล้นศูนย์');
  
  const totalPages = Math.ceil(criticalList.length / ITEMS_PER_PAGE);
  const displayedList = criticalList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (criticalList.length === 0) return null;

  return (
    <div className="mb-5">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <div className="pulse-red-dot"></div>
          <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>
            🚨 ศูนย์ที่ต้องการความช่วยเหลือเร่งด่วน (Critical Hubs: {criticalList.length})
          </h5>
        </div>
      </div>

      <div className="row g-3 mb-4">
        {displayedList.map((s) => {
          const occupancyRate = (s.currentOccupancy / (s.capacity || 1)) * 100;
          return (
            <div className="col-12 col-md-6 col-lg-4" key={s._id}>
              <div className="card h-100 border-0 shadow-sm tactical-card overflow-hidden">
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="badge bg-danger bg-opacity-75 text-white" style={{ fontSize: '0.7rem' }}>
                      วิกฤต: {occupancyRate.toFixed(0)}%
                    </span>
                    <small className="text-secondary font-monospace" style={{ fontSize: '0.7rem' }}>
                      #{s._id.slice(-5)}
                    </small>
                  </div>
                  
                  <h6 className="fw-bold mb-1 text-truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</h6>
                  <p className="text-secondary small mb-3 text-truncate">
                    <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                    อ.{s.district} ต.{s.subdistrict}
                  </p>

                  <div className="d-flex gap-2">
                    <a 
                      href={`tel:${s.phoneNumbers?.[0] || ''}`} 
                      className={`btn btn-sm flex-grow-1 d-flex align-items-center justify-content-center gap-1 ${s.phoneNumbers?.[0] ? 'btn-outline-danger' : 'btn-light disabled text-muted'}`}
                    >
                      <i className="bi bi-telephone-fill"></i>
                      {s.phoneNumbers?.[0] || 'ไม่มีเบอร์'}
                    </a>
                    <button className="btn btn-sm btn-outline-info px-3">
                      <i className="bi bi-geo-alt"></i>
                    </button>
                  </div>
                </div>
                {/* Subtle border at the bottom */}
                <div className="progress" style={{ height: '3px', borderRadius: '0' }}>
                  <div className="progress-bar bg-danger" style={{ width: `${Math.min(occupancyRate, 100)}%` }}></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="d-flex justify-content-center align-items-center gap-3">
          <button 
            className="btn btn-sm btn-outline-secondary rounded-pill px-3"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <i className="bi bi-chevron-left me-1"></i> ก่อนหน้า
          </button>
          
          <div className="small fw-bold text-secondary">
            หน้า {currentPage} จาก {totalPages}
          </div>

          <button 
            className="btn btn-sm btn-outline-secondary rounded-pill px-3"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            ต่อไป <i className="bi bi-chevron-right ms-1"></i>
          </button>
        </div>
      )}

      <style jsx>{`
        .tactical-card {
           background: var(--bg-card);
           border: 1px solid rgba(220, 53, 69, 0.1) !important;
           transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .tactical-card:hover {
           transform: translateY(-4px);
           box-shadow: 0 10px 20px rgba(220, 53, 69, 0.1) !important;
           border-color: rgba(220, 53, 69, 0.3) !important;
        }
        .pulse-red-dot {
          width: 10px;
          height: 10px;
          background-color: #dc3545;
          border-radius: 50%;
          box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7);
          animation: pulse-red 2s infinite;
        }
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(220, 53, 69, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
        }
      `}</style>
    </div>
  );
}
