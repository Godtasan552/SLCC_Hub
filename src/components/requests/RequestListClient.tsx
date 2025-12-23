'use client';

import { useState } from 'react';
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

  const handleReceive = async (shelterId: string, resourceId: string) => {
    if (!confirm('ยืนยันว่าได้รับทรัพยากรชิ้นนี้แล้ว?')) return;
    
    setLoadingId(resourceId);
    try {
      // Current system uses /api/shelters/[id]/resources/[resId] for receipt
      const res = await axios.patch(`/api/shelters/${shelterId}/resources/${resourceId}`, {
        status: 'Received'
      });
      
      if (res.data.success) {
        alert('ยืนยันการรับของเรียบร้อย');
        router.refresh(); // Refresh server data
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
      case 'Pending': return <span className="badge rounded-pill border border-warning text-warning">รอดำเนินการ</span>;
      case 'Approved': return <span className="badge rounded-pill bg-success text-white">อนุมัติแล้ว</span>;
      case 'Received': return <span className="badge rounded-pill bg-info text-white">ได้รับแล้ว</span>;
      case 'Rejected': return <span className="badge rounded-pill bg-danger text-white">ปฏิเสธแล้ว</span>;
      default: return <span className="badge rounded-pill bg-secondary">{status}</span>;
    }
  };

  return (
    <div className="table-responsive rounded border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
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
          {initialRequests.length > 0 ? (
            initialRequests.map((req) => (
              <tr key={req._id} style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)' }}>
                <td className="ps-4 fw-bold">{req.shelterName}</td>
                <td>
                  <div className="fw-bold">{req.itemName}</div>
                  <small style={{ color: 'var(--text-secondary)' }}>{req.category}</small>
                </td>
                <td>{req.amount} {req.unit}</td>
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
              <td colSpan={7} className="text-center py-5" style={{ color: 'var(--text-secondary)' }}>ไม่พบรายการร้องขอในขณะนี้</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
