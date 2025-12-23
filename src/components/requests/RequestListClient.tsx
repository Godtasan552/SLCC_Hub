'use client';

import { useState, useMemo } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

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

  const handleReceive = async (shelterId: string, resourceId: string) => {
    if (!confirm('ยืนยันว่าได้รับทรัพยากรชิ้นนี้แล้ว?')) return;
    
    setLoadingId(resourceId);
    try {
      const res = await axios.patch(`/api/shelters/${shelterId}/resources/${resourceId}`, {
        status: 'Received'
      });
      
      if (res.data.success) {
        alert('ยืนยันการรับของเรียบร้อย');
        router.refresh(); 
      }
    } catch (err) {
      console.error('Confirm receipt failed:', err);
      alert('เกิดข้อผิดพลาดในการยืนยันรายการ');
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
          { label: '⏳ รออนุมัติ', count: stats.pending, color: 'warning', sub: 'รายการใหม่' },
          { label: '✅ อนุมัติ', count: stats.approved, color: 'success', sub: 'อนุมัติแล้ว' },
          { label: '📥 ได้รับแล้ว', count: stats.received, color: 'info', sub: 'ของถึงที่หมาย' },
          { label: '❌ ปฏิเสธ', count: stats.rejected, color: 'danger', sub: 'ปฏิเสธแล้ว' },
        ].map((item, idx) => (
          <div className="col-md-3 col-lg-2" key={idx}>
            <div className={`card shadow-sm border-0 h-100 bg-${item.color} bg-opacity-10`}>
              <div className="card-body">
                <span className={`badge bg-${item.color} mb-2`}>{item.label}</span>
                <h2 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>{item.count}</h2>
                <small className="text-secondary">{item.sub}</small>
              </div>
            </div>
          </div>
        ))}
        <div className="col-md-4 col-lg-4">
          <div className="card shadow-sm border-2 border-warning h-100" style={{ backgroundColor: 'var(--bg-card)' }}>
            <div className="card-body text-center d-flex flex-column justify-content-center">
              <h6 className="text-warning fw-bold mb-1">🚨 ของด่วนมาก (รออนุมัติ)</h6>
              <h2 className="text-warning fw-bold mb-0">{stats.highUrgency}</h2>
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
