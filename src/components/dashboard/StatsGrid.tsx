'use client';
import { Stats } from "@/types/shelter";

interface StatsGridProps {
  stats: Stats;
}

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="row g-3 mb-4">
      <div className="col-12 col-sm-6 col-lg-3">
        <div className="card h-100 border-0 shadow-sm overflow-hidden text-white" style={{ background: 'linear-gradient(45deg, #0d6efd, #0043a8)', borderRadius: '15px' }}>
          <div className="card-body p-3 p-md-4 position-relative">
            <i className="bi bi-house-door-fill position-absolute bottom-0 end-0 opacity-25 me-3 mb-2" style={{ fontSize: '2rem' }}></i>
            <div className="text-white fw-bold mb-1" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>จำนวนศูนย์ทั้งหมด</div>
            <h2 className="mb-0 fw-bold" style={{ fontSize: '1.8rem' }}>{stats.totalShelters.toLocaleString()} <small className="fs-6 fw-normal opacity-75">แห่ง</small></h2>
          </div>
        </div>
      </div>
      <div className="col-12 col-sm-6 col-lg-3">
        <div className="card h-100 border-0 shadow-sm overflow-hidden text-white" style={{ background: 'linear-gradient(45deg, #dc3545, #a71d2a)', borderRadius: '15px' }}>
          <div className="card-body p-3 p-md-4 position-relative">
            <i className="bi bi-exclamation-triangle-fill position-absolute bottom-0 end-0 opacity-25 me-3 mb-2" style={{ fontSize: '2rem' }}></i>
            <div className="text-white fw-bold mb-1" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>ศูนย์ในสถานะ &quot;ล้น&quot;</div>
            <h2 className="mb-0 fw-bold" style={{ fontSize: '1.8rem' }}>{stats.criticalShelters} <small className="fs-6 fw-normal opacity-75">แห่ง</small></h2>
          </div>
        </div>
      </div>
      <div className="col-12 col-sm-6 col-lg-3">
        <div className="card h-100 border-0 shadow-sm overflow-hidden" style={{ background: 'linear-gradient(45deg, #ffc107, #ff8f00)', color: '#212529', borderRadius: '15px' }}>
          <div className="card-body p-3 p-md-4 position-relative">
            <i className="bi bi-house-exclamation-fill position-absolute bottom-0 end-0 opacity-25 me-3 mb-2" style={{ fontSize: '2rem' }}></i>
            <div className="fw-bold mb-1" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>ศูนย์ที่ &quot;ใกล้เต็ม&quot;</div>
            <h2 className="mb-0 fw-bold" style={{ fontSize: '1.8rem' }}>{stats.warningShelters} <small className="fs-6 fw-normal opacity-75">แห่ง</small></h2>
          </div>
        </div>
      </div>
      <div className="col-12 col-sm-6 col-lg-3">
        <div className="card h-100 border-0 shadow-sm overflow-hidden text-white" style={{ background: 'linear-gradient(45deg, #0dcaf0, #00acc1)', borderRadius: '15px' }}>
          <div className="card-body p-3 p-md-4 position-relative">
            <i className="bi bi-box-seam-fill position-absolute bottom-0 end-0 opacity-25 me-3 mb-2" style={{ fontSize: '2rem' }}></i>
            <div className="text-white fw-bold mb-1" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>คำร้องขอทรัพยากร</div>
            <h2 className="mb-0 fw-bold" style={{ fontSize: '1.8rem' }}>{stats.totalResourceRequests} <small className="fs-6 fw-normal opacity-75">รายการ</small></h2>
          </div>
        </div>
      </div>
    </div>
  );
}
