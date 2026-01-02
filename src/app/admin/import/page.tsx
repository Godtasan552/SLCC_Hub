'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs';
import ShelterList from '@/components/dashboard/ShelterList';
import { Shelter } from "@/types/shelter";
import { Modal } from 'bootstrap';
import { useSession } from 'next-auth/react';

interface ShelterData {
  name: string;
  district: string;
  subdistrict?: string;
  capacity?: number;
  phoneNumbers?: string[];
}

interface UserWithRole {
  role?: string;
}

export default function AdminPage() {
  const { data: session } = useSession();
  const role = (session?.user as UserWithRole)?.role;
  const isAdmin = role === 'admin';

  // --- States ---
  const [activeTab, setActiveTab] = useState<'daily' | 'management'>('daily');
  const [activeImportSchema, setActiveImportSchema] = useState<'excel' | 'json'>('excel');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState(1);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Action Modal State (In/Out)
  const [modalState, setModalState] = useState<{ isOpen: boolean, shelter: Shelter | null, action: 'in' | 'out', amount: number }>({
    isOpen: false,
    shelter: null,
    action: 'in',
    amount: 1
  });
  const modalRef = useRef<HTMLDivElement>(null);
  const bsModalRef = useRef<Modal | null>(null);

  // Edit Modal State (Admin Only)
  const [editingShelter, setEditingShelter] = useState<Shelter | null>(null);
  const editModalRef = useRef<HTMLDivElement>(null);
  const bsEditModalRef = useRef<Modal | null>(null);

  // Form State
  const [manualForm, setManualForm] = useState({
    name: '',
    district: '',
    subdistrict: '',
    capacity: 0,
    phoneNumbers: ''
  });

  // --- Fetch Data ---
  const fetchShelters = useCallback(async () => {
    try {
      const res = await axios.get('/api/shelters');
      setShelters(res.data.data);
    } catch (err) {
      console.error('Fetch shelters failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchShelters();
  }, [fetchShelters]);

  // --- Bootstrap Modals ---
  useEffect(() => {
    if (console) console.log('Initializing Modals'); // Debug
    if (typeof window !== 'undefined') {
      import('bootstrap').then((bootstrap) => {
         if (modalRef.current) bsModalRef.current = new bootstrap.Modal(modalRef.current);
         if (editModalRef.current) bsEditModalRef.current = new bootstrap.Modal(editModalRef.current);
      });
    }
  }, []);

  // --- Actions ---
  const openActionModal = (id: string, action: 'in' | 'out') => {
    const targetShelter = shelters.find(s => s._id === id);
    if (!targetShelter) return;
    setModalState({ isOpen: true, shelter: targetShelter, action, amount: 1 });
    bsModalRef.current?.show();
  };

  const confirmAction = async () => {
    if (!modalState.shelter) return;
    setLoading(true);
    bsModalRef.current?.hide();
    try {
      // ✅ ใช้ API ใหม่ที่บันทึกลง ShelterLog
      await axios.post('/api/shelter-logs', { 
        shelterId: modalState.shelter._id,
        action: modalState.action, 
        amount: modalState.amount 
      });
      fetchShelters();
      showToast(`บันทึกข้อมูลเรียบร้อย: ${modalState.action === 'in' ? 'รับเข้า' : 'ส่งออก'} ${modalState.amount} คน`);
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setLoading(false);
    }
  };

  // --- CRUD Handlers ---
  const handleEdit = (shelter: Shelter) => {
    setEditingShelter(shelter);
    bsEditModalRef.current?.show();
  };

  const saveEdit = async () => {
    if (!editingShelter) return;
    setLoading(true);
    bsEditModalRef.current?.hide();
    try {
        await axios.put(`/api/shelters/${editingShelter._id}`, editingShelter);
        showToast(`แก้ไขข้อมูล "${editingShelter.name}" เรียบร้อย`);
        fetchShelters();
    } catch (err) {
        console.error(err);
        showToast('แก้ไขข้อมูลล้มเหลว');
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบศูนย์พักพิงนี้? การกระทำนี้ไม่สามารถย้อนกลับได้')) return;
    setLoading(true);
    try {
        await axios.delete(`/api/shelters/${id}`);
        showToast('ลบข้อมูลเรียบร้อย');
        // Optimistic update
        setShelters(prev => prev.filter(s => s._id !== id));
        fetchShelters();
    } catch (err) {
        console.error(err);
        showToast('ลบข้อมูลล้มเหลว');
    } finally {
        setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSend = {
        ...manualForm,
        phoneNumbers: manualForm.phoneNumbers ? [manualForm.phoneNumbers] : []
      };
      await axios.post('/api/shelters', dataToSend);
      showToast(`เพิ่มศูนย์ "${manualForm.name}" เรียบร้อย`);
      setManualForm({ name: '', district: '', subdistrict: '', capacity: 0, phoneNumbers: '' });
      fetchShelters();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message: string };
      const errorMessage = error.response?.data?.error || error.message;
      showToast(`Error: ${errorMessage}`);
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
      let dataToImport: ShelterData[] = [];
      
      // Simulate progress during file reading
      setUploadProgress(10);
      
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        setUploadProgress(30);
        const json = JSON.parse(text);
        dataToImport = json.data || json;
        setUploadProgress(50);
      } else if (file.name.endsWith('.xlsx')) {
        const arrayBuffer = await file.arrayBuffer();
        setUploadProgress(20);
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        setUploadProgress(40);
        const worksheet = workbook.getWorksheet(1);
        if (worksheet) {
          const totalRows = worksheet.rowCount;
          let processedRows = 0;
          
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) { 
              dataToImport.push({
                name: String(row.getCell(1).value || ''),
                district: String(row.getCell(2).value || ''),
                subdistrict: String(row.getCell(3).value || ''),
                capacity: Number(row.getCell(4).value) || 0,
                phoneNumbers: row.getCell(5).value ? [String(row.getCell(5).value)] : []
              });
            }
            processedRows++;
            // Update progress during parsing (40% to 60%)
            const parseProgress = 40 + Math.round((processedRows / totalRows) * 20);
            setUploadProgress(parseProgress);
          });
        }
      }
      
      setUploadProgress(65);
      setMessage(`กำลังอัปโหลด ${dataToImport.length} รายการ...`);
      
      await axios.patch('/api/shelters', { data: dataToImport }, {
        onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
                // Map upload progress from 65% to 100%
                const uploadPercent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                const totalProgress = 65 + Math.round(uploadPercent * 0.35);
                setUploadProgress(totalProgress);
            }
        }
      });
      
      setUploadProgress(100);
      showToast('นำเข้าไฟล์สำเร็จ');
      fetchShelters();
    } catch (err) {
      showToast('ไฟล์ไม่ถูกต้อง หรือเกิดข้อผิดพลาด');
      console.error(err);
    } finally {
      setLoading(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  return (
    <div className="container-fluid px-4 py-4" style={{ maxWidth: '1600px', minHeight: '100vh', backgroundColor: 'var(--bg-body)' }}>
      
      {/* 1. Header & Tabs */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-end mb-4 gap-3">
        <div>
           <div className="d-flex align-items-center mb-2">
                <span className="badge bg-success rounded-circle p-2 me-2"><i className="bi bi-house-door-fill fs-5 text-white"></i></span>
                <h4 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>จัดการศูนย์พักพิง (Shelters Management)</h4>
           </div>
           <p className="text-secondary small mb-0 ps-1">ระบบบริหารจัดการข้อมูลผู้อพยพรายวันและการรองรับของศูนย์พักพิง</p>
        </div>
        
        {/* Tab Navigation */}
        <div className="bg-white dark-mode-bg rounded-pill p-1 shadow-sm d-flex" style={{ border: '1px solid var(--border-color)' }}>
            <button 
                className={`btn btn-sm rounded-pill px-4 fw-bold transition-all ${activeTab === 'daily' ? 'btn-primary shadow-sm' : 'text-secondary hover-bg-light'}`}
                onClick={() => setActiveTab('daily')}
            >
                <i className="bi bi-list-check me-2"></i>อัปเดตรายวัน
            </button>
            <button 
                className={`btn btn-sm rounded-pill px-4 fw-bold transition-all ${activeTab === 'management' ? 'btn-primary shadow-sm' : 'text-secondary hover-bg-light'}`}
                onClick={() => setActiveTab('management')}
            >
                <i className="bi bi-database-gear me-2"></i>จัดการฐานข้อมูล
            </button>
        </div>
      </div>
      
      {/* Alert Toast (Fixed Top) */}
      {message && (
         <div className="position-fixed top-0 start-50 translate-middle-x mt-4 z-index-toast" style={{ zIndex: 1050 }}>
            <div className={`alert ${message.includes('Error') || message.includes('ผิดพลาด') || message.includes('ล้มเหลว') ? 'alert-danger' : 'alert-success'} shadow-lg d-flex align-items-center py-2 px-4 rounded-pill border-0`}>
             <i className={`bi ${message.includes('Error') || message.includes('ผิดพลาด') || message.includes('ล้มเหลว') ? 'bi-x-circle-fill' : 'bi-check-circle-fill'} me-2 fs-5`}></i>
             <span className="fw-bold">{message}</span>
           </div>
         </div>
      )}

      {/* 2. Content Area */}
      <div className="animate-fade-in">
        
        {/* TAB 1: Daily Operations */}
        {activeTab === 'daily' && (
            <div className="row g-4 justify-content-center">
                <div className="col-12">
                   {/* Search & List */}
                    <ShelterList 
                        shelters={shelters}
                        timeRange={timeRange}
                        setTimeRange={setTimeRange}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        onAction={openActionModal}
                        onEdit={isAdmin ? handleEdit : undefined}
                        onDelete={isAdmin ? handleDelete : undefined}
                    />
                </div>
            </div>
        )}

        {/* TAB 2: Management (Add/Import) */}
        {activeTab === 'management' && (
             <div className="row g-4">
                {/* Manual Add */}
                <div className="col-lg-6">
                    <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: 'var(--bg-card)' }}>
                        <div className="card-header bg-transparent border-bottom py-3 px-4">
                            <h6 className="mb-0 fw-bold text-primary"><i className="bi bi-plus-circle me-2"></i>ลงทะเบียนศูนย์ใหม่</h6>
                        </div>
                        <div className="card-body p-4">
                            <form onSubmit={handleManualSubmit}>
                                <div className="row g-3">
                                    <div className="col-12">
                                        <label className="form-label small fw-bold text-secondary">ชื่อศูนย์พักพิง</label>
                                        <input type="text" className="form-control border" value={manualForm.name} onChange={(e) => setManualForm({...manualForm, name: e.target.value})} required placeholder="เช่น วัดป่า..." />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-secondary">อำเภอ</label>
                                        <input type="text" className="form-control border" value={manualForm.district} onChange={(e) => setManualForm({...manualForm, district: e.target.value})} required placeholder="เช่น เมือง..." />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-secondary">ตำบล</label>
                                        <input type="text" className="form-control border" value={manualForm.subdistrict} onChange={(e) => setManualForm({...manualForm, subdistrict: e.target.value})} placeholder="เช่น ในเมือง..." />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label small fw-bold text-secondary">ความจุ (คน)</label>
                                        <input type="number" className="form-control border" value={manualForm.capacity} onChange={(e) => setManualForm({...manualForm, capacity: Number(e.target.value)})} />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label small fw-bold text-secondary">เบอร์โทรศัพท์ติดต่อ</label>
                                        <input type="text" className="form-control border" value={manualForm.phoneNumbers} onChange={(e) => setManualForm({...manualForm, phoneNumbers: e.target.value})} placeholder="เช่น 081-234-5678" />
                                    </div>
                                    <div className="col-12 mt-4">
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
                <div className="col-lg-6">
                    <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: 'var(--bg-card)' }}>
                         <div className="card-header bg-transparent border-bottom py-3 px-4">
                            <h6 className="mb-0 fw-bold text-success"><i className="bi bi-file-earmark-excel me-2"></i>นำเข้า Excel / JSON</h6>
                        </div>
                        <div className="card-body p-4 d-flex flex-column justify-content-center text-center">
                            <div className="upload-box p-5 rounded-4 border-2 border-dashed mb-3 cursor-pointer transition-all" onClick={() => !loading && document.getElementById('fileIn')?.click()}>
                                {loading && uploadProgress > 0 ? (
                                    <div className="animate-fade-in py-3">
                                        <h5 className="mb-3 text-success fw-bold">🚀 กำลังอัปโหลดข้อมูล... {uploadProgress}%</h5>
                                        <div className="progress rounded-pill shadow-sm" style={{ height: '20px', width: '80%', margin: '0 auto' }}>
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
                                        <button className="btn btn-outline-success btn-sm rounded-pill px-4 mt-2" disabled={loading}>
                                            Browse Files
                                        </button>
                                    </>
                                )}
                                <input type="file" id="fileIn" className="d-none" accept=".json,.xlsx" onChange={handleFileUpload} disabled={loading} />
                            </div>
                            <div className="mb-3 text-start">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <label className="small fw-bold text-secondary mb-0">โครงสร้างไฟล์นำเข้า:</label>
                                    <div className="btn-group btn-group-sm rounded-pill border" style={{ fontSize: '0.65rem' }}>
                                        <button type="button" className={`btn btn-xs py-0 px-2 ${activeImportSchema === 'excel' ? 'btn-primary' : 'btn-light'}`} onClick={() => setActiveImportSchema('excel')}>Excel</button>
                                        <button type="button" className={`btn btn-xs py-0 px-2 ${activeImportSchema === 'json' ? 'btn-primary' : 'btn-light'}`} onClick={() => setActiveImportSchema('json')}>JSON</button>
                                    </div>
                                </div>
                                
                                {activeImportSchema === 'excel' ? (
                                    <div className="table-responsive rounded-3 border animate-fade-in">
                                        <table className="table table-sm table-bordered mb-0 x-small-text text-nowrap">
                                            <thead className="table-light">
                                                <tr>
                                                    <th className="py-1 px-2 text-center bg-light" style={{ width: '60px' }}>#</th>
                                                    <th className="py-1 px-2 text-center bg-light">A (1)</th>
                                                    <th className="py-1 px-2 text-center bg-light">B (2)</th>
                                                    <th className="py-1 px-2 text-center bg-light">C (3)</th>
                                                    <th className="py-1 px-2 text-center bg-light">D (4)</th>
                                                    <th className="py-1 px-2 text-center bg-light">E (5)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td className="py-1 px-2 fw-bold bg-light">ข้อมูล</td>
                                                    <td className="py-1 px-2">ชื่อศูนย์</td>
                                                    <td className="py-1 px-2">อำเภอ</td>
                                                    <td className="py-1 px-2">ตำบล</td>
                                                    <td className="py-1 px-2">ความจุ</td>
                                                    <td className="py-1 px-2">เบอร์โทร</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-1 px-2 fw-bold bg-light">ชนิด</td>
                                                    <td className="py-1 px-2 text-primary">อักษร</td>
                                                    <td className="py-1 px-2 text-primary">อักษร</td>
                                                    <td className="py-1 px-2 text-primary">อักษร</td>
                                                    <td className="py-1 px-2 text-success">ตัวเลข</td>
                                                    <td className="py-1 px-2 text-primary">อักษร</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="bg-light p-2 rounded-3 border animate-fade-in">
                                        <pre className="mb-0 x-small-text text-secondary" style={{ whiteSpace: 'pre-wrap' }}>
{`[
  {
    "name": "ชื่อศูนย์พักพิง",
    "district": "อำเภอ",
    "subdistrict": "ตำบล",
    "capacity": 200,
    "phoneNumbers": ["081-xxx-xxxx"]
  }
]`}
                                        </pre>
                                    </div>
                                )}
                            </div>

                            <div className="alert alert-light border small text-start d-flex gap-2">
                                <i className="bi bi-info-circle text-primary mt-1"></i>
                                <span className="text-secondary">การนำเข้าไฟล์จะอัปเดตข้อมูลที่มีอยู่แล้วหากชื่อตรงกัน และสร้างใหม่หากยังไม่มี</span>
                            </div>
                        </div>
                    </div>
                </div>
             </div>
        )}
      </div>

      {/* 3. Action Modal (In/Out) */}
      <div className="modal fade" id="actionModal" ref={modalRef} tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
                <div className={`modal-header border-0 py-3 ${modalState.action === 'in' ? 'bg-success' : 'bg-danger'} text-white`}>
                    <h5 className="modal-title fw-bold">
                        <i className={`bi ${modalState.action === 'in' ? 'bi-box-arrow-in-right' : 'bi-box-arrow-right'} me-2`}></i>
                        {modalState.action === 'in' ? 'รับผู้อพยพเข้า' : 'จำหน่ายออก'}
                    </h5>
                    <button type="button" className="btn-close btn-close-white" onClick={() => bsModalRef.current?.hide()}></button>
                </div>
                <div className="modal-body p-4">
                    <div className="mb-3 text-center">
                        <p className="mb-1 text-secondary small">ศูนย์พักพิง</p>
                        <h6 className="fw-bold" style={{ color: 'var(--text-primary)' }}>{modalState.shelter?.name}</h6>
                    </div>
                    <label className="form-label small fw-bold text-secondary">จำนวนคน</label>
                    <div className="input-group mb-3">
                        <button className="btn btn-outline-secondary" type="button" onClick={() => setModalState(prev => ({...prev, amount: Math.max(1, prev.amount - 1)}))}>-</button>
                        <input type="number" className="form-control text-center fw-bold fs-5" value={modalState.amount} onChange={(e) => setModalState(prev => ({...prev, amount: Math.max(1, parseInt(e.target.value) || 0)}))} />
                        <button className="btn btn-outline-secondary" type="button" onClick={() => setModalState(prev => ({...prev, amount: prev.amount + 1}))}>+</button>
                    </div>
                    <button onClick={confirmAction} className={`btn w-100 py-2 fw-bold rounded-3 ${modalState.action === 'in' ? 'btn-success' : 'btn-danger'}`} disabled={loading}>
                        {loading ? 'กำลังบันทึก...' : 'ยืนยันรายการ'}
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* 4. Edit Modal (Admin Only) */}
      <div className="modal fade" id="editModal" ref={editModalRef} tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
                <div className="modal-header border-0 py-3 bg-primary text-white">
                    <h5 className="modal-title fw-bold"><i className="bi bi-pencil-square me-2"></i>แก้ไขข้อมูลศูนย์</h5>
                    <button type="button" className="btn-close btn-close-white" onClick={() => bsEditModalRef.current?.hide()}></button>
                </div>
                <div className="modal-body p-4">
                   <div className="mb-3">
                        <label className="form-label small fw-bold text-secondary">ชื่อศูนย์พักพิง</label>
                        <input type="text" className="form-control" value={editingShelter?.name || ''} 
                            onChange={(e) => setEditingShelter(prev => prev ? {...prev, name: e.target.value} : null)} />
                   </div>
                   <div className="row g-3 mb-3">
                       <div className="col-6">
                            <label className="form-label small fw-bold text-secondary">อำเภอ</label>
                            <input type="text" className="form-control" value={editingShelter?.district || ''} 
                                onChange={(e) => setEditingShelter(prev => prev ? {...prev, district: e.target.value} : null)} />
                       </div>
                       <div className="col-6">
                            <label className="form-label small fw-bold text-secondary">ตำบล</label>
                            <input type="text" className="form-control" value={editingShelter?.subdistrict || ''} 
                                onChange={(e) => setEditingShelter(prev => prev ? {...prev, subdistrict: e.target.value} : null)} />
                       </div>
                   </div>
                   <div className="mb-4">
                        <label className="form-label small fw-bold text-secondary">เบอร์โทรศัพท์ติดต่อ</label>
                        <input type="text" className="form-control" value={editingShelter?.phoneNumbers?.[0] || ''} 
                            onChange={(e) => setEditingShelter(prev => prev ? {...prev, phoneNumbers: [e.target.value]} : null)} placeholder="เช่น 081-234-5678" />
                   </div>
                   <button onClick={saveEdit} className="btn btn-primary w-100 py-2 fw-bold rounded-3" disabled={loading}>
                       {loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                   </button>
                </div>
            </div>
        </div>
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
        }
        .dark-mode-bg {
             background-color: var(--bg-card) !important;
        }
        .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
        .x-small-text { font-size: 0.72rem; }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}