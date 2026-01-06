'use client';
import { Stats } from "@/types/shelter";

interface StatsGridProps {
  stats: Stats;
}

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="row g-3 mb-4">
      <div className="col-12 col-sm-6 col-lg-3">
        <div className="card h-100 border-0 shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderLeft: '5px solid #0d6efd', borderRadius: '12px' }}>
          <div className="card-body p-3 p-md-4 position-relative">
            <div className="d-flex align-items-center mb-2">
                <div className="p-2 rounded-circle bg-primary bg-opacity-10 me-3">
                    <i className="bi bi-house-door-fill text-primary" style={{ fontSize: '1.2rem' }}></i>
                </div>
                <div className="fw-bold text-theme-secondary" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>จำนวนศูนย์ทั้งหมด</div>
            </div>
            <h2 className="mb-0 fw-bold text-theme ps-2" style={{ fontSize: '1.8rem' }}>{stats.totalShelters.toLocaleString()} <small className="fs-6 fw-normal text-theme-secondary opacity-75">แห่ง</small></h2>
          </div>
        </div>
      </div>
      <div className="col-12 col-sm-6 col-lg-3">
        <div className="card h-100 border-0 shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderLeft: '5px solid #dc3545', borderRadius: '12px' }}>
          <div className="card-body p-3 p-md-4 position-relative">
            <div className="d-flex align-items-center mb-2">
                <div className="p-2 rounded-circle bg-danger bg-opacity-10 me-3">
                    <i className="bi bi-exclamation-triangle-fill text-danger" style={{ fontSize: '1.2rem' }}></i>
                </div>
                <div className="fw-bold text-theme-secondary" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>ศูนย์ในสถานะ &quot;ล้น&quot;</div>
            </div>
            <h2 className="mb-0 fw-bold text-theme ps-2" style={{ fontSize: '1.8rem' }}>{stats.criticalShelters} <small className="fs-6 fw-normal text-theme-secondary opacity-75">แห่ง</small></h2>
          </div>
        </div>
      </div>
      <div className="col-12 col-sm-6 col-lg-3">
        <div className="card h-100 border-0 shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderLeft: '5px solid #ffc107', borderRadius: '12px' }}>
          <div className="card-body p-3 p-md-4 position-relative">
            <div className="d-flex align-items-center mb-2">
                <div className="p-2 rounded-circle bg-warning bg-opacity-10 me-3">
                    <i className="bi bi-house-exclamation-fill text-warning" style={{ fontSize: '1.2rem' }}></i>
                </div>
                <div className="fw-bold text-theme-secondary" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>ศูนย์ที่ &quot;ใกล้เต็ม&quot;</div>
            </div>
            <h2 className="mb-0 fw-bold text-theme ps-2" style={{ fontSize: '1.8rem' }}>{stats.warningShelters} <small className="fs-6 fw-normal text-theme-secondary opacity-75">แห่ง</small></h2>
          </div>
        </div>
      </div>
      <div className="col-12 col-sm-6 col-lg-3">
        <div className="card h-100 border-0 shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderLeft: '5px solid #0dcaf0', borderRadius: '12px' }}>
          <div className="card-body p-3 p-md-4 position-relative">
             <div className="d-flex align-items-center mb-2">
                <div className="p-2 rounded-circle bg-info bg-opacity-10 me-3">
                    <i className="bi bi-box-seam-fill text-info" style={{ fontSize: '1.2rem' }}></i>
                </div>
                <div className="fw-bold text-theme-secondary" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>คำร้องขอทรัพยากร</div>
            </div>
            <h2 className="mb-0 fw-bold text-theme ps-2" style={{ fontSize: '1.8rem' }}>{stats.totalResourceRequests} <small className="fs-6 fw-normal text-theme-secondary opacity-75">รายการ</small></h2>
          </div>
        </div>
      </div>
    </div>
  );
}
