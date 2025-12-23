'use client';
import { useState, useEffect, useMemo } from 'react';
import { Shelter } from "@/types/shelter";
import { getAggregatedMovement, getCapacityStatus } from "@/utils/shelter-utils";

interface ShelterListProps {
  shelters: Shelter[];
  timeRange: number;
  setTimeRange: (range: number) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onAction?: (id: string, action: 'in' | 'out') => void;
  onEdit?: (shelter: Shelter) => void;
  onDelete?: (id: string) => void;
}

const ITEMS_PER_PAGE = 30;

export default function ShelterList({ 
  shelters, 
  timeRange, 
  setTimeRange, 
  searchTerm, 
  setSearchTerm,
  onAction,
  onEdit,
  onDelete
}: ShelterListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterCapacity, setFilterCapacity] = useState('All');
  const [filterDistrict, setFilterDistrict] = useState('All');

  const districts = useMemo(() => {
    return ['All', ...new Set(shelters.map(s => s.district).filter(Boolean))];
  }, [shelters]);

  const filteredShelters = useMemo(() => {
    return shelters.filter(s => {
      const matchSearch = (s.name?.toLowerCase().includes(searchTerm.toLowerCase())) || 
                          (s.district?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const status = getCapacityStatus(s.currentOccupancy, s.capacity);
      const matchCapacity = filterCapacity === 'All' || status.text === filterCapacity;
      
      const matchDistrict = filterDistrict === 'All' || s.district === filterDistrict;
      
      return matchSearch && matchCapacity && matchDistrict;
    });
  }, [shelters, searchTerm, filterCapacity, filterDistrict]);

  const totalPages = Math.ceil(filteredShelters.length / ITEMS_PER_PAGE);
  const paginatedShelters = filteredShelters.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCapacity, filterDistrict]);

  const hasActions = onAction || onEdit || onDelete;

  return (
    <div className="w-100">
      {/* 🔍 Advanced Filter Bar */}
      <div className="card shadow-sm mb-3 border-0" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            {/* Capacity Filter */}
            <div className="col-12 col-md-3">
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0 border-theme">
                  <i className="bi bi-bar-chart-fill text-primary"></i>
                </span>
                <select 
                  className="form-select border-start-0 border-theme shadow-none"
                  value={filterCapacity}
                  onChange={(e) => setFilterCapacity(e.target.value)}
                >
                  <option value="All">ทุกสถานะความจุ</option>
                  <option value="ล้นศูนย์">⚠️ ล้นศูนย์</option>
                  <option value="ใกล้เต็ม">🟠 ใกล้เต็ม</option>
                  <option value="รองรับได้">🟢 รองรับได้</option>
                </select>
              </div>
            </div>

            {/* District Filter */}
            <div className="col-12 col-md-3">
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0 border-theme">
                  <i className="bi bi-geo-alt-fill text-danger"></i>
                </span>
                <select 
                  className="form-select border-start-0 border-theme shadow-none"
                  value={filterDistrict}
                  onChange={(e) => setFilterDistrict(e.target.value)}
                >
                  <option value="All">ทุกอำเภอ</option>
                  {districts.filter(d => d !== 'All').map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Keyword Search */}
            <div className="col-12 col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-transparent border-end-0 border-theme">
                  <i className="bi bi-search text-secondary"></i>
                </span>
                <input 
                  type="text" 
                  className="form-control border-start-0 border-theme shadow-none" 
                  placeholder="ค้นหาชื่อศูนย์/สถานที่..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="col-12 col-md-2 d-flex gap-2">
              <button className="btn btn-primary fw-bold flex-grow-1 shadow-sm px-3 border-0">
                ค้นหา
              </button>
              <button 
                className="btn btn-outline-secondary shadow-sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterCapacity('All');
                  setFilterDistrict('All');
                }}
                title="ล้างตัวกรอง"
              >
                <i className="bi bi-arrow-clockwise"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 Summary Bar */}
      <div className="card shadow-sm mb-3 border-0" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="card-body p-2 px-3 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <span className="text-secondary small">จำนวนศูนย์พักพิงที่พบ:</span>
            <span className="badge bg-primary px-3 py-2 rounded-3">{filteredShelters.length} รายการ</span>
          </div>
          <div className="text-secondary small">
            หน้า <span className="fw-bold text-primary">{currentPage}</span> จาก <span className="fw-bold">{totalPages || 1}</span>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-3" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="card-header bg-transparent border-bottom py-3">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-xl-4 text-center text-xl-start">
              <h6 className="mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>
                {(onAction || onEdit) ? '🛠️ รายการศูนย์พักพิงทั้งหมด' : `📍 ความเคลื่อนไหวรายศูนย์ ${timeRange === 1 ? '(วันนี้)' : `(ย้อนหลัง ${timeRange} วัน)`}`}
              </h6>
            </div>
            <div className="col-12 col-md-12 col-xl-8 d-flex justify-content-center justify-content-xl-end">
              <div className="btn-group btn-group-sm p-1 rounded-pill overflow-auto" style={{ backgroundColor: 'rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>
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
          </div>
        </div>
      
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0 text-theme" style={{ fontSize: '0.9rem' }}>
          <thead>
            <tr className="small fw-bold opacity-75">
              <th className="ps-4 py-3" style={{ width: '30%' }}>ชื่อศูนย์ / สถานที่</th>
              <th className="py-3 d-none d-lg-table-cell">ตำบล / อำเภอ</th>
              {timeRange > 0 && <th className="text-center py-3">ความเคลื่อนไหว</th>}
              <th className="text-center py-3">ครองเตียง (%)</th>
              <th className="py-3 d-none d-md-table-cell text-center">ความจุรวม</th>
              <th className="py-3">สถานะ</th>
              <th className="pe-4 py-3 d-none d-xl-table-cell">อัปเดตล่าสุด</th>
              {hasActions && <th className="text-center py-3">ดำเนินการ</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedShelters.map((shelter) => {
              const status = getCapacityStatus(shelter.currentOccupancy, shelter.capacity);
              const movement = getAggregatedMovement(shelter.dailyLogs, timeRange);

              return (
                <tr key={shelter._id} className="border-bottom-theme">
                  <td className="ps-4 py-3">
                    <div className="d-flex align-items-start gap-2">
                      <i className="bi bi-geo-alt-fill text-danger mt-1 d-none d-sm-block"></i>
                      <div>
                        <div className="fw-bold mb-0 text-primary-theme" style={{ fontSize: '0.95rem' }}>{shelter.name}</div>
                        <div className="small text-secondary d-lg-none">
                          {shelter.subdistrict} {shelter.district}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="d-none d-lg-table-cell py-3">
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
                        <span className={`text-${status.color}`}>{status.percent.toFixed(0)}%</span>
                      </div>
                      <div className="progress" style={{ height: '4px' }}>
                        <div className={`progress-bar bg-${status.color}`} style={{ width: `${Math.min(status.percent, 100)}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center fw-bold d-none d-md-table-cell py-3">
                     {shelter.currentOccupancy} / {shelter.capacity}
                  </td>
                  <td className="py-3">
                    <span className={`badge rounded-pill bg-${status.color}-subtle text-${status.color} px-2 py-1`} style={{ fontSize: '0.75rem' }}>
                      {status.text}
                    </span>
                  </td>
                  <td className="pe-4 text-secondary small d-none d-xl-table-cell py-3">
                    {new Date(shelter.updatedAt || Date.now()).toLocaleDateString('th-TH')}
                  </td>
                  {hasActions && (
                    <td className="text-center">
                      <div className="btn-group btn-group-sm">
                        {onAction && (
                          <>
                            <button className="btn btn-success" onClick={() => onAction(shelter._id, 'in')} title="รับเข้า">
                              <i className="bi bi-plus-lg"></i>
                            </button>
                            <button className="btn btn-outline-danger" onClick={() => onAction(shelter._id, 'out')} title="ส่งออก">
                              <i className="bi bi-dash-lg"></i>
                            </button>
                          </>
                        )}
                        {onEdit && (
                            <button className="btn btn-outline-primary ms-1" onClick={() => onEdit(shelter)} title="แก้ไขข้อมูล">
                                <i className="bi bi-pencil-square"></i>
                            </button>
                        )}
                        {onDelete && (
                            <button className="btn btn-outline-secondary" onClick={() => onDelete(shelter._id)} title="ลบข้อมูล">
                                <i className="bi bi-trash"></i>
                            </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    {totalPages > 1 && (
      <div className="d-flex justify-content-center mt-4 mb-4">
        <nav className="custom-pagination">
          <div className="pagination-container d-flex align-items-center">
            <button className="pag-btn" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>«</button>
            <button className="pag-btn" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>‹</button>
            {(() => {
              const pages = [];
              const showRange = 2;
              for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= currentPage - showRange && i <= currentPage + showRange)) {
                  pages.push(
                    <button key={i} className={`pag-btn ${currentPage === i ? 'active' : ''}`} onClick={() => setCurrentPage(i)}>{i}</button>
                  );
                } else if (i === currentPage - showRange - 1 || i === currentPage + showRange + 1) {
                  pages.push(<span key={i} className="pag-ellipsis">...</span>);
                }
              }
              return pages;
            })()}
            <button className="pag-btn" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>›</button>
            <button className="pag-btn" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>»</button>
          </div>
        </nav>
      </div>
    )}

      <style jsx>{`
        .pagination-container {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 50px;
          overflow: hidden;
          padding: 4px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        .pag-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 6px 14px;
          min-width: 40px;
          height: 38px;
          border-radius: 50px;
          transition: all 0.2s;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pag-btn:hover:not(:disabled):not(.active) {
          background-color: var(--table-hover);
          color: var(--text-primary);
        }
        .pag-btn.active {
          background-color: #0d6efd;
          color: white;
          font-weight: bold;
          box-shadow: 0 4px 12px rgba(13, 110, 253, 0.4);
        }
        .pag-btn:disabled {
          color: var(--text-secondary);
          opacity: 0.4;
          cursor: not-allowed;
        }
        .pag-ellipsis {
          padding: 8px 12px;
          color: var(--text-secondary);
          font-size: 0.8rem;
          display: flex;
          align-items: flex-end;
        }
        .border-bottom-theme { border-bottom: 1px solid var(--border-color); }
        .text-primary-theme { color: var(--text-primary); }
        .bg-danger-subtle { background-color: rgba(220, 53, 69, 0.1) !important; }
        .bg-warning-subtle { background-color: rgba(255, 193, 7, 0.1) !important; }
        .bg-success-subtle { background-color: rgba(25, 135, 84, 0.1) !important; }
        .table-hover tbody tr:hover { background-color: var(--table-hover); }
      `}</style>
    </div>
  );
}
