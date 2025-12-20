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
  dailyLogs?: { date: string; checkIn: number; checkOut: number }[];
  updatedAt?: string;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [timeRange, setTimeRange] = useState(1); // Default to 1 day (Today)
  const ITEMS_PER_PAGE = 30; // แสดงแถวได้มากขึ้นในรูปแบบตารางเดียวพอดีสวยๆ

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

  // Helper เพื่อคำนวณยอดสะสมตามช่วงเวลา
  const getAggregatedMovement = (logs: Shelter['dailyLogs']) => {
    if (!logs) return { in: 0, out: 0 };
    
    const dates: string[] = [];
    for (let i = 0; i < timeRange; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    return logs
      .filter(log => dates.includes(log.date))
      .reduce((acc, log) => ({
        in: acc.in + (log.checkIn || 0),
        out: acc.out + (log.checkOut || 0)
      }), { in: 0, out: 0 });
  };

  // Pagination Logic
  const totalPages = Math.ceil(filteredShelters.length / ITEMS_PER_PAGE);
  const paginatedShelters = filteredShelters.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-end mb-4 gap-3">
        <div>
          <h2 className="mb-1" style={{ color: 'var(--text-primary)' }}>📊 แดชบอร์ดความเคลื่อนไหวรายวัน</h2>
          <p className="text-secondary mb-0 small">สรุปสถานะการเข้าพักและจำนวนผู้อพยพเข้า-ออกวันนี้</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm flex-grow-1" onClick={fetchData}>
            <i className="bi bi-arrow-clockwise"></i> รีเฟรช
          </button>
          <button className="btn btn-success btn-sm px-3 flex-grow-1" onClick={exportToExcel} disabled={isExporting}>
            {isExporting ? '...' : <><i className="bi bi-file-earmark-excel me-1"></i> Excel</>}
          </button>
        </div>
      </div>

      {/* ส่วนที่ 2: การ์ดตัวเลขสรุป (จากหน้ารายงาน) */}
      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card h-100 border-0 shadow-sm overflow-hidden text-white" style={{ background: 'linear-gradient(45deg, #0d6efd, #0043a8)', borderRadius: '15px' }}>
              <div className="card-body p-3 p-md-4 position-relative">
                <i className="bi bi-people-fill position-absolute bottom-0 end-0 opacity-25 me-3 mb-2" style={{ fontSize: '2rem' }}></i>
                <div className="text-white fw-bold mb-1" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>ผู้อพยพรวมทั้งหมด</div>
                <h2 className="mb-0 fw-bold" style={{ fontSize: '1.8rem' }}>{stats.totalOccupancy.toLocaleString()} <small className="fs-6 fw-normal opacity-75">คน</small></h2>
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
                <i className="bi bi-capsule-pill position-absolute bottom-0 end-0 opacity-25 me-3 mb-2" style={{ fontSize: '2rem' }}></i>
                <div className="text-white fw-bold mb-1" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>คำร้องขอยาทั้งหมด</div>
                <h2 className="mb-0 fw-bold" style={{ fontSize: '1.8rem' }}>{stats.totalMedicalRequests} <small className="fs-6 fw-normal opacity-75">รายการ</small></h2>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ส่วนที่ 3: แถบความหนาแน่นรวม */}
      <div className="card shadow-sm border-theme mb-4">
        <div className="card-body py-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>ระดับความหนาแน่นผู้อพยพภาพรวมทั้งจังหวัด</h6>
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

      {/* ส่วนที่ 4: รายการศูนย์พักพิงแบบตาราง */}
      <div className="card shadow-sm border-0 mb-3" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="card-header bg-transparent border-bottom py-3">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-xl-4 text-center text-xl-start">
              <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>
                📍 ความเคลื่อนไหวรายศูนย์ {timeRange === 1 ? '(วันนี้)' : `(ย้อนหลัง ${timeRange} วัน)`}
              </h5>
            </div>
            <div className="col-12 col-md-7 col-xl-4 d-flex justify-content-center">
              <div className="btn-group btn-group-sm p-1 rounded-pill overflow-auto w-100 w-md-auto" style={{ backgroundColor: 'rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>
                {[1, 3, 7, 14, 30].map((range) => (
                  <button 
                    key={range}
                    className={`btn px-3 rounded-pill border-0 ${timeRange === range ? 'btn-primary shadow-sm' : 'text-secondary'}`}
                    onClick={() => setTimeRange(range)}
                  >
                    {range === 1 ? 'วันนี้' : `${range} วัน`}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-12 col-md-5 col-xl-4">
              <div className="position-relative">
                <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary"></i>
                <input 
                  type="text" 
                  className="form-control form-control-sm ps-5 border-theme" 
                  placeholder="ค้นหาชื่อศูนย์/สถานที่..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 text-theme" style={{ fontSize: '0.9rem' }}>
            <thead className="table-dark">
              <tr className="small fw-bold opacity-75">
                <th className="ps-4 py-3" style={{ width: '30%' }}>ชื่อศูนย์ / สถานที่</th>
                <th className="py-3">ตำบล / อำเภอ</th>
                {timeRange > 0 && <th className="text-center py-3">ความเคลื่อนไหว</th>}
                <th className="text-center py-3">ครองเตียง (%)</th>
                <th className="py-3">ความจุ (คน)</th>
                <th className="py-3">สถานะ</th>
                <th className="pe-4 py-3">อัปเดตล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {paginatedShelters.map((shelter) => {
                const percent = (shelter.currentOccupancy / (shelter.capacity || 1)) * 100;
                let statusColor = "success";
                let statusText = "รองรับได้";
                
                if (percent >= 100) { statusColor = "danger"; statusText = "ล้นศูนย์"; }
                else if (percent >= 80) { statusColor = "warning"; statusText = "ใกล้เต็ม"; }

                const movement = getAggregatedMovement(shelter.dailyLogs);

                return (
                  <tr key={shelter._id} className="border-bottom-theme">
                    <td className="ps-4">
                      <div className="d-flex align-items-start gap-2">
                        <i className="bi bi-geo-alt-fill text-danger mt-1"></i>
                        <div>
                          <div className="fw-bold mb-0 text-primary-theme">{shelter.name}</div>
                          <small className="text-secondary">{shelter.subdistrict || '-'}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{shelter.subdistrict}</div>
                      <small className="text-secondary">{shelter.district}</small>
                    </td>
                    <td>
                      <div className="d-flex justify-content-center gap-3">
                        <span className="text-success fw-bold">+{movement.in}</span>
                        <span className="text-danger fw-bold">-{movement.out}</span>
                      </div>
                    </td>
                    <td className="text-center">
                      <div style={{ width: '80px', margin: '0 auto' }}>
                        <div className="d-flex justify-content-between x-small mb-1">
                          <span className={`text-${statusColor}`}>{percent.toFixed(0)}%</span>
                        </div>
                        <div className="progress" style={{ height: '4px' }}>
                          <div className={`progress-bar bg-${statusColor}`} style={{ width: `${Math.min(percent, 100)}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center fw-bold">
                       {shelter.currentOccupancy} / {shelter.capacity}
                    </td>
                    <td>
                      <span className={`badge rounded-pill bg-${statusColor}-subtle text-${statusColor} px-3`}>
                        {statusText}
                      </span>
                    </td>
                    <td className="pe-4 text-secondary small">
                      {new Date(shelter.updatedAt || Date.now()).toLocaleDateString('th-TH')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination UI */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-5 mb-5">
          <nav className="custom-pagination">
            <div className="pagination-container d-flex align-items-center">
              {/* First Page */}
              <button 
                className="pag-btn" 
                onClick={() => setCurrentPage(1)} 
                disabled={currentPage === 1}
              >
                «
              </button>
              
              {/* Prev Page */}
              <button 
                className="pag-btn" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                ‹
              </button>

              {/* Page Numbers */}
              {(() => {
                const pages = [];
                const showRange = 2; // จำนวนหน้าที่จะโชว์รอบๆ หน้าปัจจุบัน
                
                for (let i = 1; i <= totalPages; i++) {
                  if (
                    i === 1 || 
                    i === totalPages || 
                    (i >= currentPage - showRange && i <= currentPage + showRange)
                  ) {
                    pages.push(
                      <button 
                        key={i}
                        className={`pag-btn ${currentPage === i ? 'active' : ''}`}
                        onClick={() => setCurrentPage(i)}
                      >
                        {i}
                      </button>
                    );
                  } else if (
                    i === currentPage - showRange - 1 || 
                    i === currentPage + showRange + 1
                  ) {
                    pages.push(<span key={i} className="pag-ellipsis">...</span>);
                  }
                }
                return pages;
              })()}

              {/* Next Page */}
              <button 
                className="pag-btn" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                ›
              </button>

              {/* Last Page */}
              <button 
                className="pag-btn" 
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                »
              </button>
            </div>
          </nav>
        </div>
      )}

      <style jsx>{`
        .custom-pagination .pagination-container {
          background-color: #1e2125;
          border: 1px solid #343a40;
          border-radius: 8px;
          overflow: hidden;
        }
        .pag-btn {
          background: transparent;
          border: none;
          border-right: 1px solid #343a40;
          color: #dee2e6;
          padding: 8px 16px;
          min-width: 45px;
          transition: all 0.2s;
          font-size: 0.95rem;
        }
        .pag-btn:last-child {
          border-right: none;
        }
        .pag-btn:hover:not(:disabled):not(.active) {
          background-color: rgba(255, 255, 255, 0.05);
          color: #fff;
        }
        .pag-btn.active {
          background-color: #0d6efd;
          color: white;
          font-weight: bold;
        }
        .pag-btn:disabled {
          color: #495057;
          cursor: not-allowed;
        }
        .pag-ellipsis {
          padding: 8px 12px;
          color: #6c757d;
          border-right: 1px solid #343a40;
          background-color: transparent;
          font-size: 0.8rem;
          display: flex;
          align-items: flex-end;
          height: 100%;
        }
        .border-bottom-theme {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .text-primary-theme {
          color: #e9ecef;
        }
        .bg-danger-subtle { background-color: rgba(220, 53, 69, 0.1) !important; }
        .bg-warning-subtle { background-color: rgba(255, 193, 7, 0.1) !important; }
        .bg-success-subtle { background-color: rgba(25, 135, 84, 0.1) !important; }
        
        .table-hover tbody tr:hover {
          background-color: rgba(255, 255, 255, 0.02);
        }
      `}</style>
    </div>
  );
}

