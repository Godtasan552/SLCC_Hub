'use client'
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import ExcelJS from 'exceljs';
import ShelterList from '@/components/dashboard/ShelterList';
import { Shelter } from "@/types/shelter";
import { Modal } from 'bootstrap';

interface ShelterData {
  name: string;
  district: string;
  subdistrict?: string;
  capacity?: number;
  phoneNumbers?: string[];
}

export default function AdminPage() {
  // --- States ---
  const [activeTab, setActiveTab] = useState<'daily' | 'management'>('daily');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState(1);
  
  // Modal State
  const [modalState, setModalState] = useState<{ isOpen: boolean, shelter: Shelter | null, action: 'in' | 'out', amount: number }>({
    isOpen: false,
    shelter: null,
    action: 'in',
    amount: 1
  });
  const modalRef = useRef<HTMLDivElement>(null);
  const bsModalRef = useRef<Modal | null>(null);

  // Form State
  const [manualForm, setManualForm] = useState({
    name: '',
    district: '',
    subdistrict: '',
    capacity: 0,
    currentOccupancy: 0
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

  // --- Modal Logic ---
  useEffect(() => {
    if (modalRef.current) {
        if (typeof window !== 'undefined') {
          import('bootstrap').then((bootstrap) => {
             bsModalRef.current = new bootstrap.Modal(modalRef.current!);
          });
        }
    }
  }, []);

  const openActionModal = (id: string, action: 'in' | 'out') => {
    const targetShelter = shelters.find(s => s._id === id);
    if (!targetShelter) return;
    
    setModalState({
        isOpen: true,
        shelter: targetShelter,
        action,
        amount: 1
    });
    bsModalRef.current?.show();
  };

  const confirmAction = async () => {
    if (!modalState.shelter) return;
    
    setLoading(true);
    bsModalRef.current?.hide();
    
    try {
      await axios.put(`/api/shelters/${modalState.shelter._id}`, { 
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

  // --- Handlers ---
  const showToast = (msg: string) => {
    setMessage(msg); // In a real app, use a proper Toast component
    setTimeout(() => setMessage(''), 3000);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/shelters', manualForm);
      showToast(`เพิ่มศูนย์ "${manualForm.name}" เรียบร้อย`);
      setManualForm({ name: '', district: '', subdistrict: '', capacity: 0, currentOccupancy: 0 });
      fetchShelters();
    } catch (err) {
       // @ts-expect-error: Error response type is not strictly typed
      const errorMessage = err.response?.data?.error || err.message;
      showToast(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage('กำลังประมวลผลไฟล์...');

    try {
      let dataToImport: ShelterData[] = [];
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
                district: String(row.getCell(2).value || ''),
                subdistrict: String(row.getCell(3).value || ''),
                capacity: Number(row.getCell(4).value) || 0,
                phoneNumbers: row.getCell(5).value ? [String(row.getCell(5).value)] : []
              });
            }
          });
        }
      }
      await axios.patch('/api/shelters', { data: dataToImport });
      showToast('นำเข้าไฟล์สำเร็จ');
      fetchShelters();
    } catch (err) {
      showToast('ไฟล์ไม่ถูกต้อง หรือเกิดข้อผิดพลาด');
      console.error(err);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="container-fluid px-4 py-4" style={{ maxWidth: '1600px', minHeight: '100vh', backgroundColor: 'var(--bg-body)' }}>
      
      {/* 1. Header & Tabs */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-end mb-4 gap-3">
        <div>
           <div className="d-flex align-items-center mb-2">
                <span className="badge bg-primary rounded-circle p-2 me-2"><i className="bi bi-shield-lock-fill fs-5 text-white"></i></span>
                <h4 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>ระบบจัดการศูนย์พักพิง</h4>
           </div>
           <p className="text-secondary small mb-0 ps-1">ระบบบริหารจัดการข้อมูลผู้ประสบภัยและทรัพยากร</p>
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
            <div className={`alert ${message.includes('Error') || message.includes('ผิดพลาด') ? 'alert-danger' : 'alert-success'} shadow-lg d-flex align-items-center py-2 px-4 rounded-pill border-0`}>
             <i className={`bi ${message.includes('Error') ? 'bi-x-circle-fill' : 'bi-check-circle-fill'} me-2 fs-5`}></i>
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
                                        <label className="form-label small fw-bold text-secondary">ความจุ (คน)</label>
                                        <input type="number" className="form-control border" value={manualForm.capacity} onChange={(e) => setManualForm({...manualForm, capacity: Number(e.target.value)})} />
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
                            <div className="upload-box p-5 rounded-4 border-2 border-dashed mb-3 cursor-pointer transition-all">
                                <i className="bi bi-cloud-arrow-up-fill text-success" style={{ fontSize: '3rem', opacity: 0.8 }}></i>
                                <h5 className="mt-3 fw-bold" style={{ color: 'var(--text-primary)' }}>ลากไฟล์มาวาง หรือ คลิกเพื่อเลือกไฟล์</h5>
                                <p className="text-secondary small">รองรับไฟล์มาตรฐาน .xlsx และ .json</p>
                                <button className="btn btn-outline-success btn-sm rounded-pill px-4 mt-2" onClick={() => document.getElementById('fileIn')?.click()}>
                                    Browse Files
                                </button>
                                <input type="file" id="fileIn" className="d-none" accept=".json,.xlsx" onChange={handleFileUpload} />
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

      {/* 3. Action Modal */}
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
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}