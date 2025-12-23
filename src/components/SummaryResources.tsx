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

export default function SummaryResources({ allShelters }: SummaryResourcesProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Shipped' | 'Received' | 'Rejected'>('Pending');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterUrgency, setFilterUrgency] = useState<string>('All');

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
      const urgencyMatch = filterUrgency === 'All' || r.urgency === filterUrgency;
      return statusMatch && categoryMatch && urgencyMatch;
    });
  }, [allRequestsState, filterStatus, filterCategory, filterUrgency]);

  const statusStats = useMemo(() => ({
    pending: allRequestsState.filter((r: Resource) => r.status === 'Pending').length,
    approved: allRequestsState.filter((r: Resource) => r.status === 'Approved').length,
    shipped: allRequestsState.filter((r: Resource) => r.status === 'Shipped').length,
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

  const urgencyStats = useMemo(() => ({
    high: allRequestsState.filter((r: Resource) => r.urgency === 'high' && r.status === 'Pending').length,
    medium: allRequestsState.filter((r: Resource) => r.urgency === 'medium' && r.status === 'Pending').length,
    low: allRequestsState.filter((r: Resource) => r.urgency === 'low' && r.status === 'Pending').length
  }), [allRequestsState]);

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
        <div className="col-md-2">
          <div className="card shadow-sm border-0 h-100 bg-warning bg-opacity-10">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="badge bg-warning text-dark">⏳ รออนุมัติ</span>
                <i className="bi bi-clock-history fs-4 text-warning"></i>
              </div>
              <h2 className="fw-bold mb-0">{statusStats.pending}</h2>
              <small className="text-secondary">รายการคำร้องขอใหม่</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card shadow-sm border-0 h-100 bg-success bg-opacity-10">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="badge bg-success">✅ อนุมัติ</span>
                <i className="bi bi-check-circle fs-4 text-success"></i>
              </div>
              <h2 className="fw-bold mb-0">{statusStats.approved}</h2>
              <small className="text-secondary">อนุมัติแล้ว</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card shadow-sm border-0 h-100 bg-primary bg-opacity-10">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="badge bg-primary">🚚 กำลังส่ง</span>
                <i className="bi bi-truck fs-4 text-primary"></i>
              </div>
              <h2 className="fw-bold mb-0">{statusStats.shipped}</h2>
              <small className="text-secondary">อยู่ระหว่างการนำส่ง</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card shadow-sm border-0 h-100 bg-info bg-opacity-10">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="badge bg-info">📥 ได้รับแล้ว</span>
                <i className="bi bi-check-circle-fill fs-4 text-info"></i>
              </div>
              <h2 className="fw-bold mb-0">{statusStats.received}</h2>
              <small className="text-secondary">ของถึงที่หมายเรียบร้อย</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card shadow-sm border-0 h-100 bg-danger bg-opacity-10">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="badge bg-danger">❌ ปฏิเสธ</span>
                <i className="bi bi-x-circle-fill fs-4 text-danger"></i>
              </div>
              <h2 className="fw-bold mb-0">{statusStats.rejected}</h2>
              <small className="text-secondary">ปฏิเสธแล้ว</small>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card shadow-sm border-2 border-warning h-100">
            <div className="card-body text-center d-flex flex-column justify-content-center">
              <h6 className="text-warning fw-bold mb-1">🚨 ของด่วนมาก</h6>
              <h2 className="text-warning fw-bold mb-0">{urgencyStats.high}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* 🔍 Filters */}
      <div className="card shadow-sm border-0 mb-4 bg-light">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-4">
              <div className="input-group input-group-sm">
                <span className="input-group-text bg-white border-0"><i className="bi bi-funnel"></i></span>
                <select 
                  className="form-select border-0 shadow-none" 
                  value={filterStatus} 
                  onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
                >
                  <option value="All">ทุกสถานะ</option>
                  <option value="Pending">⏳ รออนุมัติ</option>
                  <option value="Approved">✅ อนุมัติแล้ว</option>
                  <option value="Shipped">🚚 กำลังส่ง</option>
                  <option value="Received">📥 ได้รับแล้ว</option>
                  <option value="Rejected">❌ ปฏิเสธแล้ว</option>
                </select>
              </div>
            </div>
            <div className="col-md-4">
              <select className="form-select form-select-sm border-0 shadow-none" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="All">ทุกหมวดหมู่</option>
                {Object.keys(categoryStats).map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="col-md-4 text-end">
              <button className="btn btn-sm btn-white text-danger border-0" onClick={() => {setFilterStatus('All'); setFilterCategory('All'); setFilterUrgency('All');}}>
                ล้างตัวกรอง
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 📋 Table */}
      <div className="card shadow-sm border-0 overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr className="small text-secondary">
                <th className="ps-4">ประเภท / วันที่ขอ</th>
                <th>ชื่อสิ่งของ</th>
                <th>จำนวนที่ขอ</th>
                <th>จากศูนย์</th>
                <th>ความด่วน</th>
                <th className="text-end pe-4">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req: Resource) => {
                return (
                  <tr key={req._id}>
                    <td className="ps-4">
                      <div className="d-flex align-items-center">
                        <span className="fs-4 me-3">{getCategoryIcon(req.category)}</span>
                        <div>
                          <div className="small fw-bold text-dark">{req.category}</div>
                          <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                            {new Date(req.requestedAt).toLocaleDateString('th-TH')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="fw-bold text-dark">{req.itemName}</div>
                    </td>
                    <td>
                      <span className="fw-bold text-primary">{req.amount}</span> {req.unit}
                    </td>
                    <td>
                      <span className="badge bg-light text-dark fw-normal border shadow-sm">
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
                        <span className="badge rounded-pill px-3 bg-success">
                          ✅ อนุมัติแล้ว
                        </span>
                      ) : req.status === 'Shipped' ? (
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
                  <td colSpan={6} className="text-center py-5 text-secondary">
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
        .table-hover tbody tr:hover {
          background-color: rgba(0,0,0,0.02);
        }
        .btn-white {
          background: white;
          border: 1px solid #eee;
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