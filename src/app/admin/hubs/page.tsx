'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { Modal } from 'bootstrap';
import { useSession } from 'next-auth/react';
import { showAlert } from '@/utils/swal-utils';

interface Resource {
  _id: string;
  category: string;
  itemName: string;
  amount: number;
  unit: string;
  status: string;
}

interface Hub {
  _id: string;
  name: string;
  district: string;
  subdistrict: string;
  phoneNumbers: string[];
  resources: Resource[];
}

interface UserWithRole {
  role?: string;
}

export default function HubsManagementPage() {
  const { data: session } = useSession();
  const role = (session?.user as UserWithRole)?.role;
  const isAdmin = role === 'admin';

  const [activeTab, setActiveTab] = useState<'overview' | 'management'>('overview');
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [supplies, setSupplies] = useState<{ shelterId: string }[]>([]);
  const [message, setMessage] = useState('');

  // Edit Modal State
  const [editingHub, setEditingHub] = useState<Hub | null>(null);
  const editModalRef = useRef<HTMLDivElement>(null);
  const bsEditModalRef = useRef<Modal | null>(null);

  // Form State
  const [manualForm, setManualForm] = useState({
    name: '',
    district: '',
    subdistrict: '',
    phoneNumbers: [''],
  });

  const [editForm, setEditForm] = useState({
    name: '',
    district: '',
    subdistrict: '',
    phoneNumbers: [''],
  });

  // Initialize Bootstrap Modal
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('bootstrap').then((bootstrap) => {
         if (editModalRef.current) bsEditModalRef.current = new bootstrap.Modal(editModalRef.current);
      });
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [hubsRes, suppliesRes] = await Promise.all([
        axios.get('/api/hubs'),
        axios.get('/api/supplies')
      ]);
      setHubs(hubsRes.data.data);
      setSupplies(suppliesRes.data.data);
    } catch (err) {
      console.error('Failed to fetch hub data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);



  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...manualForm,
        phoneNumbers: manualForm.phoneNumbers.filter(p => p.trim() !== '')
      };
      await axios.post('/api/hubs', payload);
      showAlert.success('สร้างสำเร็จ', `สร้างคลังสินค้า "${manualForm.name}" เรียบร้อย`);
      setManualForm({ name: '', district: '', subdistrict: '', phoneNumbers: [''] });
      fetchData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message: string };
      showAlert.error('ผิดพลาด', error.response?.data?.error || error.message);
    }
  };

  const handleEditClick = (hub: Hub) => {
    setEditingHub(hub);
    setEditForm({
      name: hub.name,
      district: hub.district,
      subdistrict: hub.subdistrict || '',
      phoneNumbers: hub.phoneNumbers && hub.phoneNumbers.length > 0 ? hub.phoneNumbers : ['']
    });
    bsEditModalRef.current?.show();
  };

  const handleUpdateHub = async () => {
    if (!editingHub) return;
    try {
      const payload = {
        ...editForm,
        phoneNumbers: editForm.phoneNumbers.filter(p => p.trim() !== '')
      };
      await axios.put(`/api/hubs/${editingHub._id}`, payload);
      showAlert.success('อัปเดตสำเร็จ', `อัปเดตข้อมูล "${editForm.name}" เรียบร้อย`);
      bsEditModalRef.current?.hide();
      fetchData();
    } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: string } }; message: string };
        showAlert.error('ผิดพลาด', error.response?.data?.error || error.message);
    }
  };

  const handleDeleteHub = async (id: string, name: string) => {
    const isConfirmed = await showAlert.confirmDelete('ยืนยันการลบ?', `คุณต้องการลบ Hub "${name}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`);
    if (!isConfirmed) return;
    try {
      await axios.delete(`/api/hubs/${id}`);
      showAlert.success('ลบสำเร็จ', `ลบ Hub "${name}" เรียบร้อย`);
      fetchData();
    } catch (err: unknown) {
        const error = err as { response?: { data?: { error?: string } }; message: string };
        showAlert.error('ผิดพลาด', error.response?.data?.error || error.message);
    }
  };

  const getHubStockCount = (hubId: string) => {
    return supplies.filter(s => s.shelterId === hubId).length;
  };

  if (loading && hubs.length === 0) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid px-4 py-4" style={{ maxWidth: '1600px' }}>
      
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-end mb-4 gap-3">
        <div>
           <div className="d-flex align-items-center mb-2">
                <span className="badge bg-primary rounded-circle p-2 me-2"><i className="bi bi-box-seam-fill fs-5 text-white"></i></span>
                <h4 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>ศูนย์บริหารจัดการคลังกลาง (Hubs Management)</h4>
           </div>
           <p className="text-secondary small mb-0 ps-1">ระบบจัดการคลังสต็อกสินค้าหลักและการกระจายทรัพยากรส่วนกลาง</p>
        </div>
        
        <div className="bg-secondary rounded-pill p-1 shadow-sm d-flex" style={{ border: '1px solid var(--border-color)' }}>
            <button 
                className={`btn btn-sm rounded-pill px-4 fw-bold transition-all ${activeTab === 'overview' ? 'btn-primary shadow-sm text-white' : 'text-theme-secondary'}`}
                onClick={() => setActiveTab('overview')}
            >
                <i className="bi bi-grid-fill me-2"></i>คลังทั้งหมด
            </button>
            <button 
                className={`btn btn-sm rounded-pill px-4 fw-bold transition-all ${activeTab === 'management' ? 'btn-primary shadow-sm text-white' : 'text-theme-secondary'}`}
                onClick={() => setActiveTab('management')}
            >
                <i className="bi bi-gear-fill me-2"></i>จัดการคลัง
            </button>
        </div>
      </div>


      {/* Content */}
      <div className="animate-fade-in">
        
        {activeTab === 'overview' && (
          <div className="row g-4">
            {hubs.map((hub) => (
              <div key={hub._id} className="col-md-6 col-lg-4">
                <div className="card h-100 border-0 shadow-sm hover-shadow transition-all" style={{ backgroundColor: 'var(--bg-card)' }}>
                  <div className="card-header bg-transparent border-bottom p-4">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h5 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>{hub.name}</h5>
                        <span className="badge bg-secondary text-primary border border-primary px-3 rounded-pill">
                          📍 อ.{hub.district || 'ไม่ระบุ'}
                        </span>
                        {(hub.phoneNumbers || []).length > 0 && (
                          <div className="mt-2 small text-secondary">
                            <i className="bi bi-telephone-fill me-1"></i>
                            {hub.phoneNumbers.join(', ')}
                          </div>
                        )}
                      </div>
                      <div className="text-end">
                        <span className="badge bg-primary bg-opacity-10 text-primary small">HUB</span>
                      </div>
                    </div>
                  </div>
                  <div className="card-body p-4">
                    <div className="row g-3 mb-4 text-center">
                      <div className="col-6">
                        <div className="p-3 bg-primary bg-opacity-10 rounded-3">
                          <h4 className="fw-bold text-primary mb-0">{getHubStockCount(hub._id)}</h4>
                          <small className="text-secondary small">รายการพัสดุ</small>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-3 bg-warning bg-opacity-10 rounded-3">
                          <h4 className="fw-bold text-warning mb-0">{hub.resources?.filter(r => r.status === 'Pending').length || 0}</h4>
                          <small className="text-secondary small">คำขอค้างอยู่</small>
                        </div>
                      </div>
                    </div>

                    <div className="border-top pt-3">
                      <h6 className="fw-bold small text-secondary mb-3">คำร้องขอล่าสุด</h6>
                      {hub.resources?.filter(r => r.status === 'Pending').slice(0, 2).map((r, idx) => (
                        <div key={idx} className="d-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded" style={{ backgroundColor: 'var(--bg-secondary) !important' }}>
                          <span className="small fw-bold text-theme-primary">{r.itemName}</span>
                          <span className="badge bg-secondary text-theme border small">{r.amount} {r.unit}</span>
                        </div>
                      ))}
                      {(!hub.resources || hub.resources.filter(r => r.status === 'Pending').length === 0) && (
                        <div className="text-center py-2 text-muted small italic">ไม่มีคำขอค้างรับ</div>
                      )}
                    </div>
                  </div>
                  <div className="card-footer bg-transparent border-0 p-3 pt-0">
                    <div className="row g-2">
                      <div className="col-12 d-flex gap-2">
                         <Link href={`/admin/supplies?hub=${hub._id}`} className="btn btn-sm btn-outline-primary flex-grow-1 fw-bold">
                          📦 รายการสต็อก
                        </Link>
                         <Link href={`/requests/create?hub=${hub._id}`} className="btn btn-sm btn-primary flex-grow-1 fw-bold shadow-sm">
                          📢 ขอรับของ
                        </Link>
                      </div>
                       {isAdmin && (
                        <div className="col-12 mt-2 pt-2 border-top d-flex gap-2 justify-content-end">
                            <button 
                                onClick={() => handleEditClick(hub)}
                                className="btn btn-sm btn-light text-secondary hover-bg-light"
                                title="แก้ไขข้อมูล"
                            >
                                <i className="bi bi-pencil-square"></i>
                            </button>
                            <button 
                                onClick={() => handleDeleteHub(hub._id, hub.name)}
                                className="btn btn-sm btn-light text-danger hover-bg-danger"
                                title="ลบข้อมูล"
                            >
                                <i className="bi bi-trash"></i>
                            </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {hubs.length === 0 && (
              <div className="col-12 text-center py-5">
                <i className="bi bi-inbox fs-1 opacity-25 d-block mb-3"></i>
                <h5 className="text-muted">ไม่พบข้อมูลคลังสินค้า</h5>
                <button onClick={() => setActiveTab('management')} className="btn btn-primary mt-3">เพิ่มคุณคลังสินค้าแห่งแรก</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'management' && (
          <div className="row g-4">
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: 'var(--bg-card)' }}>
                 <div className="card-header bg-transparent border-bottom py-3 px-4">
                    <h6 className="mb-0 fw-bold text-primary"><i className="bi bi-plus-circle me-2"></i>สร้างคลังกลางใหม่</h6>
                </div>
                <div className="card-body p-4">
                    <form onSubmit={handleManualSubmit}>
                        <div className="row g-3">
                            <div className="col-12">
                                <label className="form-label small fw-bold text-secondary">ชื่อคลังสินค้า</label>
                                <input type="text" className="form-control border" value={manualForm.name} onChange={(e) => setManualForm({...manualForm, name: e.target.value})} required placeholder="เช่น คลังกลางส่วนกลาง..." />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small fw-bold text-secondary">อำเภอ</label>
                                <input type="text" className="form-control border" value={manualForm.district} onChange={(e) => setManualForm({...manualForm, district: e.target.value})} required placeholder="อำเภอ..." />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small fw-bold text-secondary">ตำบล</label>
                                <input type="text" className="form-control border" value={manualForm.subdistrict} onChange={(e) => setManualForm({...manualForm, subdistrict: e.target.value})} placeholder="ตำบล..." />
                            </div>
                            <div className="col-12">
                                <label className="form-label small fw-bold text-secondary">เบอร์โทรศัพท์</label>
                                <input 
                                    type="text" 
                                    className="form-control border" 
                                    value={manualForm.phoneNumbers[0]} 
                                    onChange={(e) => setManualForm({...manualForm, phoneNumbers: [e.target.value]})} 
                                    placeholder="เช่น 081-234-5678" 
                                />
                            </div>
                            <div className="col-12 mt-4">
                                <button type="submit" className="btn btn-primary w-100 py-2 rounded-3 fw-bold shadow-sm">
                                    <i className="bi bi-save me-2"></i>ยืนยันการสร้าง
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
                <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: 'var(--bg-card)' }}>
                   <div className="card-header bg-transparent border-bottom py-3 px-4">
                      <h6 className="mb-0 fw-bold text-secondary"><i className="bi bi-info-circle me-2"></i>ข้อมูลเพิ่มเติม</h6>
                  </div>
                  <div className="card-body p-4">
                      <div className="alert alert-info border-0 shadow-sm">
                          <h6 className="fw-bold"><i className="bi bi-lightbulb me-2"></i>เกี่ยวกับ Hub</h6>
                          <p className="small mb-0">คลังกลาง (Hub) เป็นจุดพักสินค้าหลักในแต่ละพื้นที่ มีหน้าที่เก็บสำรองสินค้าเพื่อส่งต่อไปยังศูนย์พักพิงต่างๆ</p>
                      </div>
                      <ul className="list-group list-group-flush small">
                          <li className="list-group-item bg-transparent px-0 text-secondary"><i className="bi bi-check2 text-success me-2"></i> สามารถเพิ่มรายการสต็อกได้ในเมนู &quot;จัดการคลังสิ่งของ&quot;</li>
                          <li className="list-group-item bg-transparent px-0 text-secondary"><i className="bi bi-check2 text-success me-2"></i> ศูนย์พักพิงสามารถเลือกขอเบิกทรัพยากรจากคลังเหล่านี้ได้</li>
                          <li className="list-group-item bg-transparent px-0 text-secondary"><i className="bi bi-check2 text-success me-2"></i> ยึดตามหลัก First-In-First-Out (FIFO)</li>
                      </ul>
                  </div>
                </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <div className="modal fade" id="editHubModal" ref={editModalRef} tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header border-bottom-0">
              <h5 className="modal-title fw-bold">แก้ไขข้อมูล Hub</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div className="modal-body">
              <form>
                <div className="mb-3">
                  <label className="form-label small fw-bold text-secondary">ชื่อคลังสินค้า</label>
                  <input type="text" className="form-control" value={editForm.name || ''} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
                </div>
                <div className="row g-2 mb-3">
                    <div className="col-6">
                        <label className="form-label small fw-bold text-secondary">อำเภอ</label>
                        <input type="text" className="form-control" value={editForm.district || ''} onChange={(e) => setEditForm({...editForm, district: e.target.value})} />
                    </div>
                    <div className="col-6">
                        <label className="form-label small fw-bold text-secondary">ตำบล</label>
                        <input type="text" className="form-control" value={editForm.subdistrict || ''} onChange={(e) => setEditForm({...editForm, subdistrict: e.target.value})} />
                    </div>
                </div>
                <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary">เบอร์โทรศัพท์</label>
                    <input type="text" className="form-control" value={editForm.phoneNumbers[0] || ''} onChange={(e) => setEditForm({...editForm, phoneNumbers: [e.target.value]})} />
                </div>
              </form>
            </div>
            <div className="modal-footer border-top-0">
              <button type="button" className="btn btn-light" data-bs-dismiss="modal">ยกเลิก</button>
              <button type="button" className="btn btn-primary" onClick={handleUpdateHub}>บันทึกการเปลี่ยนแปลง</button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .hover-shadow:hover {
          transform: translateY(-5px);
          box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)!important;
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
