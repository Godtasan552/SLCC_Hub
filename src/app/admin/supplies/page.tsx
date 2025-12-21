'use client'
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { SupplyCategory, Supply, SupplyData } from '@/types/supply';

export default function SuppliesPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  
  const [manualForm, setManualForm] = useState({
    name: '',
    category: SupplyCategory.FOOD_AND_WATER,
    quantity: 0,
    unit: 'ชิ้น',
    description: '',
    shelterName: '',
    supplier: ''
  });

  const fetchSupplies = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'ทั้งหมด') {
        params.append('category', selectedCategory);
      }
      
      const res = await axios.get(`/api/supplies?${params.toString()}`);
      setSupplies(res.data.data);
    } catch (err) {
      console.error('Fetch supplies failed:', err);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchSupplies();
  }, [fetchSupplies]);

  // 1. Manual Entry Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/supplies', manualForm);
      setMessage(`บันทึกข้อมูล \"${manualForm.name}\" เรียบร้อยแล้ว`);
      setManualForm({ 
        name: '', 
        category: SupplyCategory.FOOD_AND_WATER, 
        quantity: 0, 
        unit: 'ชิ้น',
        description: '',
        shelterName: '',
        supplier: ''
      });
      fetchSupplies();
    } catch (err) {
      const errorMessage = axios.isAxiosError(err) ? err.response?.data?.error : (err as Error).message;
      setMessage(`เกิดข้อผิดพลาด: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // 2. JSON & Excel Bulk Import
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage('กำลังประมวลผลไฟล์...');

    try {
      let dataToImport: SupplyData[] = [];

      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const json = JSON.parse(text);
        dataToImport = json.data || json;
      } 
      else if (file.name.endsWith('.xlsx')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.getWorksheet(1);
        
        if (worksheet) {
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) { // Skip header
              dataToImport.push({
                name: String(row.getCell(1).value || ''),
                category: String(row.getCell(2).value || SupplyCategory.OTHER),
                quantity: Number(row.getCell(3).value) || 0,
                unit: String(row.getCell(4).value || 'ชิ้น'),
                description: String(row.getCell(5).value || ''),
                shelterName: String(row.getCell(6).value || ''),
                supplier: String(row.getCell(7).value || '')
              });
            }
          });
        }
      }

      await axios.patch('/api/supplies', { data: dataToImport });
      setMessage('นำเข้าและอัปเดตข้อมูลไฟล์สำเร็จ');
      fetchSupplies();
    } catch (err) {
      setMessage('เกิดข้อผิดพลาดในการประมวลผลไฟล์');
      console.error(err);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  // 3. Delete Supply
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ต้องการลบ "${name}" หรือไม่?`)) return;
    
    try {
      setLoading(true);
      await axios.delete(`/api/supplies/${id}`);
      setMessage(`ลบ "${name}" สำเร็จ`);
      fetchSupplies();
    } catch (err) {
      console.error('Delete failed:', err);
      setMessage('ไม่สามารถลบข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  // 4. Update Quantity
  const handleUpdateQuantity = async (id: string, currentQty: number, name: string) => {
    const val = prompt(`ระบุจำนวนใหม่สำหรับ "${name}":`, String(currentQty));
    if (!val || isNaN(parseInt(val))) return;

    try {
      setLoading(true);
      await axios.put(`/api/supplies/${id}`, { quantity: parseInt(val) });
      fetchSupplies();
      setMessage(`อัพเดทจำนวน "${name}" สำเร็จ`);
    } catch (err) {
      console.error('Update failed:', err);
      setMessage('ไม่สามารถอัปเดตข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const filteredSupplies = supplies.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.shelterName && s.shelterName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Get all categories for dropdown
  const categories = ['ทั้งหมด', ...Object.values(SupplyCategory).filter(c => c !== SupplyCategory.ALL)];

  return (
    <div className="container py-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <h2 className="fw-bold mb-0 text-center text-md-start" style={{ color: 'var(--text-primary)' }}>📦 ระบบจัดการสิ่งของ</h2>
        {message && (
          <div className={`alert ${message.includes('สำเร็จ') ? 'alert-success' : 'alert-danger'} mb-0 py-2 small fw-bold flex-grow-1 text-center`} style={{ maxWidth: '400px' }}>
            {message}
          </div>
        )}
      </div>

      {/* ส่วนหลัก: รายการสิ่งของ */}
      <div className="card shadow-sm border-0 mb-5 overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="card-header bg-info text-white py-3">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-4">
              <h5 className="mb-0 fw-bold"><i className="bi bi-box-seam me-2"></i> รายการสิ่งของทั้งหมด</h5>
            </div>
            <div className="col-12 col-md-4">
              <select 
                className="form-select form-select-sm border-0 shadow-sm"
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
                  className="form-control form-control-sm ps-5 border-0 shadow-sm" 
                  placeholder="ค้นหาชื่อสิ่งของ..."
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive" style={{ maxHeight: '400px' }}>
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light sticky-top">
                <tr className="small text-secondary">
                  <th className="ps-4">ชื่อสิ่งของ</th>
                  <th>หมวดหมู่</th>
                  <th className="text-center">จำนวน</th>
                  <th className="d-none d-md-table-cell">ศูนย์พักพิง</th>
                  <th className="d-none d-lg-table-cell">ผู้บริจาค</th>
                  <th className="text-end pe-4">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredSupplies.map((s) => (
                  <tr key={s._id}>
                    <td className="ps-4">
                      <div className="fw-bold" style={{ color: 'var(--text-primary)' }}>{s.name}</div>
                      {s.description && <div className="small text-secondary">{s.description}</div>}
                    </td>
                    <td>
                      <span className="badge bg-secondary">{s.category}</span>
                    </td>
                    <td className="text-center">
                      <span className="badge bg-primary">{s.quantity} {s.unit}</span>
                    </td>
                    <td className="d-none d-md-table-cell" style={{ color: 'var(--text-secondary)' }}>
                      {s.shelterName || '-'}
                    </td>
                    <td className="d-none d-lg-table-cell" style={{ color: 'var(--text-secondary)' }}>
                      {s.supplier || '-'}
                    </td>
                    <td className="text-end pe-4">
                      <div className="btn-group btn-group-sm">
                        <button 
                          className="btn btn-outline-primary" 
                          onClick={() => handleUpdateQuantity(s._id, s.quantity, s.name)}
                          title="แก้ไขจำนวน"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button 
                          className="btn btn-outline-danger" 
                          onClick={() => handleDelete(s._id, s.name)}
                          title="ลบ"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSupplies.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-secondary">
                      ไม่พบข้อมูลสิ่งของ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* คีย์ข้อมูลเอง (Manual Entry) */}
        <div className="col-md-6">
          <div className="card shadow-sm border-0 h-100" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            <div className="card-header bg-primary text-white py-3">
              <h5 className="mb-0 fw-bold"><i className="bi bi-plus-circle me-2"></i> เพิ่มสิ่งของใหม่</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleManualSubmit}>
                <div className="mb-3">
                  <label className="form-label small fw-bold">ชื่อสิ่งของ</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={manualForm.name} 
                    onChange={(e) => setManualForm({...manualForm, name: e.target.value})} 
                    required 
                  />
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label small fw-bold">หมวดหมู่</label>
                    <select 
                      className="form-select" 
                      value={manualForm.category} 
                      onChange={(e) => setManualForm({...manualForm, category: e.target.value as SupplyCategory})}
                    >
                      {Object.values(SupplyCategory).filter(c => c !== 'ทั้งหมด').map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label small fw-bold">จำนวน</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={manualForm.quantity} 
                      onChange={(e) => setManualForm({...manualForm, quantity: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label small fw-bold">หน่วย</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={manualForm.unit} 
                      onChange={(e) => setManualForm({...manualForm, unit: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">รายละเอียด</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={manualForm.description} 
                    onChange={(e) => setManualForm({...manualForm, description: e.target.value})} 
                  />
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label small fw-bold">ศูนย์พักพิง</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={manualForm.shelterName} 
                      onChange={(e) => setManualForm({...manualForm, shelterName: e.target.value})} 
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label small fw-bold">ผู้บริจาค</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={manualForm.supplier} 
                      onChange={(e) => setManualForm({...manualForm, supplier: e.target.value})} 
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-100 fw-bold" disabled={loading}>บันทึกข้อมูล</button>
              </form>
            </div>
          </div>
        </div>

        {/* นำเข้าไฟล์ (Import) */}
        <div className="col-md-6">
          <div className="card shadow-sm border-0 h-100" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            <div className="card-header bg-dark text-white py-3">
              <h5 className="mb-0 fw-bold"><i className="bi bi-file-earmark-spreadsheet me-2"></i> นำเข้าผ่าน Excel/JSON</h5>
            </div>
            <div className="card-body text-center p-5">
              <div className="upload-zone p-4" onClick={() => document.getElementById('fileIn')?.click()}>
                <i className="bi bi-cloud-arrow-up text-primary fs-1"></i>
                <h5 className="mt-3">เลือกไฟล์นำเข้าข้อมูล</h5>
                <p className="small text-secondary mb-3">
                  รองรับไฟล์ .json และ .xlsx<br/>
                  <strong>รูปแบบ Excel:</strong> ชื่อ | หมวดหมู่ | จำนวน | หน่วย | รายละเอียด | ศูนย์พักพิง | ผู้บริจาค
                </p>
                <input type="file" id="fileIn" className="d-none" accept=".json,.xlsx" onChange={handleFileUpload} />
                <button className="btn btn-outline-primary mt-2">Browse File</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .upload-zone {
          border: 2px dashed var(--border-color);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .upload-zone:hover {
          background: rgba(13, 110, 253, 0.05);
          border-color: #0d6efd;
        }
      `}</style>
    </div>
  );
}
