'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs';

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
  const [isExporting, setIsExporting] = useState(false);

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

  const exportToExcel = async () => {
    if (!stats) return;
    setIsExporting(true);
    
    try {
      // Fetch detailed shelter data for the second sheet
      const res = await axios.get('/api/shelters');
      const allShelters = res.data.data;

      const workbook = new ExcelJS.Workbook();
      
      // Sheet 1: Summary Report
      const summarySheet = workbook.addWorksheet('สรุปภาพรวม');
      summarySheet.columns = [
        { header: 'หัวข้อ', key: 'title', width: 30 },
        { header: 'จำนวน', key: 'value', width: 20 },
        { header: 'หน่วย', key: 'unit', width: 15 }
      ];

      summarySheet.addRows([
        { title: 'ผู้อพยพรวมทั้งหมด', value: stats.totalOccupancy, unit: 'คน' },
        { title: 'ความจุรวมทั้งหมด', value: stats.totalCapacity, unit: 'คน' },
        { title: 'อัตราความหนาแน่นรวม', value: ((stats.totalOccupancy / (stats.totalCapacity || 1)) * 100).toFixed(2), unit: '%' },
        { title: 'ศูนย์ที่สถานะ "ล้น"', value: stats.criticalShelters, unit: 'แห่ง' },
        { title: 'ศูนย์ที่ "ใกล้เต็ม"', value: stats.warningShelters, unit: 'แห่ง' },
        { title: 'คำร้องขอยา/เวชภัณฑ์', value: stats.totalMedicalRequests, unit: 'รายการ' },
      ]);

      // Styling Summary Sheet
      summarySheet.getRow(1).font = { bold: true };
      summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };

      // Sheet 2: Detailed Data
      const detailSheet = workbook.addWorksheet('รายละเอียดศูนย์พักพิง');
      detailSheet.columns = [
        { header: 'ชื่อศูนย์พักพิง', key: 'name', width: 40 },
        { header: 'อำเภอ', key: 'district', width: 20 },
        { header: 'ตำบล', key: 'subdistrict', width: 20 },
        { header: 'ความจุ', key: 'capacity', width: 15 },
        { header: 'จำนวนผู้อพยพ', key: 'currentOccupancy', width: 15 },
        { header: 'สถานะความหนานแน่น', key: 'capacityStatus', width: 20 },
      ];

      detailSheet.addRows(allShelters);
      
      // Styling Detail Sheet Headers
      detailSheet.getRow(1).font = { bold: true };
      detailSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D6EFD' } };
      detailSheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

      // Write to buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `รายงานสถานการณ์_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('เกิดข้อผิดพลาดในการส่งออกไฟล์');
    } finally {
      setIsExporting(false);
    }
  };

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
          <div className="card h-100 shadow-lg border-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #0043a8 100%)', borderRadius: '15px' }}>
            <div className="card-body text-center py-4 position-relative">
              <i className="bi bi-people-fill position-absolute" style={{ fontSize: '4.5rem', right: '-15px', top: '-15px', opacity: '0.1', color: '#fff' }}></i>
              <h6 className="fw-bold mb-2" style={{ color: 'rgba(255, 255, 255, 0.85)', letterSpacing: '0.5px' }}>ผู้อพยพรวมทั้งหมด</h6>
              <h2 className="fw-bold mb-0 text-white" style={{ fontSize: '3rem', textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>{stats.totalOccupancy.toLocaleString()}</h2>
              <div className="fw-bold mt-1" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>คน</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100 shadow-lg border-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #dc3545 0%, #a71d2a 100%)', borderRadius: '15px' }}>
            <div className="card-body text-center py-4 position-relative">
              <i className="bi bi-exclamation-octagon-fill position-absolute" style={{ fontSize: '4.5rem', right: '-15px', top: '-15px', opacity: '0.1', color: '#fff' }}></i>
              <h6 className="fw-bold mb-2" style={{ color: 'rgba(255, 255, 255, 0.85)', letterSpacing: '0.5px' }}>ศูนย์ที่สถานะ &quot;ล้น&quot;</h6>
              <h2 className="fw-bold mb-0 text-white" style={{ fontSize: '3rem', textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>{stats.criticalShelters}</h2>
              <div className="fw-bold mt-1" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>แห่ง</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100 shadow-lg border-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #ffc107 0%, #ff8f00 100%)', borderRadius: '15px' }}>
            <div className="card-body text-center py-4 position-relative">
              <i className="bi bi-house-exclamation-fill position-absolute" style={{ fontSize: '4.5rem', right: '-15px', top: '-15px', opacity: '0.1', color: '#000' }}></i>
              <h6 className="fw-bold mb-2" style={{ color: 'rgba(0, 0, 0, 0.75)', letterSpacing: '0.5px' }}>ศูนย์ที่ &quot;ใกล้เต็ม&quot;</h6>
              <h2 className="fw-bold mb-0 text-dark" style={{ fontSize: '3rem', textShadow: '1px 1px 2px rgba(255,255,255,0.3)' }}>{stats.warningShelters}</h2>
              <div className="fw-bold mt-1" style={{ color: 'rgba(0, 0, 0, 0.65)' }}>แห่ง</div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100 shadow-lg border-0 overflow-hidden" style={{ background: 'linear-gradient(115deg, #0dcaf0 0%, #00acc1 100%)', borderRadius: '15px' }}>
            <div className="card-body text-center py-4 position-relative">
              <i className="bi bi-capsule-pill position-absolute" style={{ fontSize: '4.5rem', right: '-15px', top: '-15px', opacity: '0.1', color: '#fff' }}></i>
              <h6 className="fw-bold mb-2" style={{ color: 'rgba(255, 255, 255, 0.9)', letterSpacing: '0.5px' }}>คำร้องขอยา/เวชภัณฑ์</h6>
              <h2 className="fw-bold mb-0 text-white" style={{ fontSize: '3rem', textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>{stats.totalMedicalRequests}</h2>
              <div className="fw-bold mt-1" style={{ color: 'rgba(255, 255, 255, 0.75)' }}>รายการ</div>
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

      {/* ส่วนที่ 3: ปุ่มส่งออก Excel */}
      <div className="text-end d-flex justify-content-end gap-2">
        <button className="btn btn-outline-secondary" onClick={() => window.location.reload()}>
          🔄 รีเฟรชข้อมูล
        </button>
        <button 
          className="btn btn-success px-4 d-flex align-items-center gap-2" 
          onClick={exportToExcel}
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              กำลังส่งออก...
            </>
          ) : (
            <>
              <i className="bi bi-file-earmark-excel"></i>
              ส่งออกเป็น Excel (.xlsx)
            </>
          )}
        </button>
      </div>
    </div>
  );
}

