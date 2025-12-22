'use client';

import { useState, useMemo } from 'react';

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

  // 🔹 รวมคำขอจากทุกศูนย์
  const allRequests = useMemo(() => {
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

  // 🔍 Filter สำหรับแสดงผล
  const filteredRequests = useMemo(() => {
    return allRequests.filter(r => {
      const statusMatch = filterStatus === 'All' || r.status === filterStatus;
      const categoryMatch = filterCategory === 'All' || r.category === filterCategory;
      const urgencyMatch = filterUrgency === 'All' || r.urgency === filterUrgency;
      return statusMatch && categoryMatch && urgencyMatch;
    });
  }, [allRequests, filterStatus, filterCategory, filterUrgency]);

  // 📊 สถิติตามสถานะ
  const statusStats = useMemo(() => ({
    pending: allRequests.filter(r => r.status === 'Pending').length,
    approved: allRequests.filter(r => r.status === 'Approved').length,
    shipped: allRequests.filter(r => r.status === 'Shipped').length,
    received: allRequests.filter(r => r.status === 'Received').length
  }), [allRequests]);

  // 📊 สถิติตามประเภท
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    allRequests.forEach(r => {
      stats[r.category] = (stats[r.category] || 0) + 1;
    });
    return stats;
  }, [allRequests]);

  // 📊 สถิติตามความเร่งด่วน
  const urgencyStats = useMemo(() => ({
    high: allRequests.filter(r => r.urgency === 'high' && r.status === 'Pending').length,
    medium: allRequests.filter(r => r.urgency === 'medium' && r.status === 'Pending').length,
    low: allRequests.filter(r => r.urgency === 'low' && r.status === 'Pending').length
  }), [allRequests]);

  const approveRequest = async (shelterId: string, resourceId?: string) => {
    if (!resourceId) return;

    setLoadingId(resourceId);

    const res = await fetch(
      `/api/shelters/${shelterId}/resources/${resourceId}`,
      { method: 'PATCH' }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || 'ไม่สามารถอนุมัติได้');
    } else {
      alert('อนุมัติคำขอเรียบร้อยแล้ว');
      location.reload();
    }

    setLoadingId(null);
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return <span className="badge bg-danger">ด่วนมาก</span>;
      case 'medium':
        return <span className="badge bg-warning text-dark">ด่วน</span>;
      case 'low':
        return <span className="badge bg-info text-dark">ปกติ</span>;
      default:
        return <span className="badge bg-secondary">{urgency}</span>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Medical': return '💊';
      case 'Food': return '🍚';
      case 'Supplies': return '📦';
      case 'Others': return '📌';
      default: return '📋';
    }
  };

  return (
    <div className="mt-4">

      {/* 📊 Summary Cards - สถานะ */}
      <div className="row mb-3">
        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card text-white bg-warning h-100">
            <div className="card-body">
              <h6 className="card-title">⏳ รอการอนุมัติ</h6>
              <h2 className="mb-0">{statusStats.pending}</h2>
              <small>รายการ</small>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card text-white bg-success h-100">
            <div className="card-body">
              <h6 className="card-title">✅ อนุมัติแล้ว</h6>
              <h2 className="mb-0">{statusStats.approved}</h2>
              <small>รายการ</small>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card text-white bg-primary h-100">
            <div className="card-body">
              <h6 className="card-title">🚚 กำลังจัดส่ง</h6>
              <h2 className="mb-0">{statusStats.shipped}</h2>
              <small>รายการ</small>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card text-white bg-secondary h-100">
            <div className="card-body">
              <h6 className="card-title">📥 ได้รับแล้ว</h6>
              <h2 className="mb-0">{statusStats.received}</h2>
              <small>รายการ</small>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 Summary Cards - ประเภททรัพยากร */}
      <div className="row mb-3">
        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card border-danger h-100">
            <div className="card-body">
              <h6 className="card-title text-danger">💊 Medical (ยา)</h6>
              <h3 className="mb-0">{categoryStats.Medical || 0}</h3>
              <small className="text-muted">รายการ</small>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card border-success h-100">
            <div className="card-body">
              <h6 className="card-title text-success">🍚 Food (อาหาร)</h6>
              <h3 className="mb-0">{categoryStats.Food || 0}</h3>
              <small className="text-muted">รายการ</small>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card border-primary h-100">
            <div className="card-body">
              <h6 className="card-title text-primary">📦 Supplies (ของใช้)</h6>
              <h3 className="mb-0">{categoryStats.Supplies || 0}</h3>
              <small className="text-muted">รายการ</small>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6 mb-3">
          <div className="card border-secondary h-100">
            <div className="card-body">
              <h6 className="card-title text-secondary">📌 Others (อื่นๆ)</h6>
              <h3 className="mb-0">{categoryStats.Others || 0}</h3>
              <small className="text-muted">รายการ</small>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 Urgency Stats - รอการอนุมัติ */}
      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <div className="card border-danger h-100">
            <div className="card-body">
              <h6 className="card-title text-danger">🔴 ด่วนมาก (รออนุมัติ)</h6>
              <h3 className="mb-0">{urgencyStats.high}</h3>
              <small className="text-muted">รายการที่ต้องดำเนินการทันที</small>
            </div>
          </div>
        </div>

        <div className="col-md-4 mb-3">
          <div className="card border-warning h-100">
            <div className="card-body">
              <h6 className="card-title text-warning">🟡 ด่วน (รออนุมัติ)</h6>
              <h3 className="mb-0">{urgencyStats.medium}</h3>
              <small className="text-muted">รายการที่ควรดำเนินการเร็ว</small>
            </div>
          </div>
        </div>

        <div className="col-md-4 mb-3">
          <div className="card border-info h-100">
            <div className="card-body">
              <h6 className="card-title text-info">🔵 ปกติ (รออนุมัติ)</h6>
              <h3 className="mb-0">{urgencyStats.low}</h3>
              <small className="text-muted">รายการทั่วไป</small>
            </div>
          </div>
        </div>
      </div>

      {/* 🔍 Filters */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label fw-bold">สถานะ</label>
              <select
                className="form-select"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
              >
                <option value="All">ทั้งหมด</option>
                <option value="Pending">รออนุมัติ</option>
                <option value="Approved">อนุมัติแล้ว</option>
                <option value="Shipped">กำลังจัดส่ง</option>
                <option value="Received">ได้รับแล้ว</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label fw-bold">ประเภท</label>
              <select
                className="form-select"
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
              >
                <option value="All">ทั้งหมด</option>
                <option value="Medical">💊 Medical (ยา)</option>
                <option value="Food">🍚 Food (อาหาร)</option>
                <option value="Supplies">📦 Supplies (ของใช้)</option>
                <option value="Others">📌 Others (อื่นๆ)</option>
              </select>
            </div>

            <div className="col-md-4">
              <label className="form-label fw-bold">ความเร่งด่วน</label>
              <select
                className="form-select"
                value={filterUrgency}
                onChange={e => setFilterUrgency(e.target.value)}
              >
                <option value="All">ทั้งหมด</option>
                <option value="high">🔴 ด่วนมาก</option>
                <option value="medium">🟡 ด่วน</option>
                <option value="low">🔵 ปกติ</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 📋 Table Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>📋 รายการคำขอทรัพยากร</h3>
        <span className="badge bg-primary fs-6">
          แสดง {filteredRequests.length} / {allRequests.length} รายการ
        </span>
      </div>

      {/* 📋 Table */}
      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>ประเภท</th>
              <th>ชื่อสิ่งของ</th>
              <th>จำนวน</th>
              <th>จากศูนย์</th>
              <th>ความด่วน</th>
              <th>สถานะ</th>
              <th>วันที่ขอ</th>
              <th className="text-center">การดำเนินการ</th>
            </tr>
          </thead>

          <tbody>
            {filteredRequests.length > 0 ? (
              filteredRequests.map(req => (
                <tr key={req._id}>
                  <td>
                    <span className="fs-5">{getCategoryIcon(req.category)}</span>
                    {' '}
                    <small className="text-muted">{req.category}</small>
                  </td>
                  <td className="fw-bold">{req.itemName}</td>
                  <td>
                    <span className="badge bg-light text-dark">
                      {req.amount} {req.unit}
                    </span>
                  </td>
                  <td>
                    <small className="text-muted">{req.shelterName}</small>
                  </td>
                  <td>{getUrgencyBadge(req.urgency)}</td>
                  <td>
                    <span
                      className={`badge ${
                        req.status === 'Pending'
                          ? 'bg-warning text-dark'
                          : req.status === 'Approved'
                          ? 'bg-success'
                          : req.status === 'Shipped'
                          ? 'bg-primary'
                          : 'bg-secondary'
                      }`}
                    >
                      {req.status === 'Pending' ? '⏳ รออนุมัติ' :
                       req.status === 'Approved' ? '✅ อนุมัติ' :
                       req.status === 'Shipped' ? '🚚 จัดส่ง' :
                       '📥 ได้รับ'}
                    </span>
                  </td>
                  <td>
                    <small className="text-muted">
                      {new Date(req.requestedAt).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </small>
                  </td>
                  <td className="text-center">
                    {req.status === 'Pending' && (
                      <button
                        className="btn btn-success btn-sm"
                        disabled={loadingId === req._id}
                        onClick={() =>
                          approveRequest(req.shelterId!, req._id)
                        }
                      >
                        {loadingId === req._id
                          ? 'กำลังดำเนินการ...'
                          : '✅ อนุมัติ'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center text-secondary py-4">
                  <div className="py-3">
                    <h5>ไม่พบรายการที่ค้นหา</h5>
                    <small className="text-muted">
                      ลองเปลี่ยน Filter เพื่อดูรายการอื่น
                    </small>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}