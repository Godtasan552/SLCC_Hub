'use client'
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { SupplyCategory, Supply, SupplyData } from '@/types/supply';

export default function SuppliesPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'management'>('inventory');
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

  const showToast = (msg: string, isError = false) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  // 1. Manual Entry Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/supplies', manualForm);
      showToast(`บันทึกข้อมูล \"${manualForm.name}\" เรียบร้อยแล้ว`);
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
       // @ts-expect-error: Error response type
      const errorMessage = err.response?.data?.error || err.message;
      showToast(`เกิดข้อผิดพลาด: ${errorMessage}`, true);
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
      showToast('นำเข้าและอัปเดตข้อมูลไฟล์สำเร็จ');
      fetchSupplies();
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการประมวลผลไฟล์', true);
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
      showToast(`ลบ "${name}" สำเร็จ`);
      fetchSupplies();
    } catch (err) {
      console.error('Delete failed:', err);
      showToast('ไม่สามารถลบข้อมูลได้', true);
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
      showToast(`อัพเดทจำนวน "${name}" สำเร็จ`);
    } catch (err) {
      console.error('Update failed:', err);
      showToast('ไม่สามารถอัปเดตข้อมูลได้', true);
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
    <div className="container-fluid px-4 py-4" style={{ maxWidth: '1600px', minHeight: '100vh', backgroundColor: 'var(--bg-body)' }}>
      
      {/* 1. Header & Tabs */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-end mb-4 gap-3">
        <div>
           <div className="d-flex align-items-center mb-2">
                <span className="badge bg-primary rounded-circle p-2 me-2"><i className="bi bi-box-seam-fill fs-5 text-white"></i></span>
                <h4 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>ระบบจัดการคลังสินค้า</h4>
           </div>
           <p className="text-secondary small mb-0 ps-1">ระบบบริหารจัดการทรัพยากร สิ่งของบริจาค และเวชภัณฑ์</p>
        </div>
        
        {/* Tab Navigation */}
        <div className="bg-white dark-mode-bg rounded-pill p-1 shadow-sm d-flex" style={{ border: '1px solid var(--border-color)' }}>
            <button 
                className={`btn btn-sm rounded-pill px-4 fw-bold transition-all ${activeTab === 'inventory' ? 'btn-primary shadow-sm' : 'text-secondary hover-bg-light'}`}
                onClick={() => setActiveTab('inventory')}
            >
                <i className="bi bi-list-ul me-2"></i>รายการสินค้า
            </button>
            <button 
                className={`btn btn-sm rounded-pill px-4 fw-bold transition-all ${activeTab === 'management' ? 'btn-primary shadow-sm' : 'text-secondary hover-bg-light'}`}
                onClick={() => setActiveTab('management')}
            >
                <i className="bi bi-database-gear me-2"></i>จัดการสต็อก
            </button>
        </div>
      </div>

       {/* Alert Toast (Fixed Top) */}
       {message && (
         <div className="position-fixed top-0 start-50 translate-middle-x mt-4 z-index-toast" style={{ zIndex: 1050 }}>
            <div className={`alert ${message.includes('Error') || message.includes('ผิดพลาด') ? 'alert-danger' : 'alert-success'} shadow-lg d-flex align-items-center py-2 px-4 rounded-pill border-0`}>
             <i className={`bi ${message.includes('Error') ? 'bi-x-circle-fill' : 'bi-check-circle-fill'} me-2 fs-5`}></i>
             <span className="fw-bold">{message}</span>
           </div>
         </div>
      )}

      {/* 2. Content Area */}
      <div className="animate-fade-in">
        
        {/* TAB 1: Inventory List */}
        {activeTab === 'inventory' && (
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
                                    <td colSpan={6} className="text-center py-5 text-secondary">
                                        <i className="bi bi-inbox fs-1 d-block mb-3 opacity-50"></i>
                                        ไม่พบข้อมูลสิ่งของ
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* TAB 2: Management (Add/Import) */}
        {activeTab === 'management' && (
            <div className="row g-4">
                {/* Manual Add */}
                <div className="col-lg-7">
                    <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: 'var(--bg-card)' }}>
                        <div className="card-header bg-transparent border-bottom py-3 px-4">
                            <h6 className="mb-0 fw-bold text-primary"><i className="bi bi-plus-circle me-2"></i>ลงทะเบียนสิ่งของใหม่</h6>
                        </div>
                        <div className="card-body p-4">
                            <form onSubmit={handleManualSubmit}>
                                <div className="row g-3">
                                    <div className="col-12">
                                        <label className="form-label small fw-bold text-secondary">ชื่อสิ่งของ</label>
                                        <input 
                                            type="text" 
                                            className="form-control border" 
                                            value={manualForm.name} 
                                            onChange={(e) => setManualForm({...manualForm, name: e.target.value})} 
                                            required 
                                            placeholder="เช่น ข้าวสาร 5 กก., ยาพารา..."
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-secondary">หมวดหมู่</label>
                                        <select 
                                            className="form-select border" 
                                            value={manualForm.category} 
                                            onChange={(e) => setManualForm({...manualForm, category: e.target.value as SupplyCategory})}
                                        >
                                            {Object.values(SupplyCategory).filter(c => c !== 'ทั้งหมด').map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label small fw-bold text-secondary">จำนวน</label>
                                        <input 
                                            type="number" 
                                            className="form-control border" 
                                            value={manualForm.quantity} 
                                            onChange={(e) => setManualForm({...manualForm, quantity: Number(e.target.value)})} 
                                        />
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label small fw-bold text-secondary">หน่วย</label>
                                        <input 
                                            type="text" 
                                            className="form-control border" 
                                            value={manualForm.unit} 
                                            onChange={(e) => setManualForm({...manualForm, unit: e.target.value})} 
                                            placeholder="ชิ้น, กล่อง..."
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label small fw-bold text-secondary">รายละเอียดเพิ่มเติม</label>
                                        <input 
                                            type="text" 
                                            className="form-control border" 
                                            value={manualForm.description} 
                                            onChange={(e) => setManualForm({...manualForm, description: e.target.value})} 
                                            placeholder="ระบุรายละเอียด เช่น วันหมดอายุ..."
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-secondary">ศูนย์พักพิง</label>
                                        <input 
                                            type="text" 
                                            className="form-control border" 
                                            value={manualForm.shelterName} 
                                            onChange={(e) => setManualForm({...manualForm, shelterName: e.target.value})} 
                                            placeholder="ระบุชื่อศูนย์ (ถ้ามี)"
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-secondary">ผู้บริจาค</label>
                                        <input 
                                            type="text" 
                                            className="form-control border" 
                                            value={manualForm.supplier} 
                                            onChange={(e) => setManualForm({...manualForm, supplier: e.target.value})} 
                                            placeholder="ระบุชื่อผู้บริจาค..."
                                        />
                                    </div>
                                    <div className="col-12 mt-4 pt-2">
                                        <button type="submit" className="btn btn-primary w-100 py-2 rounded-3 fw-bold shadow-sm" disabled={loading}>
                                            <i className="bi bi-save me-2"></i>บันทึกข้อมูล
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Import File */}
                <div className="col-lg-5">
                    <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: 'var(--bg-card)' }}>
                         <div className="card-header bg-transparent border-bottom py-3 px-4">
                            <h6 className="mb-0 fw-bold text-success"><i className="bi bi-file-earmark-excel me-2"></i>นำเข้า Excel / JSON</h6>
                        </div>
                        <div className="card-body p-4 d-flex flex-column justify-content-center text-center">
                            <div className="upload-box p-5 rounded-4 border-2 border-dashed mb-3 cursor-pointer transition-all" onClick={() => document.getElementById('fileIn')?.click()}>
                                <i className="bi bi-cloud-arrow-up-fill text-success" style={{ fontSize: '3rem', opacity: 0.8 }}></i>
                                <h5 className="mt-3 fw-bold" style={{ color: 'var(--text-primary)' }}>ลากไฟล์มาวาง หรือ คลิกเพื่อเลือกไฟล์</h5>
                                <p className="text-secondary small">รองรับไฟล์มาตรฐาน .xlsx และ .json</p>
                                <button className="btn btn-outline-success btn-sm rounded-pill px-4 mt-2">
                                    Browse Files
                                </button>
                                <input type="file" id="fileIn" className="d-none" accept=".json,.xlsx" onChange={handleFileUpload} />
                            </div>
                            <div className="alert alert-light border small text-start gap-2">
                                <div className="d-flex align-items-center mb-1">
                                    <i className="bi bi-info-circle text-primary me-2"></i>
                                    <span className="fw-bold">รูปแบบไฟล์ Excel Column:</span>
                                </div>
                                <div className="text-secondary ms-4" style={{ fontSize: '0.85rem' }}>
                                    ชื่อ | หมวดหมู่ | จำนวน | หน่วย | รายละเอียด | ศูนย์พักพิง | ผู้บริจาค
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      <style jsx>{`
        .cursor-pointer { cursor: pointer; }
        .upload-box {
            border: 2px dashed var(--border-color);
            background-color: var(--bg-secondary);
        }
        .upload-box:hover {
            border-color: #198754;
            background-color: rgba(25, 135, 84, 0.05);
             transform: translateY(-2px);
        }
        .dark-mode-bg {
             background-color: var(--bg-card) !important;
        }
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
