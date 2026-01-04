'use client';

import { useState, useMemo } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { showAlert } from '@/utils/swal-utils';
import Swal from 'sweetalert2';

interface Resource {
  _id: string;
  category: string;
  itemName: string;
  amount: number;
  unit: string;
  urgency: 'low' | 'medium' | 'high';
  status: string;
  requestedAt: Date | string;
  shelterName: string;
  shelterId: string;
  sourceHubId?: string;
  sourceHubName?: string;
}

interface RequestListClientProps {
  initialRequests: Resource[];
}

export default function RequestListClient({ initialRequests }: RequestListClientProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const filteredRequests = useMemo(() => {
    return initialRequests.filter(req => {
      const matchStatus = filterStatus === 'All' || req.status === filterStatus;
      const matchCategory = filterCategory === 'All' || req.category === filterCategory;
      return matchStatus && matchCategory;
    });
  }, [initialRequests, filterStatus, filterCategory]);

  const stats = useMemo(() => ({
    pending: initialRequests.filter(r => r.status === 'Pending').length,
    approved: initialRequests.filter(r => r.status === 'Approved').length,
    received: initialRequests.filter(r => r.status === 'Received').length,
    rejected: initialRequests.filter(r => r.status === 'Rejected').length,
    highUrgency: initialRequests.filter(r => r.urgency === 'high' && r.status === 'Pending').length
  }), [initialRequests]);

  const categories = useMemo(() => {
    return ['All', ...new Set(initialRequests.map(r => r.category))];
  }, [initialRequests]);

  const handleApproveWithAdjustment = async (req: Resource) => {
    const { value: formValues } = await Swal.fire({
      title: 'อนุมัติคำร้องขอ',
      html: `
        <div class="text-start">
          <label class="form-label small fw-bold">รายการ: ${req.itemName}</label>
          <div class="mb-3">
            <label for="swal-amount" class="form-label small">ระบุจำนวนที่จะอนุมัติ (${req.unit})</label>
            <input id="swal-amount" type="number" class="form-control" value="${req.amount}">
          </div>
          <div class="alert alert-warning p-2 small">
            <i class="bi bi-info-circle me-1"></i> เมื่ออนุมัติแล้ว ระบบจะตัดสต็อกออกจากคลังต้นทางทันที
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'อนุมัติรายการ',
      cancelButtonText: 'ยกเลิก',
      didOpen: () => {
        const input = document.getElementById('swal-amount') as HTMLInputElement;
        if (input) {
          input.onkeydown = (e) => {
            if (['-', '+', 'e', 'E', '.'].includes(e.key)) {
              e.preventDefault();
            }
          };
        }
      },
      preConfirm: () => {
        const amount = (document.getElementById('swal-amount') as HTMLInputElement).value;
        if (!amount || parseInt(amount) <= 0) {
          Swal.showValidationMessage('กรุณาระบุจำนวนที่ถูกต้อง');
          return false;
        }
        return { amount: parseInt(amount) };
      }
    });

    if (formValues) {
      setLoadingId(req._id);
      try {
        const res = await axios.patch(`/api/shelters/${req.shelterId}/resources/${req._id}`, {
          status: 'Approved',
          amount: formValues.amount
        });
        
        if (res.data.success) {
          showAlert.success('สำเร็จ', 'อนุมัติและตัดสต็อกเรียบร้อยแล้ว');
          router.refresh(); 
        }
      } catch (err: any) {
        console.error('Approval failed:', err);
        const msg = err.response?.data?.message || 'ไม่สามารถอนุมัติรายการได้';
        showAlert.error('ผิดพลาด', msg);
      } finally {
        setLoadingId(null);
      }
    }
  };

  const handleReceive = async (shelterId: string, resourceId: string) => {
    const isConfirmed = await showAlert.confirmDelete(
      'ยืนยันการรับของ?',
      'คุณได้รับทรัพยากรชิ้นนี้เรียบร้อยแล้วใช่หรือไม่?'
    );
    if (!isConfirmed) return;
    
    setLoadingId(resourceId);
    try {
      const res = await axios.patch(`/api/shelters/${shelterId}/resources/${resourceId}`, {
        status: 'Received'
      });
      
      if (res.data.success) {
        showAlert.success('เรียบร้อย', 'ยืนยันการรับของเรียบร้อย');
        router.refresh(); 
      }
    } catch (err) {
      console.error('Confirm receipt failed:', err);
      showAlert.error('เกิดข้อผิดพลาด', 'ไม่สามารถยืนยันรายการได้');
    } finally {
      setLoadingId(null);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'high': return <span className="badge bg-danger">ด่วนมาก</span>;
      case 'medium': return <span className="badge bg-warning text-dark">ด่วน</span>;
      case 'low': return <span className="badge bg-info text-dark">ปกติ</span>;
      default: return <span className="badge bg-secondary">ทั่วไป</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending': return <span className="badge rounded-pill border border-warning text-warning">⏳ รออนุมัติ</span>;
      case 'Approved': return <span className="badge rounded-pill bg-success text-white">✅ อนุมัติแล้ว</span>;
      case 'Received': return <span className="badge rounded-pill bg-info text-white">📥 ได้รับแล้ว</span>;
      case 'Rejected': return <span className="badge rounded-pill bg-danger text-white">❌ ปฏิเสธแล้ว</span>;
      default: return <span className="badge rounded-pill bg-secondary">{status}</span>;
    }
  };

  return (
    <div className="animate-fade-in">
      {/* 📊 Summary Cards */}
      <div className="row g-3 mb-4">
        {[
          { label: 'รออนุมัติ', id: 'Pending', count: stats.pending, color: 'warning', icon: 'bi-hourglass-split', sub: 'รายการใหม่' },
          { label: 'อนุมัติแล้ว', id: 'Approved', count: stats.approved, color: 'success', icon: 'bi-check2-circle', sub: 'พร้อมส่ง' },
          { label: 'ถึงที่หมาย', id: 'Received', count: stats.received, color: 'info', icon: 'bi-house-check', sub: 'สำเร็จ' },
          { label: 'ปฏิเสธ', id: 'Rejected', count: stats.rejected, color: 'danger', icon: 'bi-x-circle', sub: 'ยกเลิก' },
        ].map((item) => (
          <div className="col-md-3 col-lg-2" key={item.id}>
            <div 
              className={`card shadow-sm border-0 h-100 cursor-pointer transition-all position-relative overflow-hidden ${filterStatus === item.id ? 'status-card-active' : 'status-card-inactive'}`}
              style={{ 
                backgroundColor: filterStatus === item.id ? `rgba(var(--bs-${item.color}-rgb), 0.12)` : 'var(--bg-card)',
                borderLeft: `5px solid var(--bs-${item.color})` 
              }}
              onClick={() => setFilterStatus(item.id)}
            >
              <div className="card-body p-3">
                <div className={`mb-2 d-flex align-items-center justify-content-center rounded-circle bg-${item.color} bg-opacity-10`} style={{ width: '32px', height: '32px' }}>
                  <i className={`bi ${item.icon} text-${item.color}`}></i>
                </div>
                <h3 className="fw-bold mb-1" style={{ color: 'var(--text-primary)', fontSize: '1.8rem' }}>{item.count}</h3>
                <div className={`x-small fw-bold text-uppercase ls-1 text-${item.color}`} style={{ opacity: 0.8 }}>{item.label}</div>
              </div>
              
              {/* Bottom Status Line Indicator */}
              <div 
                className={`position-absolute bottom-0 start-0 end-0 bg-${item.color} ${filterStatus === item.id ? 'opacity-100' : 'opacity-25'}`} 
                style={{ height: '3px', transition: 'opacity 0.3s ease' }}
              ></div>
            </div>
          </div>
        ))}
        
        <div className="col-md-4 col-lg-4">
          <div className="card shadow-sm border-0 h-100 position-relative animate-pulse-emergency overflow-hidden" 
               style={{ 
                 backgroundColor: 'rgba(255, 193, 7, 0.08)', 
                 border: '1px solid rgba(255, 193, 7, 0.3)',
                 borderLeft: '6px solid #ffbc00',
                 borderRadius: '12px'
                }}>
            <div className="card-body d-flex align-items-center py-2 px-3">
              <div className="d-flex align-items-center justify-content-center rounded-3 bg-warning p-0 me-3 shadow-warning" style={{ width: '56px', height: '56px', minWidth: '56px', backgroundColor: '#ffbc00 !important' }}>
                <i className="bi bi-bell-fill fs-2 text-dark"></i>
              </div>
              <div>
                <h6 className="text-warning fw-bold mb-0" style={{ fontSize: '0.95rem' }}>ของด่วนมาก (รออนุมัติ)</h6>
                <div className="d-flex align-items-baseline gap-2">
                  <h2 className="text-warning fw-bold mb-0" style={{ fontSize: '2.4rem', textShadow: '0 0 12px rgba(255,188,0,0.4)' }}>{stats.highUrgency}</h2>
                  <span className="text-secondary small fw-medium">รายการค้าง</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔍 Filters */}
      <div className="card shadow-sm mb-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text border-0" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                  <i className="bi bi-funnel"></i>
                </span>
                <select 
                  className="form-select shadow-none" 
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderLeft: 'none' }}
                  value={filterStatus} 
                  onChange={e => setFilterStatus(e.target.value)}
                >
                  <option value="All">ทุกสถานะ</option>
                  <option value="Pending">⏳ รออนุมัติ</option>
                  <option value="Approved">✅ อนุมัติแล้ว</option>
                  <option value="Received">📥 ได้รับแล้ว</option>
                  <option value="Rejected">❌ ปฏิเสธแล้ว</option>
                </select>
              </div>
            </div>
            <div className="col-md-4">
              <select 
                className="form-select form-select-sm shadow-none" 
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                value={filterCategory} 
                onChange={e => setFilterCategory(e.target.value)}
              >
                <option value="All">ทุกหมวดหมู่</option>
                {categories.filter((c: string) => c !== 'All').map((cat: string) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="col-md-4 text-end">
              <button 
                className="btn btn-sm" 
                style={{ 
                  backgroundColor: 'var(--bg-card)', 
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  padding: '4px 12px'
                }}
                onClick={() => {setFilterStatus('All'); setFilterCategory('All');}}
              >
                ล้างตัวกรอง
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 📋 Table */}
      <div className="table-responsive rounded border shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <table className="table table-hover align-middle mb-0">
          <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <tr style={{ color: 'var(--text-secondary)' }}>
              <th className="ps-4">ศูนย์พักพิง</th>
              <th>รายการ</th>
              <th>จำนวน</th>
              <th>คลังต้นทาง</th>
              <th>ความด่วน</th>
              <th>สถานะ</th>
              <th>วันที่ขอ</th>
              <th className="text-end pe-4">การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length > 0 ? (
              filteredRequests.map((req: Resource) => (
                <tr key={req._id} style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}>
                  <td className="ps-4 fw-bold">{req.shelterName}</td>
                  <td>
                    <div className="fw-bold">{req.itemName}</div>
                    <small style={{ color: 'var(--text-secondary)' }}>{req.category}</small>
                  </td>
                  <td><span className="fw-bold text-primary">{req.amount}</span> {req.unit}</td>
                  <td className="small text-muted">{req.sourceHubName || '-'}</td>
                  <td>{getUrgencyBadge(req.urgency)}</td>
                  <td>{getStatusBadge(req.status)}</td>
                  <td className="small" style={{ color: 'var(--text-secondary)' }}>
                    {new Intl.DateTimeFormat('th-TH', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }).format(new Date(req.requestedAt))}
                  </td>
                  <td className="text-end pe-4">
                    {req.status === 'Pending' && (
                      <button 
                        className="btn btn-sm btn-primary px-3 rounded-pill fw-bold"
                        disabled={loadingId === req._id}
                        onClick={() => handleApproveWithAdjustment(req)}
                      >
                        {loadingId === req._id ? '⏳' : '✅ อนุมัติ'}
                      </button>
                    )}
                    {req.status === 'Approved' && (
                      <button 
                        className="btn btn-sm btn-success px-3 rounded-pill fw-bold"
                        disabled={loadingId === req._id}
                        onClick={() => handleReceive(req.shelterId, req._id)}
                      >
                        {loadingId === req._id ? '⏳' : '📥 ยืนยันรับของ'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-5" style={{ color: 'var(--text-secondary)' }}>
                  <i className="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>
                  ไม่พบรายการร้องขอที่ตรงตามเงื่อนไข
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .cursor-pointer { cursor: pointer; }
        .transition-all { transition: all 0.25s ease; }
        .status-card-inactive:hover { 
          transform: translateY(-5px); 
          box-shadow: 0 8px 15px rgba(0,0,0,0.1) !important;
          background-color: rgba(255,255,255,0.05) !important;
        }
        .status-card-active { 
          background-color: rgba(255,255,255,0.08) !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        }
        .x-small { font-size: 0.65rem; letter-spacing: 0.5px; }
        .shadow-warning { box-shadow: 0 0 15px rgba(255, 193, 7, 0.4); }
        .animate-pulse-emergency {
          animation: pulseEmergency 2s infinite ease-in-out;
        }
        @keyframes pulseEmergency {
          0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(255, 193, 7, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
