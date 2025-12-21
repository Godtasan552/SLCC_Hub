'use client';
import { Stats } from "@/types/shelter";

interface CapacityOverviewProps {
  stats: Stats;
}

export default function CapacityOverview({ stats }: CapacityOverviewProps) {
  const occupancyRate = (stats.totalOccupancy / (stats.totalCapacity || 1)) * 100;
  const safeRate = 100 - occupancyRate;

  // คำนวณเส้นรอบวงสำหรับ SVG Circle (r=70) -> 2 * pi * 70 approx 440
  const totalCircumference = 440;
  const strokeDashoffset = totalCircumference - (Math.min(occupancyRate, 100) / 100) * totalCircumference;

  let colorClass = '#198754'; // success
  if (occupancyRate > 90) colorClass = '#dc3545'; // danger
  else if (occupancyRate > 70) colorClass = '#ffc107'; // warning

  return (
    <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px' }}>
      <div className="card-header bg-transparent border-0 pt-4 px-4">
        <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>ภาพรวมความหนาแน่น</h5>
        <p className="text-secondary small mb-0">อัตราส่วนผู้อพยพต่อความจุทั้งจังหวัด</p>
      </div>
      
      <div className="card-body d-flex flex-column align-items-center justify-content-center py-4">
        <div className="position-relative d-flex align-items-center justify-content-center" style={{ width: '220px', height: '220px' }}>
             {/* Chart Background */}
             <svg width="220" height="220" viewBox="0 0 220 220" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx="110" cy="110" r="70"
                  fill="none"
                  stroke="var(--bg-secondary)"
                  strokeWidth="20"
                />
                <circle
                  cx="110" cy="110" r="70"
                  fill="none"
                  stroke={colorClass}
                  strokeWidth="20"
                  strokeDasharray={totalCircumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                />
             </svg>
             
             {/* Center Text */}
             <div className="position-absolute text-center">
                <h1 className="fw-bold mb-0 display-5" style={{ color: 'var(--text-primary)' }}>{occupancyRate.toFixed(1)}<small className="fs-6">%</small></h1>
                <span className="badge rounded-pill bg-light text-dark shadow-sm border">
                   {occupancyRate > 90 ? 'วิกฤต' : occupancyRate > 70 ? 'หนาแน่น' : 'ปกติ'}
                </span>
             </div>
        </div>

        <div className="mt-4 w-100 px-4">
           <div className="d-flex justify-content-between mb-2 small text-secondary">
              <span>ผู้อพยพจริง</span>
              <span className="fw-bold text-primary">{stats.totalOccupancy.toLocaleString()} คน</span>
           </div>
           <div className="d-flex justify-content-between mb-2 small text-secondary">
              <span>ความจุทั้งหมด</span>
              <span className="fw-bold text-success">{stats.totalCapacity.toLocaleString()} ที่นั่ง</span>
           </div>
           
           <div className="mt-3 pt-3 border-top border-secondary border-opacity-10 text-center">
              <small className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                อัปเดตข้อมูลล่าสุดแบบ Real-time
              </small>
           </div>
        </div>
      </div>
    </div>
  );
}
