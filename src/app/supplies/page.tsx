'use client'
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { SupplyCategory, Supply } from '@/types/supply';

export default function SuppliesListPage() {
  const [loading, setLoading] = useState(false);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [selectedShelter, setSelectedShelter] = useState('ทั้งหมด');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'category'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchSupplies = useCallback(async () => {
    try {
      setLoading(true);
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

  // Get unique shelters for filter
  const shelters = ['ทั้งหมด', ...Array.from(new Set(supplies.map(s => s.shelterName).filter(Boolean)))];

  // Filter and sort supplies
  const filteredAndSortedSupplies = supplies
    .filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesShelter = selectedShelter === 'ทั้งหมด' || s.shelterName === selectedShelter;
      return matchesSearch && matchesShelter;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'th');
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category, 'th');
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Get all categories for dropdown
  const categories = ['ทั้งหมด', ...Object.values(SupplyCategory).filter(c => c !== SupplyCategory.ALL)];

  // Calculate statistics
  const totalItems = filteredAndSortedSupplies.length;
  const totalQuantity = filteredAndSortedSupplies.reduce((sum, s) => sum + s.quantity, 0);
  const categoriesCount = new Set(filteredAndSortedSupplies.map(s => s.category)).size;

  // Get category badge color
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'อาหารและน้ำดื่ม': 'success',
      'วัตถุดิบประกอบอาหาร': 'success',
      'ยา และเวชภัณฑ์': 'danger',
      'อุปกรณ์ปฐมพยาบาล': 'danger',
      'เสื้อผ้า และรองเท้า': 'info',
      'ผ้าห่ม และหมอน': 'info',
      'อุปกรณ์ป้องกันส่วนบุคคล (PPE)': 'warning',
      'สิ่งของเครื่องใช้': 'primary',
      'อุปกรณ์ทำความสะอาด': 'primary',
    };
    return colors[category] || 'secondary';
  };

  return (
    <div className="container py-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          <i className="bi bi-box-seam-fill me-2"></i>
          รายการสิ่งของทั้งหมด
        </h2>
        <p className="text-secondary mb-0">ค้นหาและดูรายละเอียดสิ่งของในระบบ</p>
      </div>

      {/* Statistics Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-primary bg-opacity-10 rounded-3 p-3">
                    <i className="bi bi-box-seam fs-3 text-primary"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <div className="small text-secondary">รายการทั้งหมด</div>
                  <div className="h4 mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>{totalItems}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-success bg-opacity-10 rounded-3 p-3">
                    <i className="bi bi-stack fs-3 text-success"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <div className="small text-secondary">จำนวนรวม</div>
                  <div className="h4 mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>{totalQuantity.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="card-body">
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <div className="bg-info bg-opacity-10 rounded-3 p-3">
                    <i className="bi bi-tags fs-3 text-info"></i>
                  </div>
                </div>
                <div className="flex-grow-1 ms-3">
                  <div className="small text-secondary">หมวดหมู่</div>
                  <div className="h4 mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>{categoriesCount}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-4" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="card-body">
          <div className="row g-3">
            {/* Search */}
            <div className="col-md-4">
              <label className="form-label small fw-bold" style={{ color: 'var(--text-primary)' }}>
                <i className="bi bi-search me-1"></i>ค้นหา
              </label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="ค้นหาชื่อสิ่งของ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <div className="col-md-3">
              <label className="form-label small fw-bold" style={{ color: 'var(--text-primary)' }}>
                <i className="bi bi-funnel me-1"></i>หมวดหมู่
              </label>
              <select 
                className="form-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Shelter Filter */}
            <div className="col-md-3">
              <label className="form-label small fw-bold" style={{ color: 'var(--text-primary)' }}>
                <i className="bi bi-geo-alt me-1"></i>ศูนย์พักพิง
              </label>
              <select 
                className="form-select"
                value={selectedShelter}
                onChange={(e) => setSelectedShelter(e.target.value)}
              >
                {shelters.map((shelter, idx) => (
                  <option key={idx} value={shelter}>{shelter || '-'}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="col-md-2">
              <label className="form-label small fw-bold" style={{ color: 'var(--text-primary)' }}>
                <i className="bi bi-sort-down me-1"></i>เรียงตาม
              </label>
              <div className="input-group">
                <select 
                  className="form-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'quantity' | 'category')}
                >
                  <option value="name">ชื่อ</option>
                  <option value="quantity">จำนวน</option>
                  <option value="category">หมวดหมู่</option>
                </select>
                <button 
                  className="btn btn-outline-secondary"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  title={sortOrder === 'asc' ? 'น้อยไปมาก' : 'มากไปน้อย'}
                >
                  <i className={`bi bi-sort-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Supplies List */}
      <div className="card border-0 shadow-sm" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="card-header bg-primary text-white py-3">
          <h5 className="mb-0 fw-bold">
            <i className="bi bi-list-ul me-2"></i>
            รายการสิ่งของ ({filteredAndSortedSupplies.length})
          </h5>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <div className="mt-2 text-secondary">กำลังโหลดข้อมูล...</div>
            </div>
          ) : filteredAndSortedSupplies.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-inbox fs-1 text-secondary"></i>
              <div className="mt-2 text-secondary">ไม่พบข้อมูลสิ่งของ</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="small text-secondary">
                    <th className="ps-4" style={{ width: '5%' }}>#</th>
                    <th style={{ width: '25%' }}>ชื่อสิ่งของ</th>
                    <th style={{ width: '20%' }}>หมวดหมู่</th>
                    <th className="text-center" style={{ width: '12%' }}>จำนวน</th>
                    <th className="d-none d-md-table-cell" style={{ width: '18%' }}>ศูนย์พักพิง</th>
                    <th className="d-none d-lg-table-cell" style={{ width: '15%' }}>ผู้บริจาค</th>
                    <th className="d-none d-xl-table-cell pe-4" style={{ width: '5%' }}>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedSupplies.map((supply, index) => (
                    <tr key={supply._id}>
                      <td className="ps-4 text-secondary">{index + 1}</td>
                      <td>
                        <div className="fw-bold" style={{ color: 'var(--text-primary)' }}>
                          {supply.name}
                        </div>
                        {supply.description && (
                          <div className="small text-secondary text-truncate" style={{ maxWidth: '300px' }}>
                            {supply.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge bg-${getCategoryColor(supply.category)}`}>
                          {supply.category}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="fw-bold" style={{ color: 'var(--text-primary)' }}>
                          {supply.quantity.toLocaleString()}
                        </div>
                        <div className="small text-secondary">{supply.unit}</div>
                      </td>
                      <td className="d-none d-md-table-cell">
                        <div style={{ color: 'var(--text-secondary)' }}>
                          {supply.shelterName ? (
                            <>
                              <i className="bi bi-geo-alt-fill me-1"></i>
                              {supply.shelterName}
                            </>
                          ) : (
                            <span className="text-secondary">-</span>
                          )}
                        </div>
                      </td>
                      <td className="d-none d-lg-table-cell">
                        <div style={{ color: 'var(--text-secondary)' }}>
                          {supply.supplier ? (
                            <>
                              <i className="bi bi-person-fill me-1"></i>
                              {supply.supplier}
                            </>
                          ) : (
                            <span className="text-secondary">-</span>
                          )}
                        </div>
                      </td>
                      <td className="d-none d-xl-table-cell pe-4">
                        {supply.quantity > 0 ? (
                          <span className="badge bg-success">
                            <i className="bi bi-check-circle-fill"></i>
                          </span>
                        ) : (
                          <span className="badge bg-danger">
                            <i className="bi bi-x-circle-fill"></i>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Summary Footer */}
      {filteredAndSortedSupplies.length > 0 && (
        <div className="mt-3 text-center text-secondary small">
          แสดง {filteredAndSortedSupplies.length} รายการจากทั้งหมด {supplies.length} รายการ
        </div>
      )}
    </div>
  );
}
