'use client';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs';

interface Shelter {
  _id: string;
  name: string;
  district: string;
  subdistrict?: string;
  capacity: number;
  currentOccupancy: number;
  capacityStatus?: string;
}

interface Stats {
  totalShelters: number;
  totalCapacity: number;
  totalOccupancy: number;
  criticalShelters: number;
  warningShelters: number;
  totalMedicalRequests: number;
}

export default function UnifiedDashboard() {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [sheltersRes, statsRes] = await Promise.all([
        axios.get('/api/shelters'),
        axios.get('/api/stats')
      ]);
      setShelters(sheltersRes.data.data);
      setStats(statsRes.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateOccupancy = async (id: string, current: number) => {
    const newValue = prompt("ระบุจำนวนผู้อพยพปัจจุบัน:", current.toString());
    if (newValue !== null && !isNaN(parseInt(newValue))) {
      try {
        await axios.put(`/api/shelters/${id}`, { currentOccupancy: parseInt(newValue) });
        fetchData(); // Refresh both stats and list
      } catch (err) {
        console.error('Update occupancy failed:', err);
        alert('เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
      }
    }
  };

  const exportToExcel = async () => {
    if (!stats) return;
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const summarySheet = workbook.addWorksheet('สรุปภาพรวม');
      summarySheet.columns = [
        { header: 'หัวข้อ', key: 'title', width: 30 },
        { header: 'จำนวน', key: 'value', width: 20 },
        { header: 'หน่วย', key: 'unit', width: 15 }
      ];
      summarySheet.addRows([
        { title: 'ผู้อพยพรวมทั้งหมด', value: stats.totalOccupancy, unit: 'คน' },
        { title: 'ความจุรวมทั้งหมด', value: stats.totalCapacity, unit: 'คน' },
        { title: 'ความหนาแน่นรวม', value: ((stats.totalOccupancy / (stats.totalCapacity || 1)) * 100).toFixed(2), unit: '%' },
        { title: 'ศูนย์ที่ "ล้น"', value: stats.criticalShelters, unit: 'แห่ง' },
        { title: 'ศูนย์ที่ "ใกล้เต็ม"', value: stats.warningShelters, unit: 'แห่ง' },
      ]);
      summarySheet.getRow(1).font = { bold: true };
      summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9ECEF' } };

      const detailSheet = workbook.addWorksheet('รายชื่อศูนย์พักพิง');
      detailSheet.columns = [
        { header: 'ชื่อศูนย์', key: 'name', width: 35 },
        { header: 'อำเภอ', key: 'district', width: 15 },
        { header: 'ความจุ', key: 'capacity', width: 10 },
        { header: 'จำนวนคน', key: 'currentOccupancy', width: 10 },
        { header: 'สถานะ', key: 'capacityStatus', width: 15 },
      ];
      detailSheet.addRows(shelters);
      detailSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      detailSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D6EFD' } };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `รายงานDashboard_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.xlsx`;
      a.click();
    } catch (err) {
      console.error('Export failed:', err);
      alert('การส่งออกล้มเหลว');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredShelters = shelters.filter(s => 
    (s.name?.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (s.district?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const occupancyRate = stats ? (stats.totalOccupancy / (stats.totalCapacity || 1)) * 100 : 0;

  if (loading) return (
    <div className="container py-5 text-center">
      <div className="spinner-border text-primary" role="status"></div>
      <p className="mt-3 text-secondary">กำลังโหลดข้อมูลรวม...</p>
    </div>
  );

  return (
    <div className="container py-4">
      {/* ส่วนที่ 1: หัวข้อและปุ่ม Export */}
      <div className="d-flex justify-content-between align-items-end mb-4">
        <div>
          <h2 className="mb-1" style={{ color: 'var(--text-primary)' }}>📊 แดชบอร์ดและรายงานสถานการณ์</h2>
          <p className="text-secondary mb-0 small">ข้อมูลสรุปและจัดการศูนย์พักพิงแบบ Real-time</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={fetchData}>
            <i className="bi bi-arrow-clockwise"></i> รีเฟรช
          </button>
          <button className="btn btn-success btn-sm px-3" onClick={exportToExcel} disabled={isExporting}>
            {isExporting ? '...' : <><i className="bi bi-file-earmark-excel me-1"></i> Excel</>}
          </button>
        </div>
      </div>

      {/* ส่วนที่ 2: การ์ดตัวเลขสรุป (จากหน้ารายงาน) */}
      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card h-100 border-0 shadow-sm overflow-hidden" style={{ background: 'linear-gradient(45deg, #0d6efd, #0043a8)', color: 'white', borderRadius: '12px' }}>
              <div className="card-body py-3">
                <small className="opacity-75">ผู้อพยพรวม</small>
                <h3 className="mb-0 fw-bold">{stats.totalOccupancy.toLocaleString()} <span className="fs-6 fw-normal">คน</span></h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card h-100 border-0 shadow-sm overflow-hidden" style={{ background: 'linear-gradient(45deg, #dc3545, #a71d2a)', color: 'white', borderRadius: '12px' }}>
              <div className="card-body py-3">
                <small className="opacity-75">ศูนย์ที่มีสถานะ &quot;ล้น&quot;</small>
                <h3 className="mb-0 fw-bold">{stats.criticalShelters} <span className="fs-6 fw-normal">แห่ง</span></h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card h-100 border-0 shadow-sm overflow-hidden" style={{ background: 'linear-gradient(45deg, #ffc107, #ff8f00)', color: 'black', borderRadius: '12px' }}>
              <div className="card-body py-3">
                <small className="opacity-75 fw-bold">ศูนย์ที่ &quot;ใกล้เต็ม&quot;</small>
                <h3 className="mb-0 fw-bold">{stats.warningShelters} <span className="fs-6 fw-normal">แห่ง</span></h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card h-100 border-0 shadow-sm overflow-hidden" style={{ background: 'linear-gradient(45deg, #0dcaf0, #00acc1)', color: 'white', borderRadius: '12px' }}>
              <div className="card-body py-3">
                <small className="opacity-75">คำร้องขอยาทั้งหมด</small>
                <h3 className="mb-0 fw-bold">{stats.totalMedicalRequests} <span className="fs-6 fw-normal">รายการ</span></h3>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ส่วนที่ 3: แถบความหนาแน่นรวม */}
      <div className="card shadow-sm border-theme mb-4">
        <div className="card-body py-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>อัตราครองเตียงภาพรวมทั้งจังหวัด</h6>
            <span className="badge bg-light text-dark">{occupancyRate.toFixed(1)}%</span>
          </div>
          <div className="progress" style={{ height: '12px', borderRadius: '6px' }}>
            <div 
              className={`progress-bar progress-bar-striped progress-bar-animated ${occupancyRate > 90 ? 'bg-danger' : occupancyRate > 75 ? 'bg-warning' : 'bg-success'}`}
              style={{ width: `${Math.min(occupancyRate, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* ส่วนที่ 4: รายการศูนย์พักพิง (จากหน้า Dashboard เดิม) */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0" style={{ color: 'var(--text-primary)' }}>📍 จัดการข้อมูลรายศูนย์ ({filteredShelters.length})</h5>
        <div className="position-relative w-25">
          <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary"></i>
          <input 
            type="text" 
            className="form-control form-control-sm ps-5 border-theme" 
            placeholder="ค้นหาศูนย์/อำเภอ..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="row g-3">
        {filteredShelters.map((shelter) => {
          const percent = (shelter.currentOccupancy / (shelter.capacity || 1)) * 100;
          let color = "success";
          if (percent >= 100) color = "danger";
          else if (percent >= 80) color = "warning";

          return (
            <div className="col-md-4 col-lg-3" key={shelter._id}>
              <div className={`card h-100 shadow-sm border-top border-4 border-${color}`}>
                <div className="card-body p-3">
                  <h6 className="card-title text-truncate fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>{shelter.name}</h6>
                  <p className="small text-secondary mb-2">{shelter.district}</p>
                  
                  <div className="d-flex justify-content-between mb-1 small">
                    <span className={`text-${color} fw-bold`}>{percent.toFixed(0)}%</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{shelter.currentOccupancy}/{shelter.capacity} คน</span>
                  </div>
                  <div className="progress mb-3" style={{ height: '6px' }}>
                    <div className={`progress-bar bg-${color}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                  </div>

                  <div className="d-flex gap-1">
                    <button 
                      className="btn btn-sm btn-outline-primary py-1 px-2 flex-grow-1"
                      onClick={() => handleUpdateOccupancy(shelter._id, shelter.currentOccupancy)}
                    >
                      <i className="bi bi-pencil me-1"></i> อัปเดต
                    </button>
                    <button className="btn btn-sm btn-light py-1 px-2">
                       <i className="bi bi-info-circle"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

