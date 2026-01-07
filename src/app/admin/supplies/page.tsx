'use client'
import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs';
import Link from 'next/link';
import { SupplyCategory, Supply, SupplyData } from '@/types/supply';
import { getItemsByCategory } from '@/constants/standardItems';
import { showAlert } from '@/utils/swal-utils';

interface Shelter {
  _id: string;
  name: string;
  isHub?: boolean; // Add this
}

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SuppliesPageContent() {
  const searchParams = useSearchParams();
  const hubFilter = searchParams.get('hub');
  
  const [activeTab, setActiveTab] = useState<'inventory' | 'management'>('inventory');
  const [activeImportSchema, setActiveImportSchema] = useState<'excel' | 'json'>('excel');
  const [viewMode, setViewMode] = useState<'hubs' | 'shelters' | 'all'>('hubs');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [hubs, setHubs] = useState<Shelter[]>([]);
  const [allLocations, setAllLocations] = useState<Shelter[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [manualForm, setManualForm] = useState({
    name: '',
    category: SupplyCategory.FOOD_AND_WATER,
    quantity: '' as string | number,
    unit: 'ชิ้น',
    description: '',
    shelterId: hubFilter || '', // Pre-fill if hub param exists
    shelterName: 'คลังกลาง (Central Hub)',
    supplier: ''
  });

  // Pre-fill shelterName if hubFilter exists
  useEffect(() => {
    if (hubFilter && hubs.length > 0) {
        const found = hubs.find(h => h._id === hubFilter);
        if (found) {
            setManualForm(prev => ({ ...prev, shelterId: found._id, shelterName: found.name }));
        }
    }
  }, [hubFilter, hubs]);

  const availableItems = useMemo(() => 
    getItemsByCategory(manualForm.category as SupplyCategory),
    [manualForm.category]
  );

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
    const fetchLocations = async () => {
      try {
        const [shelterRes, hubRes] = await Promise.all([
          axios.get('/api/shelters'),
          axios.get('/api/hubs')
        ]);
        
        const hubList = hubRes.data.data.map((h: Shelter) => ({ ...h, isHub: true }));
        const shelterList = shelterRes.data.data.map((s: Shelter) => ({ ...s, isHub: false }));
        
        setHubs(hubList);
        setAllLocations([...hubList, ...shelterList]);
        
        // Auto-select the first hub if it's currently empty
        if (hubList.length > 0 && !manualForm.shelterId) {
          setManualForm(prev => ({ 
            ...prev, 
            shelterId: hubList[0]._id, 
            shelterName: hubList[0].name 
          }));
        }
      } catch (err) {
        console.error('Fetch locations failed:', err);
      }
    };
    fetchLocations();
  }, [fetchSupplies, manualForm.shelterId]);

  const handleCategoryChange = (category: SupplyCategory) => {
    setManualForm({
      ...manualForm,
      category,
      name: '',
      unit: ''
    });
  };

  const handleShelterChange = (id: string) => {
    const loc = allLocations.find(s => s._id === id);
    if (loc) {
      setManualForm({ ...manualForm, shelterId: id, shelterName: loc.name });
    }
  };



  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...manualForm,
        quantity: Number(manualForm.quantity) || 0,
        shelterId: manualForm.shelterId || null
      };

      if (payload.quantity < 0) {
        showAlert.error('ข้อมูลไม่ถูกต้อง', 'จำนวนต้องไม่ติดลบ');
        setLoading(false);
        return;
      }

      await axios.post('/api/supplies', payload);
      showAlert.success('บันทึกสำเร็จ', `บันทึกข้อมูล "${manualForm.name}" เรียบร้อยแล้ว`);
      setManualForm({ 
        name: '', 
        category: SupplyCategory.FOOD_AND_WATER, 
        quantity: '', 
        unit: 'ชิ้น',
        description: '',
        shelterId: '',
        shelterName: 'คลังกลาง (Central Hub)',
        supplier: ''
      });
      fetchSupplies();
    } catch (err) {
       // @ts-expect-error: Error response type
      const errorMessage = err.response?.data?.error || err.message;
      showAlert.error('ผิดพลาด', `เกิดข้อผิดพลาด: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setUploadProgress(0);
    setMessage('กำลังประมวลผลไฟล์...');

    try {
      let dataToImport: SupplyData[] = [];
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const json = JSON.parse(text);
        dataToImport = json.data || json;
      } else if (file.name.endsWith('.xlsx')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.getWorksheet(1);
        if (worksheet) {
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
              dataToImport.push({
                name: String(row.getCell(1).value || ''),
                category: String(row.getCell(2).value || SupplyCategory.OTHER),
                quantity: Number(row.getCell(3).value) || 0,
                unit: String(row.getCell(4).value || 'ชิ้น'),
                description: String(row.getCell(5).value || ''),
                shelterId: undefined, // Default to hub if imported
                shelterName: String(row.getCell(6).value || 'คลังกลาง (Central Hub)'),
                supplier: String(row.getCell(7).value || '')
              });
            }
          });
        }
      }
      
      await axios.patch('/api/supplies', { data: dataToImport }, {
        onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(percent);
            }
        }
      });
      
      showAlert.success('สำเร็จ', 'นำเข้าและอัปเดตข้อมูลไฟล์สำเร็จ');
      fetchSupplies();
    } catch (err) {
      showAlert.error('ผิดพลาด', 'เกิดข้อผิดพลาดในการประมวลผลไฟล์');
      console.error(err);
    } finally {
      setLoading(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const isConfirmed = await showAlert.confirmDelete('ยืนยันการลบ?', `ต้องการลบ "${name}" หรือไม่?`);
    if (!isConfirmed) return;
    try {
      setLoading(true);
      await axios.delete(`/api/supplies/${id}`);
      showAlert.success('สำเร็จ', `ลบ "${name}" สำเร็จ`);
      fetchSupplies();
    } catch (err) {
      console.error('Delete failed:', err);
      showAlert.error('ผิดพลาด', 'ไม่สามารถลบข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (id: string, currentQty: number, name: string) => {
    const val = await showAlert.numberPrompt(`แก้ไขจำนวน: ${name}`, 'ระบุจำนวนใหม่ที่ต้องการ:', currentQty);
    if (val === undefined || val === null) return;
    
    const newQty = parseInt(val);
    if (newQty < 0) {
      showAlert.error('ผิดพลาด', 'จำนวนเงินต้องไม่ติดลบ');
      return;
    }

    try {
      setLoading(true);
      await axios.put(`/api/supplies/${id}`, { quantity: newQty });
      fetchSupplies();
      showAlert.success('อัพเดทสำเร็จ', `อัพเดทจำนวน "${name}" สำเร็จ`);
    } catch (err) {
      console.error('Update failed:', err);
      showAlert.error('ผิดพลาด', 'ไม่สามารถอัปเดตข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const hubIds = useMemo(() => new Set(hubs.map(h => h._id)), [hubs]);

  const filteredSupplies = useMemo(() => {
    return supplies.filter(s => {
      // 1. Search filter
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (s.shelterName && s.shelterName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // 2. Deep Hub ID filter (from query param)
      const matchesUrlHub = hubFilter ? s.shelterId === hubFilter : true;
      
      // 3. View Mode filter (The fix for disbursed items confusion)
      const matchesViewMode = !s.description?.includes('Disbursement') && !s.description?.includes('เบิกจ่าย');
      const isActuallyHub = !s.shelterId || hubIds.has(s.shelterId) || !!(s.shelterName && /คลังกลาง|Hub/i.test(s.shelterName));
      
      let viewMatches = true;
      if (viewMode === 'hubs') {
        viewMatches = isActuallyHub;
      } else if (viewMode === 'shelters') {
        viewMatches = !isActuallyHub;
      }
      
      return matchesSearch && matchesUrlHub && matchesViewMode && viewMatches;
    });
  }, [supplies, searchTerm, hubFilter, viewMode, hubIds]);

  const categories = ['ทั้งหมด', ...Object.values(SupplyCategory).filter(c => c !== SupplyCategory.ALL)];

  return (
    <div className="container-fluid px-4 py-4" style={{ maxWidth: '1600px', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-end mb-4 gap-3">
        <div>
           <div className="d-flex align-items-center mb-2">
                <span className="badge bg-primary rounded-circle p-2 me-2" style={{ display: 'inline-flex', width: '40px', height: '40px', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="bi bi-box-seam-fill fs-5 text-white"></i>
                </span>
                <h4 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>ระบบจัดการคลังสินค้า</h4>
           </div>
           <p className="text-secondary small mb-0 ps-1">ระบบบริหารจัดการทรัพยากร สิ่งของบริจาค และเวชภัณฑ์</p>
        </div>
        <div className="bg-secondary rounded-pill p-1 shadow-sm d-flex" style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
            <button 
                className={`btn btn-sm rounded-pill px-4 fw-bold transition-all ${activeTab === 'inventory' ? 'btn-primary shadow-sm text-white' : 'text-white'}`} 
                style={{ opacity: activeTab === 'inventory' ? 1 : 0.75 }}
                onClick={() => setActiveTab('inventory')}
            >
                <i className="bi bi-list-ul me-2"></i>รายการสินค้า
            </button>
            <button 
                className={`btn btn-sm rounded-pill px-4 fw-bold transition-all ${activeTab === 'management' ? 'btn-primary shadow-sm text-white' : 'text-white'}`} 
                style={{ opacity: activeTab === 'management' ? 1 : 0.75 }}
                onClick={() => setActiveTab('management')}
            >
                <i className="bi bi-database-gear me-2"></i>จัดการสต็อก
            </button>
        </div>
      </div>



      <div className="animate-fade-in">
        {activeTab === 'inventory' && (
            <div className="card shadow-sm border-0 mb-5 overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
                <div className="card-header bg-transparent border-bottom py-3">
                    <div className="row g-3 align-items-center">
                        <div className="col-12 col-md-3">
                            <h6 className="mb-0 fw-bold d-flex align-items-center" style={{ color: 'var(--text-primary)' }}>
                                <i className="bi bi-box-fill me-2 text-primary"></i>
                                รายการ ({filteredSupplies.length})
                                {hubFilter && (
                                    <Link href="/admin/supplies" className="ms-2 badge bg-primary text-white text-decoration-none shadow-sm pb-1">
                                        <i className="bi bi-x-circle me-1"></i>เฉพาะคลังนี้
                                    </Link>
                                )}
                            </h6>
                        </div>
                        <div className="col-12 col-md-5 d-flex gap-2">
                            {/* View Mode Toggle */}
                            <div className="btn-group btn-group-sm p-1 rounded-pill border" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                <button className={`btn btn-sm rounded-pill px-3 ${viewMode === 'hubs' ? 'btn-primary shadow-sm text-white' : 'text-white'}`} style={{ opacity: viewMode === 'hubs' ? 1 : 0.75 }} onClick={() => setViewMode('hubs')}>🏢 คลังกลาง</button>
                                <button className={`btn btn-sm rounded-pill px-3 ${viewMode === 'all' ? 'btn-primary shadow-sm text-white' : 'text-white'}`} style={{ opacity: viewMode === 'all' ? 1 : 0.75 }} onClick={() => setViewMode('all')}>ทั้งหมด</button>
                            </div>
                            
                            <select className="form-select form-select-sm border-theme shadow-sm fw-bold w-auto rounded-pill" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                                {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                            </select>
                        </div>
                        <div className="col-12 col-md-4">
                            <div className="position-relative">
                                <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-secondary"></i>
                                <input type="text" className="form-control form-control-sm ps-5 border-theme shadow-sm rounded-pill" placeholder="ค้นหาชื่อสิ่งของ..." onChange={(e) => setSearchTerm(e.target.value)} />
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
                                <th className="d-none d-md-table-cell">ศูนย์พักพิง/สถานที่เก็บ</th>
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
                                <td><span className="badge bg-secondary-subtle text-secondary border border-secondary fw-normal">{s.category}</span></td>
                                <td className="text-center">
                                    <span className={`badge ${s.quantity === 0 ? 'bg-danger' : s.quantity < 10 ? 'bg-warning text-dark' : 'bg-success'} rounded-pill px-3`}>
                                        {s.quantity} {s.unit}
                                    </span>
                                </td>
                                <td className="d-none d-md-table-cell text-secondary small">
                                    <span className={!s.shelterId ? 'text-primary fw-bold' : ''}>
                                      {!s.shelterId ? '🏢 คลังกลาง' : `📍 ${s.shelterName}`}
                                    </span>
                                </td>
                                <td className="d-none d-lg-table-cell text-secondary small">{s.supplier || '-'}</td>
                                <td className="text-end pe-4">
                                    <div className="btn-group btn-group-sm">
                                        <button className="btn btn-outline-primary" onClick={() => handleUpdateQuantity(s._id, s.quantity, s.name)} title="แก้ไขจำนวน"><i className="bi bi-pencil"></i></button>
                                        <button className="btn btn-outline-danger" onClick={() => handleDelete(s._id, s.name)} title="ลบ"><i className="bi bi-trash"></i></button>
                                    </div>
                                </td>
                            </tr>
                            ))}
                            {filteredSupplies.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-5 text-secondary"><i className="bi bi-inbox fs-1 d-block mb-3 opacity-50"></i>ไม่พบข้อมูลสิ่งของ</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'management' && (
            <div className="row g-4">
                <div className="col-lg-7">
                    <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: 'var(--bg-card)' }}>
                        <div className="card-header bg-transparent border-bottom py-3 px-4">
                            <h6 className="mb-0 fw-bold text-primary"><i className="bi bi-plus-circle me-2"></i>ลงทะเบียนสิ่งของใหม่</h6>
                        </div>
                        <div className="card-body p-4">
                            <form onSubmit={handleManualSubmit}>
                                <div className="row g-3">
                                    <div className="col-12">
                                        <div className="p-3 rounded-3 bg-primary-subtle border border-primary border-opacity-25 mb-2">
                                            <label className="form-label small fw-bold text-primary"><i className="bi bi-geo-alt-fill me-1"></i>ขั้นตอนที่ 1: เลือกสถานที่รับ/เก็บสินค้า</label>
                                             <select 
                                                className="form-select border-primary border-opacity-50 fw-bold text-primary" 
                                                value={manualForm.shelterId} 
                                                onChange={(e) => handleShelterChange(e.target.value)}
                                                required
                                            >
                                                <option value="" disabled>เลือกคลังกลาง...</option>
                                                {hubs.map((h) => (
                                                    <option key={h._id} value={h._id}>📦 {h.name}</option>
                                                ))}
                                             </select>
                                        </div>
                                    </div>
                                    <div className="col-12 mt-2">
                                        <label className="form-label small fw-bold text-secondary">ขั้นตอนที่ 2: ระบุรายละเอียดสิ่งของ</label>
                                        <input 
                                            type="text" 
                                            className="form-control border" 
                                            list="admin-standard-items"
                                            value={manualForm.name} 
                                            onChange={(e) => setManualForm({...manualForm, name: e.target.value})} 
                                            required 
                                            placeholder="พิมพ์ชื่อสิ่งของ เช่น ข้าวสาร 5 กก., ยาพารา..."
                                        />
                                        <datalist id="admin-standard-items">
                                            {availableItems.map(item => (
                                                <option key={item.name} value={item.name} />
                                            ))}
                                        </datalist>
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-secondary">หมวดหมู่</label>
                                        <select className="form-select border" value={manualForm.category} onChange={(e) => handleCategoryChange(e.target.value as SupplyCategory)}>
                                            {Object.values(SupplyCategory).filter(c => c !== 'ทั้งหมด').map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                                        </select>
                                    </div>
                                     <div className="col-md-3">
                                         <label className="form-label small fw-bold text-secondary">จำนวน</label>
                                         <input 
                                            type="number" 
                                            className="form-control border" 
                                            value={manualForm.quantity} 
                                            min="0"
                                            placeholder="ระบุจำนวน..."
                                            onKeyDown={(e) => {
                                                if (
                                                  ['-', '+', 'e', 'E', '.'].includes(e.key) || 
                                                  (e.key.length === 1 && !/^[0-9]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey)
                                                ) {
                                                    e.preventDefault();
                                                }
                                            }}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '' || parseInt(val) >= 0) {
                                                    setManualForm({...manualForm, quantity: val});
                                                }
                                            }} 
                                         />
                                     </div>
                                    <div className="col-md-3">
                                        <label className="form-label small fw-bold text-secondary">หน่วย</label>
                                        <input 
                                            type="text" 
                                            className="form-control border" 
                                            value={manualForm.unit} 
                                            onChange={(e) => setManualForm({...manualForm, unit: e.target.value})} 
                                            placeholder="เช่น ชิ้น, ถุง, กล่อง"
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label small fw-bold text-secondary">รายละเอียดเพิ่มเติม</label>
                                        <input type="text" className="form-control border" value={manualForm.description} onChange={(e) => setManualForm({...manualForm, description: e.target.value})} placeholder="ระบุรายละเอียด เช่น วันหมดอายุ..." />
                                    </div>
                                    <div className="col-md-12">
                                        <label className="form-label small fw-bold text-secondary">ผู้บริจาค <span className="fw-normal opacity-75">(ถ้ามี)</span></label>
                                        <input type="text" className="form-control border" value={manualForm.supplier} onChange={(e) => setManualForm({...manualForm, supplier: e.target.value})} placeholder="ระบุชื่อผู้บริจาค..." />
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

                <div className="col-lg-5">
                    <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: 'var(--bg-card)' }}>
                         <div className="card-header bg-transparent border-bottom py-3 px-4">
                            <h6 className="mb-0 fw-bold text-success"><i className="bi bi-file-earmark-excel me-2"></i>นำเข้า Excel / JSON</h6>
                        </div>
                        <div className="card-body p-4 d-flex flex-column justify-content-center text-center">
                            <div className="upload-box p-5 rounded-4 border-2 border-dashed mb-3 cursor-pointer transition-all" onClick={() => !loading && document.getElementById('fileIn')?.click()}>
                                {loading && uploadProgress > 0 ? (
                                    <div className="animate-fade-in py-3">
                                        <h5 className="mb-3 text-success fw-bold">🚀 กำลังอัปโหลดข้อมูล... {uploadProgress}%</h5>
                                        <div className="progress rounded-pill shadow-sm" style={{ height: '20px', width: '80%', margin: '0 auto', backgroundColor: 'var(--bg-secondary)' }}>
                                            <div 
                                                className="progress-bar progress-bar-striped progress-bar-animated bg-success" 
                                                role="progressbar" 
                                                style={{ width: `${uploadProgress}%`, transition: 'width 0.3s ease-in-out' }} 
                                                aria-valuenow={uploadProgress} 
                                                aria-valuemin={0} 
                                                aria-valuemax={100}
                                            >
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <i className="bi bi-cloud-arrow-up-fill text-success" style={{ fontSize: '3rem', opacity: 0.8 }}></i>
                                        <h5 className="mt-3 fw-bold" style={{ color: 'var(--text-primary)' }}>ลากไฟล์มาวาง หรือ คลิกเพื่อเลือกไฟล์</h5>
                                        <p className="text-secondary small">รองรับไฟล์มาตรฐาน .xlsx และ .json</p>
                                        <button className="btn btn-outline-success btn-sm rounded-pill px-4 mt-2" disabled={loading}>Browse Files</button>
                                    </>
                                )}
                                <input type="file" id="fileIn" className="d-none" accept=".json,.xlsx" onChange={handleFileUpload} disabled={loading} />
                            </div>

                            <div className="mb-3 text-start mt-2">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <label className="small fw-bold text-secondary mb-0">โครงสร้างไฟล์นำเข้า:</label>
                                    <div className="btn-group btn-group-sm rounded-pill border" style={{ fontSize: '0.65rem', backgroundColor: 'var(--bg-secondary)' }}>
                                        <button type="button" className={`btn btn-xs py-0 px-2 ${activeImportSchema === 'excel' ? 'btn-primary text-white' : 'text-secondary'}`} onClick={() => setActiveImportSchema('excel')}>Excel</button>
                                        <button type="button" className={`btn btn-xs py-0 px-2 ${activeImportSchema === 'json' ? 'btn-primary text-white' : 'text-secondary'}`} onClick={() => setActiveImportSchema('json')}>JSON</button>
                                    </div>
                                </div>

                                {activeImportSchema === 'excel' ? (
                                    <div className="table-responsive rounded-3 border animate-fade-in">
                                        <table className="table table-sm table-bordered mb-0" style={{ fontSize: '0.7rem' }}>
                                            <thead>
                                                <tr>
                                                    <th className="py-1 px-1 text-center bg-secondary" style={{ width: '45px' }}>#</th>
                                                    <th className="py-1 px-1 text-center bg-secondary">A(1)</th>
                                                    <th className="py-1 px-1 text-center bg-secondary">B(2)</th>
                                                    <th className="py-1 px-1 text-center bg-secondary">C(3)</th>
                                                    <th className="py-1 px-1 text-center bg-secondary">D(4)</th>
                                                    <th className="py-1 px-1 text-center bg-secondary">E(5)</th>
                                                    <th className="py-1 px-1 text-center bg-secondary">F(6)</th>
                                                    <th className="py-1 px-1 text-center bg-secondary">G(7)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td className="py-1 px-1 fw-bold bg-secondary">ข้อมูล</td>
                                                    <td className="py-1 px-1">ชื่อสิ่งของ</td>
                                                    <td className="py-1 px-1">หมวดหมู่</td>
                                                    <td className="py-1 px-1">จำนวน</td>
                                                    <td className="py-1 px-1">หน่วย</td>
                                                    <td className="py-1 px-1">รายละเอียด</td>
                                                    <td className="py-1 px-1">ชื่อคลัง</td>
                                                    <td className="py-1 px-1">ผู้บริจาค</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-1 px-1 fw-bold bg-secondary">ชนิด</td>
                                                    <td className="py-1 px-1 text-primary">อักษร</td>
                                                    <td className="py-1 px-1 text-primary">อักษร</td>
                                                    <td className="py-1 px-1 text-success">ตัวเลข</td>
                                                    <td className="py-1 px-1 text-primary">อักษร</td>
                                                    <td className="py-1 px-1 text-primary">อักษร</td>
                                                    <td className="py-1 px-1 text-primary">อักษร</td>
                                                    <td className="py-1 px-1 text-primary">อักษร</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="bg-secondary p-2 rounded-3 border animate-fade-in">
                                        <pre className="mb-0 text-secondary" style={{ fontSize: '0.65rem', whiteSpace: 'pre-wrap' }}>
{`[
  {
    "name": "ชื่อสิ่งของ",
    "category": "อาหารและน้ำดื่ม",
    "quantity": 100,
    "unit": "ถุง",
    "description": "รายละเอียด",
    "shelterName": "ชื่อคลัง/ศูนย์",
    "supplier": "ผู้บริจาค"
  }
]`}
                                        </pre>
                                    </div>
                                )}
                            </div>

                            <div className="alert alert-secondary border small text-start d-flex gap-2">
                                <i className="bi bi-info-circle text-primary mt-1"></i>
                                <span className="text-secondary" style={{ fontSize: '0.75rem' }}>
                                    การนำเข้าไฟล์จะอัปเดตข้อมูลที่มีอยู่แล้ว และระบุ &quot;สถานที่เก็บ&quot; เพื่อแยกสต็อกตามศูนย์ต่างๆ
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </div>

      <style jsx>{`
        .cursor-pointer { cursor: pointer; }
        .upload-box { border: 2px dashed var(--border-color); background-color: var(--bg-secondary); }
        .upload-box:hover { border-color: #198754; background-color: var(--bg-opacity-success); transform: translateY(-2px); }
        .border-theme { border: 1px solid var(--border-color); }
        .border-bottom-theme { border-bottom: 1px solid var(--border-color); }
        .text-primary-theme { color: var(--text-primary); }
        .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
        .hover-opacity-100:hover { opacity: 1 !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

export default function SuppliesPage() {
    return (
        <Suspense fallback={
            <div className="container-fluid px-4 py-4 d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-secondary fw-bold">กำลังโหลดข้อมูลคลังสินค้า...</p>
                </div>
            </div>
        }>
            <SuppliesPageContent />
        </Suspense>
    );
}
