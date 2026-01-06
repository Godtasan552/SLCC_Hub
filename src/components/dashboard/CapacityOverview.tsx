'use client';
import { Stats } from "@/types/shelter";

interface CapacityOverviewProps {
  stats: Stats;
}

export default function CapacityOverview({ stats }: CapacityOverviewProps) {
  const occupancyRate = (stats.totalOccupancy / (stats.totalCapacity || 1)) * 100;
  
  // Chart Logic
  const totalCircumference = 440;
  const strokeDashoffset = totalCircumference - (Math.min(occupancyRate, 100) / 100) * totalCircumference;
  
  // Use CSS Variables instead of hex codes
  let colorVar = 'var(--text-success)'; 
  if (occupancyRate > 90) colorVar = 'var(--text-danger)';
  else if (occupancyRate > 70) colorVar = 'var(--text-warning)';

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
         <p className="text-secondary small mb-0" style={{ opacity: 0.8 }}>ความหนาแน่นผู้อพยพ และ ความพร้อมด้านทรัพยากร</p>
      </div>
      
      <div className="card-body px-4 py-3">
        <div className="row g-4 h-100">
            {/* Left: Occupancy Chart */}
            <div className="col-12 col-md-6 d-flex flex-column align-items-center justify-content-center position-relative">
                {/* Visual Divider for Desktop */}
                <div className="d-none d-md-block position-absolute end-0 top-0 bottom-0 border-end border-secondary" style={{ opacity: 0.3 }}></div>

                <div className="p-3 w-100 h-100 rounded-4 d-flex flex-column align-items-center justify-content-center" style={{ backgroundColor: 'var(--bg-overlay)' }}>
                    <h6 className="fw-bold mb-4" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>
                        <i className="bi bi-people-fill me-2"></i>ความหนาแน่นศูนย์พักพิง
                    </h6>
                    <div className="position-relative d-flex align-items-center justify-content-center" style={{ width: '180px', height: '180px' }}>
                        <svg width="180" height="180" viewBox="0 0 220 220" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="110" cy="110" r="70" fill="none" stroke="var(--bg-secondary)" strokeWidth="20" style={{ opacity: 0.3 }} />
                            <circle cx="110" cy="110" r="70" fill="none" stroke={colorVar} strokeWidth="20"
                                    strokeDasharray={totalCircumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
                                    style={{ transition: 'stroke-dashoffset 1s ease-in-out', filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.3))' }} />
                        </svg>
                        <div className="position-absolute text-center">
                            <h2 className="fw-bold mb-0" style={{ color: 'var(--text-primary)', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{occupancyRate.toFixed(1)}<small className="fs-6">%</small></h2>
                            <span className={`badge rounded-pill shadow-sm border border-secondary ${occupancyRate > 90 ? 'bg-danger text-white' : occupancyRate > 70 ? 'bg-warning text-dark' : 'bg-success text-white'}`}>
                                {occupancyRate > 90 ? 'วิกฤต' : occupancyRate > 70 ? 'หนาแน่น' : 'ปกติ'}
                            </span>
                        </div>
                    </div>
                    <div className="mt-4 w-75">
                        <div className="d-flex justify-content-between mb-2 small text-secondary">
                            <span>ผู้พักพิงจริง</span>
                            <span className="fw-bold fs-6" style={{ color: 'var(--text-primary)' }}>{stats.totalOccupancy.toLocaleString()} <span className="small text-secondary fw-normal">คน</span></span>
                        </div>
                        <div className="d-flex justify-content-between mb-2 small text-secondary">
                            <span>ความจุทั้งหมด</span>
                            <span className="fw-bold fs-6" style={{ color: 'var(--text-success)' }}>{stats.totalCapacity.toLocaleString()} <span className="small text-secondary fw-normal">ที่นั่ง</span></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Supply Overview */}
            <div className="col-12 col-md-6">
                 <div className="p-4 w-100 h-100 rounded-4 d-flex flex-column" style={{ backgroundColor: 'var(--bg-overlay)', border: '1px solid var(--border-color)' }}>
                     <div className="d-flex justify-content-between align-items-center mb-4">
                        <h6 className="fw-bold mb-0" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>
                            <i className="bi bi-box-seam-fill me-2 text-primary"></i>สถานะคลังสิ่งของ
                        </h6>
                        <span className="badge bg-secondary bg-opacity-25 text-theme rounded-pill px-3">{totalSupplies} รายการรวม</span>
                     </div>

                     {/* 🌈 Unified Composition Ribbon */}
                     <div className="mb-4">
                        <div className="progress rounded-pill overflow-hidden shadow-inner" style={{ height: '14px', backgroundColor: 'var(--bg-secondary)' }}>
                            <div className="progress-bar" style={{ width: `${outRate}%`, transition: 'width 1s ease', backgroundColor: 'var(--bg-danger)' }}></div>
                            <div className="progress-bar" style={{ width: `${lowRate}%`, transition: 'width 1s ease', backgroundColor: 'var(--bg-warning)' }}></div>
                            <div className="progress-bar" style={{ width: `${goodRate}%`, transition: 'width 1s ease', backgroundColor: 'var(--bg-success)' }}></div>
                        </div>
                        <div className="d-flex justify-content-between mt-2 x-small text-secondary fw-medium px-1">
                            <span>0%</span>
                            <span>อัตราส่วนสต็อกสินค้า</span>
                            <span>100%</span>
                        </div>
                     </div>
                     
                     {/* 🏷️ Detailed Status Cards */}
                     <div className="row g-2 mb-4">
                        {[
                            { label: 'ของหมด', count: outOfStock, rate: outRate, colorVar: 'var(--text-danger)', bgVar: 'var(--bg-danger)', icon: 'bi-x-circle' },
                            { label: 'เหลือน้อย', count: lowStock, rate: lowRate, colorVar: 'var(--text-warning)', bgVar: 'var(--bg-warning)', icon: 'bi-exclamation-triangle' },
                            { label: 'เพียงพอ', count: goodStock, rate: goodRate, colorVar: 'var(--text-success)', bgVar: 'var(--bg-success)', icon: 'bi-check-circle' }
                        ].map((item, idx) => (
                            <div key={idx} className="col-4">
                                <div 
                                    className="h-100 p-2 rounded-3 text-center transition-all border"
                                    style={{ 
                                        backgroundColor: 'var(--bg-card)', 
                                        borderColor: item.colorVar,
                                        borderWidth: '1px',
                                        borderStyle: 'solid'
                                    }}
                                >
                                    <i className={`bi ${item.icon} d-block mb-1 fs-5`} style={{ color: item.colorVar }}></i>
                                    <div className="fw-bold fs-5" style={{ color: 'var(--text-primary)' }}>{item.count}</div>
                                    <div className="x-small text-secondary text-nowrap">{item.label}</div>
                                </div>
                            </div>
                        ))}
                     </div>

                     <div className="mt-auto pt-3 border-top border-secondary border-opacity-10">
                         <div className="d-flex align-items-start gap-2 p-2 rounded-3" style={{ backgroundColor: 'var(--bg-opacity-primary)' }}>
                            <i className="bi bi-info-circle-fill text-primary mt-1"></i>
                            <span className="small text-secondary" style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
                                ระบบแนะนำให้เติมสต็อกในกลุ่ม <b>ของหมด</b> ({outOfStock}) ทันที เพื่อความปลอดภัยของผู้อพยพ
                            </span>
                         </div>
                     </div>
                 </div>
            </div>
        </div>
      </div>
      <style jsx>{`
        .x-small { font-size: 0.75rem; }
        .transition-all { transition: all 0.2s ease; }
        .transition-all:hover { transform: translateY(-3px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
      `}</style>
    </div>
  );
}
