'use client';
import { Stats } from "@/types/shelter";

interface CapacityOverviewProps {
  stats: Stats;
}

export default function CapacityOverview({ stats }: CapacityOverviewProps) {
  const occupancyRate = (stats.totalOccupancy / (stats.totalCapacity || 1)) * 100;
  const safeRate = 100 - occupancyRate;

  // Chart Logic
  const totalCircumference = 440;
  const strokeDashoffset = totalCircumference - (Math.min(occupancyRate, 100) / 100) * totalCircumference;
  
  let colorClass = '#198754'; 
  if (occupancyRate > 90) colorClass = '#dc3545';
  else if (occupancyRate > 70) colorClass = '#ffc107';

  // Supply Stats
  const totalSupplies = stats.totalSupplies || 0;
  const lowStock = stats.lowStockSupplies || 0;
  const outOfStock = stats.outOfStockSupplies || 0;
  const goodStock = totalSupplies - lowStock - outOfStock;

  const lowRate = totalSupplies > 0 ? (lowStock / totalSupplies) * 100 : 0;
  const outRate = totalSupplies > 0 ? (outOfStock / totalSupplies) * 100 : 0;
  const goodRate = totalSupplies > 0 ? (goodStock / totalSupplies) * 100 : 0;

  return (
    <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px' }}>
      <div className="card-header bg-transparent border-0 pt-4 px-4">
         <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>ภาพรวมสถานะ (Overview)</h5>
         <p className="text-secondary small mb-0">ความหนาแน่นผู้อพยพ และ ความพร้อมด้านทรัพยากร</p>
      </div>
      
      <div className="card-body px-4 py-3">
        <div className="row g-4">
            {/* Left: Occupancy Chart */}
            <div className="col-12 col-md-6 d-flex flex-column align-items-center justify-content-center border-end-md border-secondary border-opacity-10">
                <h6 className="text-secondary fw-bold mb-3 small">ความหนาแน่นศูนย์พักพิง</h6>
                <div className="position-relative d-flex align-items-center justify-content-center" style={{ width: '180px', height: '180px' }}>
                    <svg width="180" height="180" viewBox="0 0 220 220" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="110" cy="110" r="70" fill="none" stroke="var(--bg-secondary)" strokeWidth="20" />
                        <circle cx="110" cy="110" r="70" fill="none" stroke={colorClass} strokeWidth="20"
                                strokeDasharray={totalCircumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
                                style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} />
                    </svg>
                    <div className="position-absolute text-center">
                        <h2 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>{occupancyRate.toFixed(1)}<small className="fs-6">%</small></h2>
                        <span className="badge rounded-pill bg-light text-dark shadow-sm border small">
                            {occupancyRate > 90 ? 'วิกฤต' : occupancyRate > 70 ? 'หนาแน่น' : 'ปกติ'}
                        </span>
                    </div>
                </div>
                <div className="mt-3 text-center small text-secondary">
                    <div>ผู้พักพิง: <span className="fw-bold text-primary">{stats.totalOccupancy.toLocaleString()}</span> คน</div>
                    <div>ความจุ: <span className="text-muted">{stats.totalCapacity.toLocaleString()}</span> ที่นั่ง</div>
                </div>
            </div>

            {/* Right: Supply Overview */}
            <div className="col-12 col-md-6 d-flex flex-column justify-content-center">
                 <h6 className="text-secondary fw-bold mb-3 small">สถานะคลังสิ่งของ ({totalSupplies} รายการ)</h6>
                 
                 {/* Out of Stock */}
                 <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-end mb-1">
                        <span className="small text-danger fw-bold"><i className="bi bi-x-circle-fill me-1"></i>ของหมด</span>
                        <span className="small fw-bold">{outOfStock} รายการ ({outRate.toFixed(0)}%)</span>
                    </div>
                    <div className="progress" style={{ height: '6px', backgroundColor: 'var(--bg-secondary)' }}>
                        <div className="progress-bar bg-danger" style={{ width: `${outRate}%` }}></div>
                    </div>
                 </div>

                 {/* Low Stock */}
                 <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-end mb-1">
                        <span className="small text-warning fw-bold"><i className="bi bi-exclamation-triangle-fill me-1"></i>เหลือน้อย</span>
                        <span className="small fw-bold">{lowStock} รายการ ({lowRate.toFixed(0)}%)</span>
                    </div>
                    <div className="progress" style={{ height: '6px', backgroundColor: 'var(--bg-secondary)' }}>
                        <div className="progress-bar bg-warning" style={{ width: `${lowRate}%` }}></div>
                    </div>
                 </div>

                 {/* Good Stock */}
                 <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-end mb-1">
                        <span className="small text-success fw-bold"><i className="bi bi-check-circle-fill me-1"></i>เพียงพอ</span>
                        <span className="small fw-bold">{goodStock} รายการ ({goodRate.toFixed(0)}%)</span>
                    </div>
                    <div className="progress" style={{ height: '6px', backgroundColor: 'var(--bg-secondary)' }}>
                        <div className="progress-bar bg-success" style={{ width: `${goodRate}%` }}></div>
                    </div>
                 </div>

                 <div className="mt-2 pt-3 border-top border-secondary border-opacity-10">
                     <div className="alert alert-light border small py-2 d-flex align-items-start gap-2 mb-0">
                        <i className="bi bi-info-circle text-primary mt-1"></i>
                        <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                            ควรเร่งเติมสต็อกให้ศูนย์ที่มีสถานะ <b>ของหมด</b> โดยด่วน เพื่อความพร้อมในการช่วยเหลือ
                        </span>
                     </div>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
}
