'use client';

import { useState } from 'react';

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

  // รวมคำขอที่ Pending จากทุกศูนย์
  const allRequests = allShelters.flatMap(s =>
    (s.resources || [])
      .filter(r => r.status === 'Pending')
      .map(r => ({
        ...r,
        shelterId: s._id,
        shelterName: s.name
      }))
  ).sort(
    (a, b) =>
      new Date(b.requestedAt).getTime() -
      new Date(a.requestedAt).getTime()
  );

  const approveRequest = async (shelterId: string, resourceId?: string) => {
    if (!resourceId) return;

    setLoadingId(resourceId);

    const res = await fetch('/api/requests/approve', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shelterId, resourceId })
    });

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

  return (
    <div
      className="mt-5 p-4 rounded border"
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      <h3 className="mb-4" style={{ color: 'var(--text-primary)' }}>
        📋 รายการคำขอที่รอการอนุมัติ
      </h3>

      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <tr style={{ color: 'var(--text-secondary)' }}>
              <th>ประเภท</th>
              <th>ชื่อสิ่งของ</th>
              <th>จำนวน</th>
              <th>จากศูนย์</th>
              <th>ความด่วน</th>
              <th className="text-center">การดำเนินการ</th>
            </tr>
          </thead>

          <tbody>
            {allRequests.length > 0 ? (
              allRequests.map((req, index) => (
                <tr key={index} style={{ color: 'var(--text-primary)' }}>
                  <td>
                    <span className="badge bg-secondary opacity-75">
                      {req.category}
                    </span>
                  </td>
                  <td className="fw-bold">{req.itemName}</td>
                  <td>
                    {req.amount} {req.unit}
                  </td>
                  <td>{req.shelterName}</td>
                  <td>{getUrgencyBadge(req.urgency)}</td>
                  <td className="text-center">
                    <button
                      className="btn btn-success btn-sm"
                      disabled={loadingId === req._id}
                      onClick={() =>
                        approveRequest(req.shelterId!, req._id)
                      }
                    >
                      {loadingId === req._id ? 'กำลังดำเนินการ...' : 'อนุมัติ'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-5 text-secondary">
                  ไม่มีรายการที่รอการอนุมัติ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
