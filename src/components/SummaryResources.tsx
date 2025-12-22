'use client';

import { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { Supply } from '@/types/supply';

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
}

interface Shelter {
  _id: string;
  name: string;
  resources: Resource[];
}

interface SummaryResourcesProps {
  allShelters: Shelter[];
}

export default function SummaryResources({ allShelters }: SummaryResourcesProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'All' | 'Pending' | 'Approved' | 'Shipped' | 'Received'>('Pending');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterUrgency, setFilterUrgency] = useState<string>('All');
  const [hubSupplies, setHubSupplies] = useState<Supply[]>([]);

  // Fetch hub supplies on mount to check stock availability
  useEffect(() => {
    const fetchHubSupplies = async () => {
      try {
        const res = await axios.get('/api/supplies');
        // Filter those that are in hub (no shelterId)
        setHubSupplies(res.data.data.filter((s: Supply) => !s.shelterId));
      } catch (err) {
        console.error('Failed to fetch hub supplies:', err);
      }
    };
    fetchHubSupplies();
  }, []);

  // Check how much of a specific item is in hub
  const getHubStock = (itemName: string, category: string) => {
    return hubSupplies
      .filter(s => s.name.toLowerCase() === itemName.toLowerCase() && s.category === category)
      .reduce((sum, s) => sum + s.quantity, 0);
  };

  // 🔹 รวมคำขอจากทุกศูนย์
  const initialRequests = useMemo(() => {
    return allShelters.flatMap(s =>
      (s.resources || []).map(r => ({
        ...r,
        shelterId: s._id,
        shelterName: s.name
      }))
    ).sort(
      (a, b) =>
        new Date(b.requestedAt || 0).getTime() -
        new Date(a.requestedAt || 0).getTime()
    );
  }, [allShelters]);

  const [allRequestsState, setAllRequestsState] = useState(initialRequests);

  const filteredRequests = useMemo(() => {
    return allRequestsState.filter(r => {
      const statusMatch = filterStatus === 'All' || r.status === filterStatus;
      const categoryMatch = filterCategory === 'All' || r.category === filterCategory;
      const urgencyMatch = filterUrgency === 'All' || r.urgency === filterUrgency;
      return statusMatch && categoryMatch && urgencyMatch;
    });
  }, [allRequestsState, filterStatus, filterCategory, filterUrgency]);

  const statusStats = useMemo(() => ({
    pending: allRequestsState.filter(r => r.status === 'Pending').length,
    approved: allRequestsState.filter(r => r.status === 'Approved').length,
    shipped: allRequestsState.filter(r => r.status === 'Shipped').length,
    received: allRequestsState.filter(r => r.status === 'Received').length
  }), [allRequestsState]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    allRequestsState.forEach(r => {
      stats[r.category] = (stats[r.category] || 0) + 1;
    });
    return stats;
  }, [allRequestsState]);

  const urgencyStats = useMemo(() => ({
    high: allRequestsState.filter(r => r.urgency === 'high' && r.status === 'Pending').length,
    medium: allRequestsState.filter(r => r.urgency === 'medium' && r.status === 'Pending').length,
    low: allRequestsState.filter(r => r.urgency === 'low' && r.status === 'Pending').length
  }), [allRequestsState]);

  // NEW: Disburse function (Active stock deduction)
  const handleDisburse = async (shelterId: string, resourceId: string) => {
    if (!confirm('ยืนยันการตัดสต็อกคลังกลางและจัดส่งไปยังศูนย์ปลายทาง?')) return;
    
    setLoadingId(resourceId);
    try {
      const res = await axios.post('/api/disbursement', { shelterId, resourceId });
      if (res.data.success) {
        setAllRequestsState(prev =>
          prev.map(r => r._id === resourceId ? { ...r, status: 'Shipped' } : r)
        );
        // Refresh hub stock
        const freshSupplies = await axios.get('/api/supplies');
        setHubSupplies(freshSupplies.data.data.filter((s: Supply) => !s.shelterId));
        alert('ตัดสต็อกและสถานะเปลี่ยนเป็น "กำลังจัดส่ง" เรียบร้อยแล้ว');
      }
    } catch (err: unknown) {
      const errorMsg = axios.isAxiosError(err) ? err.response?.data?.error : (err as Error).message;
      alert(`เบิกจ่ายไม่สำเร็จ: ${errorMsg}`);
    } finally {
      setLoadingId(null);
    }
  };

  // NEW: Receive function (Add to shelter stock)
  const handleReceive = async (shelterId: string, resourceId: string) => {
    if (!confirm('ยืนยันว่าได้รับของชิ้นนี้แล้ว? (ยอดจะไปเพิ่มในสต็อกของศูนย์ปลายทาง)')) return;
    
    setLoadingId(resourceId);
    try {
      const res = await axios.patch(`/api/shelters/${shelterId}/resources/${resourceId}`, { status: 'Received' });
      if (res.data.success) {
        setAllRequestsState(prev =>
          prev.map(r => r._id === resourceId ? { ...r, status: 'Received' } : r)
        );
        alert('ยืนยันการรับของเรียบร้อย ยอดคงเหลือถูกเพิ่มเข้าสู่ศูนย์แล้ว');
      }
    } catch (err: unknown) {
      const errorMsg = axios.isAxiosError(err) ? err.response?.data?.message : (err as Error).message;
      alert(`ยืนยันการรับของไม่สำเร็จ: ${errorMsg}`);
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
    <div className="mt-4 pb-5">
      {/* 📊 Summary Cards */}
      <div className="row mb-4 g-3">
        <div className="col-md-3">
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
        <div className="col-md-3">
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
        <div className="col-md-3">
          <div className="card shadow-sm border-0 h-100 bg-success bg-opacity-10">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="badge bg-success">📥 ได้รับแล้ว</span>
                <i className="bi bi-check-circle-fill fs-4 text-success"></i>
              </div>
              <h2 className="fw-bold mb-0">{statusStats.received}</h2>
              <small className="text-secondary">ของถึงที่หมายเรียบร้อย</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-2 border-danger h-100">
            <div className="card-body text-center d-flex flex-column justify-content-center">
              <h6 className="text-danger fw-bold mb-1">🚨 ของด่วนมาก</h6>
              <h2 className="text-danger fw-bold mb-0">{urgencyStats.high}</h2>
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
                  <option value="Shipped">🚚 กำลังส่ง</option>
                  <option value="Received">📥 ได้รับแล้ว</option>
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
                <th>สต็อกกลางคงเหลือ</th>
                <th>จากศูนย์</th>
                <th>ความด่วน</th>
                <th className="text-end pe-4">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map(req => {
                const stockAvailable = getHubStock(req.itemName, req.category);
                const hasEnough = stockAvailable >= req.amount;
                
                return (
                  <tr key={req._id} className="border-bottom">
                    <td className="ps-4 py-3">
                      <div className="d-flex align-items-center">
                        <span className="fs-4 me-2">{getCategoryIcon(req.category)}</span>
                        <div>
                          <div className="small fw-bold">{req.category}</div>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {new Date(req.requestedAt).toLocaleDateString('th-TH')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="fw-bold fs-6">{req.itemName}</td>
                    <td>
                      <span className="badge bg-light text-dark border px-3 py-2">
                        {req.amount} {req.unit}
                      </span>
                    </td>
                    <td>
                      {req.status === 'Pending' ? (
                        <div className={`fw-bold ${hasEnough ? 'text-success' : 'text-danger'}`}>
                          {stockAvailable} {req.unit} 
                          {hasEnough ? <i className="bi bi-check-circle ms-1"></i> : <i className="bi bi-x-circle ms-1"></i>}
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td><div className="small text-secondary fw-bold px-2 py-1 bg-light rounded d-inline-block">{req.shelterName}</div></td>
                    <td>{getUrgencyBadge(req.urgency)}</td>
                    <td className="text-end pe-4">
                      {req.status === 'Pending' ? (
                        <button 
                          className={`btn btn-sm px-3 rounded-pill fw-bold ${hasEnough ? 'btn-primary' : 'btn-outline-danger'}`}
                          disabled={loadingId === req._id || !hasEnough}
                          onClick={() => handleDisburse(req.shelterId!, req._id!)}
                        >
                          {loadingId === req._id ? 'กำลังส่ง...' : hasEnough ? '🚀 ตัดจ่ายตอนนี้' : '🚩 ของไม่พอ'}
                        </button>
                      ) : req.status === 'Shipped' ? (
                        <button 
                          className="btn btn-sm btn-success px-3 rounded-pill fw-bold"
                          disabled={loadingId === req._id}
                          onClick={() => handleReceive(req.shelterId!, req._id!)}
                        >
                          {loadingId === req._id ? 'กำลังบันทึก...' : '📥 ยืนยันรับของ'}
                        </button>
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
                  <td colSpan={7} className="text-center py-5 text-secondary">
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
      `}</style>
    </div>
  );
}