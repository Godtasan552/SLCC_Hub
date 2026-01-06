'use client'
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { SupplyCategory, Supply } from '@/types/supply';

export default function SuppliesPage() {
  const [loading, setLoading] = useState(false);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');

  const fetchSupplies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'ทั้งหมด') {
        params.append('category', selectedCategory);
      }
      
      const res = await axios.get(`/api/supplies?${params.toString()}`);
      setSupplies(res.data.data);
    } catch (err) {
      console.error('Fetch supplies failed:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchSupplies();
  }, [fetchSupplies]);

  const filteredSupplies = supplies.filter(s => {
    const isDisbursement = s.description?.toLowerCase().includes('disbursement') || s.description?.includes('เบิกจ่าย');
    if (isDisbursement) return false;

    return s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           (s.shelterName && s.shelterName.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const categories = ['ทั้งหมด', ...Object.values(SupplyCategory).filter(c => c !== SupplyCategory.ALL)];

  return (
    <div className="container-fluid px-4 py-4" style={{ maxWidth: '1600px', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-end mb-4 gap-3">
        <div>
           <div className="d-flex align-items-center mb-2">
                <span className="badge bg-primary rounded-circle p-2 me-2"><i className="bi bi-box-seam-fill fs-5 text-white"></i></span>
                <h4 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>ระบบพัสดุและสิ่งของ</h4>
           </div>
           <p className="text-secondary small mb-0 ps-1">รายการสิ่งของบริจาคและทรัพยากรคงคลังภายในศูนย์</p>
        </div>
      </div>

      {/* Inventory List Only */}
      <div className="animate-fade-in">
          <div className="card shadow-sm border-0 mb-5 overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="card-header bg-transparent border-bottom py-3">
                  <div className="row g-3 align-items-center">
                      <div className="col-12 col-md-4">
                          <h6 className="mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>รายการคงคลังทั้งหมด ({supplies.length})</h6>
                      </div>
                      <div className="col-12 col-md-4">
                          <select 
                              className="form-select form-select-sm border-theme shadow-sm"
                              value={selectedCategory}
                              onChange={(e) => setSelectedCategory(e.target.value)}
                          >
                              {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                              ))}
                          </select>
                      </div>
                      <div className="col-12 col-md-4">
                          <div className="position-relative">
                              <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary"></i>
                              <input 
                              type="text" 
                              className="form-control form-control-sm ps-5 border-theme shadow-sm" 
                              placeholder="ค้นหาชื่อสิ่งของ / ศูนย์..."
                              onChange={(e) => setSearchTerm(e.target.value)}
                              />
                          </div>
                      </div>
                  </div>
              </div>
              <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0 text-theme">
                      <thead className="sticky-top">
                          <tr className="small text-secondary">
                              <th className="ps-4">ชื่อสิ่งของ</th>
                              <th>หมวดหมู่</th>
                              <th className="text-center">จำนวน</th>
                              <th className="d-none d-md-table-cell">ศูนย์พักพิง</th>
                              <th className="d-none d-lg-table-cell">ผู้บริจาค</th>
                          </tr>
                      </thead>
                      <tbody>
                          {filteredSupplies.map((s) => (
                          <tr key={s._id} className="border-bottom-theme">
                              <td className="ps-4">
                                  <div className="fw-bold text-primary-theme">{s.name}</div>
                                  {s.description && <div className="small text-secondary">{s.description}</div>}
                              </td>
                              <td>
                                  <span className="badge bg-secondary-subtle text-secondary border border-secondary fw-normal">{s.category}</span>
                              </td>
                              <td className="text-center">
                                  <span className={`badge ${s.quantity === 0 ? 'bg-danger' : s.quantity < 10 ? 'bg-warning text-dark' : 'bg-success'} rounded-pill px-3`}>
                                      {s.quantity} {s.unit}
                                  </span>
                              </td>
                              <td className="d-none d-md-table-cell text-secondary small">
                                  {s.shelterName || '-'}
                              </td>
                              <td className="d-none d-lg-table-cell text-secondary small">
                                  {s.supplier || '-'}
                              </td>
                          </tr>
                          ))}
                          {filteredSupplies.length === 0 && (
                              <tr>
                                  <td colSpan={5} className="text-center py-5 text-secondary">
                                      {loading ? (
                                           <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                                      ) : (
                                          <i className="bi bi-inbox fs-1 d-block mb-3 opacity-50"></i>
                                      )}
                                      {loading ? 'กำลังโหลดข้อมูล...' : 'ไม่พบข้อมูลสิ่งของ'}
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      <style jsx>{`
        .border-theme { border: 1px solid var(--border-color); }
        .border-bottom-theme { border-bottom: 1px solid var(--border-color); }
        .text-primary-theme { color: var(--text-primary); }
        .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
