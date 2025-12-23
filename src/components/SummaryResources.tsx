'use client';

import { useState, useMemo } from 'react';
import axios from 'axios';
import useSWR from 'swr';

interface Resource {
  _id?: string;
  category: string;
  itemName: string;
  amount: number;
  unit: string;
  urgency: 'low' | 'medium' | 'high';
  status: string;
  requestedAt: Date | string;
  shelterId?: string;
  shelterName?: string;
  isHub?: boolean;
}

interface Shelter {
  _id: string;
  name: string;
  resources: Resource[];
  isHub?: boolean;
}

interface SummaryResourcesProps {
  allShelters: Shelter[];
}

const fetcher = (url: string) => axios.get(url).then(res => res.data.data);

type RequestStatus = 'All' | 'Pending' | 'Approved' | 'Received' | 'Rejected';

export default function SummaryResources({ allShelters }: SummaryResourcesProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<RequestStatus>('Pending');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 🔹 Fetch real-time data using SWR
  const { data: latestShelters, mutate } = useSWR<Shelter[]>('/api/requests/summary', fetcher, {
    fallbackData: allShelters,
    refreshInterval: 10000, // Refresh every 10 seconds
    revalidateOnFocus: true
  });

  // 🔹 รวมคำขอจากทุกศูนย์
  const allRequestsState = useMemo(() => {
    const currentData = latestShelters || allShelters;
    return currentData.flatMap((s: Shelter) =>
      (s.resources || []).map((r: Resource) => ({
        ...r,
        shelterId: s._id,
        shelterName: s.name,
        isHub: s.isHub
      }))
    ).sort(
      (a: Resource, b: Resource) =>
        new Date(b.requestedAt || 0).getTime() -
        new Date(a.requestedAt || 0).getTime()
    );
  }, [latestShelters, allShelters]);

  const filteredRequests = useMemo(() => {
    return allRequestsState.filter((r: Resource) => {
      const statusMatch = filterStatus === 'All' || r.status === filterStatus;
      const categoryMatch = filterCategory === 'All' || r.category === filterCategory;
      const searchMatch = !searchTerm || 
        r.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.shelterName?.toLowerCase().includes(searchTerm.toLowerCase());
      return statusMatch && categoryMatch && searchMatch;
    });
  }, [allRequestsState, filterStatus, filterCategory, searchTerm]);

  const statusStats = useMemo(() => ({
    pending: allRequestsState.filter((r: Resource) => r.status === 'Pending').length,
    approved: allRequestsState.filter((r: Resource) => r.status === 'Approved').length,
    received: allRequestsState.filter((r: Resource) => r.status === 'Received').length,
    rejected: allRequestsState.filter((r: Resource) => r.status === 'Rejected').length
  }), [allRequestsState]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    allRequestsState.forEach((r: Resource) => {
      stats[r.category] = (stats[r.category] || 0) + 1;
    });
    return stats;
  }, [allRequestsState]);



  // NEW: Receive function
  const handleReceive = async (targetId: string, resourceId: string, isHub: boolean) => {
    const msg = isHub ? 'ยืนยันการรับของบริจาคเข้าสู่คลังกลาง?' : 'ยืนยันว่าได้รับของชิ้นนี้แล้ว? (ยอดจะไปเพิ่มในสต็อกของศูนย์ปลายทาง)';
    if (!confirm(msg)) return;
    
    setLoadingId(resourceId);
    try {
      const endpoint = isHub ? `/api/hubs/${targetId}/resources/${resourceId}` : `/api/shelters/${targetId}/resources/${resourceId}`;
      const res = await axios.patch(endpoint, { status: 'Received' });
      if (res.data.success) {
        // อัปเดตข้อมูลผ่าน SWR Mutate
        mutate();
        alert('ยืนยันการรับของเรียบร้อย ยอดคงเหลือถูกเพิ่มเข้าสู่ระบบแล้ว');
      }
    } catch (err: unknown) {
      const errorMsg = axios.isAxiosError(err) ? err.response?.data?.message : (err as Error).message;
      alert(`ยืนยันการรับของไม่สำเร็จ: ${errorMsg}`);
    } finally {
      setLoadingId(null);
    }
  };

  // NEW: Approve function (Admin only)
  const handleApprove = async (shelterId: string, resourceId: string, isHub: boolean) => {
    if (!confirm('ยืนยันการอนุมัติคำร้องขอนี้? ระบบจะตัดสต็อกจากคลังกลางอัตโนมัติ')) return;
    
    setLoadingId(resourceId);
    try {
      const res = await axios.post('/api/requests/approve', { 
        shelterId: isHub ? undefined : shelterId,
        hubId: isHub ? shelterId : undefined,
        resourceId, 
        action: 'approve' 
      });
      
      if (res.data.success) {
        mutate();
        alert(`✅ ${res.data.message}\nตัดสต็อก: ${res.data.stockDeducted} หน่วย`);
      }
    } catch (err: unknown) {
      const errorMsg = axios.isAxiosError(err) ? err.response?.data?.error : (err as Error).message;
      alert(`❌ อนุมัติไม่สำเร็จ: ${errorMsg}`);
    } finally {
      setLoadingId(null);
    }
  };

  // NEW: Reject function (Admin only)
  const handleReject = async (shelterId: string, resourceId: string, isHub: boolean) => {
    if (!confirm('ยืนยันการปฏิเสธคำร้องขอนี้?')) return;
    
    setLoadingId(resourceId);
    try {
      const res = await axios.post('/api/requests/approve', { 
        shelterId: isHub ? undefined : shelterId,
        hubId: isHub ? shelterId : undefined,
        resourceId, 
        action: 'reject' 
      });
      
      if (res.data.success) {
        mutate();
        alert('❌ ปฏิเสธคำร้องขอเรียบร้อย');
      }
    } catch (err: unknown) {
      const errorMsg = axios.isAxiosError(err) ? err.response?.data?.error : (err as Error).message;
      alert(`ปฏิเสธไม่สำเร็จ: ${errorMsg}`);
    } finally {
      setLoadingId(null);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'high': return <span className="badge bg-danger">ด่วนมาก</span>;
      case 'medium': return <span className="badge bg-warning text-dark">ด่วน</span>;
      case 'low': return <span className="badge bg-info text-dark">ปกติ</span>;
      default: return <span className="badge bg-secondary">{urgency}</span>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Medical': case 'ยา และเวชภัณฑ์': return '💊';
      case 'Food': case 'อาหารและน้ำดื่ม': return '🍚';
      case 'Supplies': case 'สิ่งของเครื่องใช้': return '📦';
      default: return '📋';
    }
  };

  return (
    <div className="animate-fade-in">
      {/* 📊 Summary Cards */}
      <div className="row g-3 mb-4">
        {[
          { label: '⏳ รออนุมัติ', id: 'Pending', count: statusStats.pending, color: 'warning', sub: 'รายการคำร้องขอใหม่' },
          { label: '✅ อนุมัติ', id: 'Approved', count: statusStats.approved, color: 'success', sub: 'อนุมัติแล้ว' },
          { label: '📥 ได้รับแล้ว', id: 'Received', count: statusStats.received, color: 'info', sub: 'ของถึงที่หมายเรียบร้อย' },
          { label: '❌ ปฏิเสธ', id: 'Rejected', count: statusStats.rejected, color: 'danger', sub: 'ปฏิเสธแล้ว' },
        ].map((item) => (
          <div className="col-md-3" key={item.id}>
            <div 
              className={`card shadow-sm border-0 h-100 cursor-pointer transition-all ${filterStatus === item.id ? 'ring-active' : ''}`}
              style={{ backgroundColor: `var(--bg-card)`, border: filterStatus === item.id ? '2px solid var(--bs-' + item.color + ')' : '1px solid var(--border-color)' }}
              onClick={() => setFilterStatus(item.id as RequestStatus)}
            >
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className={`badge bg-${item.color} bg-opacity-25 text-${item.color}`}>{item.label}</span>
                  <i className={`bi bi-circle-fill fs-6 text-${item.color}`} style={{ opacity: filterStatus === item.id ? 1 : 0.2 }}></i>
                </div>
                <h2 className="fw-bold mb-0" style={{ color: 'var(--text-primary)' }}>{item.count}</h2>
                <small className="text-secondary opacity-75">{item.sub}</small>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 🔍 Advanced Filter Bar */}
      <div className="card shadow-sm mb-4 border-0 overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="card-body p-3">
          <div className="row g-2 align-items-center">
            {/* Status Tabs */}
            <div className="col-12 col-xl-5">
              <div className="btn-group btn-group-sm p-1 rounded-pill bg-secondary bg-opacity-10" style={{ border: '1px solid var(--border-color)' }}>
                {[
                  { id: 'All', label: 'ทั้งหมด' },
                  { id: 'Pending', label: 'รออนุมัติ' },
                  { id: 'Approved', label: 'อนุมัติแล้ว' },
                  { id: 'Received', label: 'ได้รับแล้ว' },
                  { id: 'Rejected', label: 'ปฏิเสธ' }
                ].map((s) => (
                  <button 
                    key={s.id}
                    className={`btn px-3 rounded-pill border-0 fw-bold ${filterStatus === s.id ? 'btn-primary shadow-sm' : 'text-secondary'}`}
                    onClick={() => setFilterStatus(s.id as RequestStatus)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div className="col-12 col-md-4 col-xl-3">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-transparent border-end-0 text-secondary" style={{ borderColor: 'var(--border-color)' }}>
                  <i className="bi bi-tag"></i>
                </span>
                <select 
                  className="form-select border-start-0 shadow-none fw-bold" 
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                  value={filterCategory} 
                  onChange={e => setFilterCategory(e.target.value)}
                >
                  <option value="All">ทุกหมวดหมู่ ({allRequestsState.length})</option>
                  {Object.entries(categoryStats).map(([cat, count]) => (
                    <option key={cat} value={cat}>{cat} ({count})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Keyword Search */}
            <div className="col-12 col-md-8 col-xl-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-transparent border-end-0 text-secondary" style={{ borderColor: 'var(--border-color)' }}>
                  <i className="bi bi-search"></i>
                </span>
                <input 
                  type="text" 
                  className="form-control border-start-0 shadow-none" 
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' }}
                  placeholder="ค้นหาชื่อสิ่งของ หรือ ศูนย์พักพิง..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <button 
                  className="btn btn-outline-secondary border-start-0" 
                  style={{ borderColor: 'var(--border-color)' }}
                  onClick={() => {setFilterStatus('All'); setFilterCategory('All'); setSearchTerm('');}}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📋 Table */}
      <div className="card shadow-sm border-0 overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr className="small" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
                <th className="ps-4 border-0">ประเภท / วันที่ขอ</th>
                <th className="border-0">ชื่อสิ่งของ</th>
                <th className="border-0">จำนวนที่ขอ</th>
                <th className="border-0">จากศูนย์</th>
                <th className="border-0">ความด่วน</th>
                <th className="border-0 text-end pe-4">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req: Resource) => {
                return (
                  <tr key={req._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center">
                        <span className="fs-4 me-3">{getCategoryIcon(req.category)}</span>
                        <div>
                          <div className="small fw-bold" style={{ color: 'var(--text-primary)' }}>{req.category}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {new Date(req.requestedAt).toLocaleDateString('th-TH')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="fw-bold" style={{ color: 'var(--text-primary)' }}>{req.itemName}</div>
                    </td>
                    <td>
                      <span className="fw-bold text-primary">{req.amount}</span> <span style={{ color: 'var(--text-secondary)' }}>{req.unit}</span>
                    </td>
                    <td>
                      <span className="badge fw-normal border shadow-sm" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', borderColor: 'var(--border-color) !important' }}>
                        {req.isHub ? '📦' : '🏠'} {req.shelterName}
                      </span>
                    </td>
                    <td>{getUrgencyBadge(req.urgency)}</td>
                    <td className="text-end pe-4">
                      {req.status === 'Pending' ? (
                        <div className="btn-group btn-group-sm">
                          <button 
                            className="btn btn-success px-3 rounded-start-pill fw-bold"
                            disabled={loadingId === req._id}
                            onClick={() => handleApprove(req.shelterId!, req._id!, !!req.isHub)}
                          >
                            {loadingId === req._id ? '⏳' : '✅ อนุมัติ'}
                          </button>
                          <button 
                            className="btn btn-danger px-3 rounded-end-pill fw-bold"
                            disabled={loadingId === req._id}
                            onClick={() => handleReject(req.shelterId!, req._id!, !!req.isHub)}
                          >
                            {loadingId === req._id ? '⏳' : '❌ ปฏิเสธ'}
                          </button>
                        </div>
                      ) : req.status === 'Approved' ? (
                        <button 
                          className="btn btn-sm btn-success px-3 rounded-pill fw-bold"
                          disabled={loadingId === req._id}
                          onClick={() => handleReceive(req.shelterId!, req._id!, !!req.isHub)}
                        >
                          {loadingId === req._id ? 'กำลังบันทึก...' : '📥 ยืนยันรับของ'}
                        </button>
                      ) : req.status === 'Rejected' ? (
                        <span className="badge rounded-pill px-3 bg-danger">
                          ❌ ปฏิเสธแล้ว
                        </span>
                      ) : (
                        <span className="badge rounded-pill px-3 bg-secondary">
                          📥 ได้รับแล้ว
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-5" style={{ color: 'var(--text-secondary)' }}>
                    <i className="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>
                    ไม่มีรายการที่ตรงตามเงื่อนไข
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <style jsx>{`
        .cursor-pointer { cursor: pointer; }
        .transition-all { transition: all 0.2s ease; }
        .transition-all:hover { transform: translateY(-3px); }
        .ring-active { box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.2); }
        .bg-card { background-color: var(--bg-card); }
        .border-theme { border-color: var(--border-color) !important; }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}