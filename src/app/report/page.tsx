'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';

interface Stats {
  totalShelters: number;
  totalCapacity: number;
  totalOccupancy: number;
  criticalShelters: number;
  warningShelters: number;
  totalMedicalRequests: number;
}

export default function ReportPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/stats')
      .then(res => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch stats:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="container py-5 text-center">
      <div className="spinner-border text-primary mb-3" role="status"></div>
      <div style={{ color: 'var(--text-secondary)' }}>กำลังโหลดข้อมูลรายงาน...</div>
    </div>
  );

  if (!stats) return (
    <div className="container py-5 text-center text-danger">
      <i className="bi bi-exclamation-triangle fs-1 mb-3"></i>
      <div>เกิดข้อผิดพลาดในการโหลดข้อมูล</div>
    </div>
  );

  const occupancyRate = (stats.totalOccupancy / (stats.totalCapacity || 1)) * 100;

  return (
    <div className="container py-4">
      <h2 className="mb-4" style={{ color: 'var(--text-primary)' }}>📊 รายงานสรุปสถานการณ์ผู้อพยพ</h2>
      
      {/* ส่วนที่ 1: แถบตัวเลขสำคัญ (Key Metrics) */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <div className="card h-100 shadow-sm border-0" style={{ backgroundColor: 'rgba(13, 110, 253, 0.15)', borderLeft: '5px solid #0d6efd' }}>
            <div className="card-body text-center">
              <h6 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>ผู้อพยพรวมทั้งหมด</h6>
              <h2 className="fw-bold mb-0" style={{ color: '#0d6efd' }}>{stats.totalOccupancy.toLocaleString()}</h2>
              <small style={{ color: 'var(--text-secondary)' }}>คน</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100 shadow-sm border-0" style={{ backgroundColor: 'rgba(220, 53, 69, 0.15)', borderLeft: '5px solid #dc3545' }}>
            <div className="card-body text-center">
              <h6 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>ศูนย์ที่สถานะ &quot;ล้น&quot;</h6>
              <h2 className="fw-bold mb-0" style={{ color: '#dc3545' }}>{stats.criticalShelters}</h2>
              <small style={{ color: 'var(--text-secondary)' }}>แห่ง</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100 shadow-sm border-0" style={{ backgroundColor: 'rgba(255, 193, 7, 0.15)', borderLeft: '5px solid #ffc107' }}>
            <div className="card-body text-center">
              <h6 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>ศูนย์ที่ &quot;ใกล้เต็ม&quot;</h6>
              <h2 className="fw-bold mb-0" style={{ color: '#ffc107' }}>{stats.warningShelters}</h2>
              <small style={{ color: 'var(--text-secondary)' }}>แห่ง</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100 shadow-sm border-0" style={{ backgroundColor: 'rgba(13, 202, 240, 0.15)', borderLeft: '5px solid #0dcaf0' }}>
            <div className="card-body text-center">
              <h6 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>คำร้องขอยา/เวชภัณฑ์</h6>
              <h2 className="fw-bold mb-0" style={{ color: '#0dcaf0' }}>{stats.totalMedicalRequests}</h2>
              <small style={{ color: 'var(--text-secondary)' }}>รายการ</small>
            </div>
          </div>
        </div>
      </div>

      {/* ส่วนที่ 2: วิเคราะห์ความหนาแน่นรวม */}
      <div className="card shadow-sm mb-4 border-theme">
        <div className="card-body">
          <h5 className="card-title" style={{ color: 'var(--text-primary)' }}>ความหนาแน่นภาพรวมทั้งจังหวัด</h5>
          <div className="progress mt-4" style={{ height: '35px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)' }}>
            <div 
              className={`progress-bar progress-bar-striped progress-bar-animated ${occupancyRate > 90 ? 'bg-danger' : occupancyRate > 75 ? 'bg-warning text-dark' : 'bg-success'}`} 
              style={{ width: `${Math.min(occupancyRate, 100)}%` }}
            >
              <strong>{occupancyRate.toFixed(1)}%</strong>
            </div>
          </div>
          <div className="mt-3 d-flex justify-content-between align-items-center">
             <div className="text-theme-secondary small">
               รองรับได้ทั้งหมด {stats.totalCapacity.toLocaleString()} คน
             </div>
             <div className="text-theme-secondary small text-end">
               ปัจจุบันเข้าพัก {stats.totalOccupancy.toLocaleString()} คน
             </div>
          </div>
        </div>
      </div>

      {/* ส่วนที่ 3: ปุ่มพิมพ์รายงาน */}
      <div className="text-end no-print d-flex justify-content-end gap-2">
        <button className="btn btn-outline-secondary" onClick={() => window.location.reload()}>
          🔄 รีเฟรชข้อมูล
        </button>
        <button className="btn btn-primary px-4" onClick={() => window.print()}>
          🖨️ พิมพ์รายงานสรุป (PDF)
        </button>
      </div>

      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .card {
             border: 1px solid #ddd !important;
             box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
