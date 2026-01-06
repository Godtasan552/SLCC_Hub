'use client';

interface RecentRequest {
  _id: string;
  category: string;
  itemName: string;
  amount: number;
  unit: string;
  urgency: 'low' | 'medium' | 'high';
  status: string;
  requestedAt: string;
  shelterName?: string;
  isHub?: boolean;
}

interface RecentRequestsProps {
  requests: RecentRequest[];
}

export default function RecentRequests({ requests }: RecentRequestsProps) {
  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'high': return <span className="badge bg-danger">ด่วนมาก</span>;
      case 'medium': return <span className="badge bg-warning text-dark">ด่วน</span>;
      case 'low': return <span className="badge bg-info text-dark">ปกติ</span>;
      default: return <span className="badge bg-secondary">{urgency}</span>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <i className="bi bi-clock-history text-warning"></i>;
      case 'Approved': return <i className="bi bi-check-circle-fill text-success"></i>;
      case 'Received': return <i className="bi bi-box-seam-fill text-info"></i>;
      case 'Rejected': return <i className="bi bi-x-circle-fill text-danger"></i>;
      default: return <i className="bi bi-circle text-secondary"></i>;
    }
  };

  return (
    <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px' }}>
      <div className="card-header bg-transparent border-0 pt-4 pb-2 px-4">
        <h5 className="mb-0 fw-bold" style={{ color: 'var(--text-primary)' }}>
          รายการคำร้องขอล่าสุด
        </h5>
      </div>

      <div className="card-body px-4 pt-2">
        {requests.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-inbox text-secondary" style={{ fontSize: '2rem', opacity: 0.3 }}></i>
            <p className="text-secondary mt-2 small">ยังไม่มีรายการคำร้องขอ</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {requests.map((req) => (
              <div key={req._id} className="d-flex align-items-center justify-content-between p-2 rounded-3 hover-bg-secondary transition-all">
                <div className="d-flex align-items-center gap-3">
                  <div className="fs-4" style={{ filter: 'grayscale(0.5)' }}>
                    {req.category === 'Medical' || req.category === 'ยา และเวชภัณฑ์' ? '💊' : 
                     req.category === 'Food' || req.category === 'อาหารและน้ำดื่ม' ? '🍚' : '📦'}
                  </div>
                  <div>
                    <div className="fw-bold small text-truncate" style={{ maxWidth: '180px', color: 'var(--text-primary)' }}>
                      {req.itemName} x {req.amount} {req.unit}
                    </div>
                    <div className="text-secondary x-small d-flex align-items-center gap-1">
                      {getStatusIcon(req.status)} {req.status === 'Pending' ? 'รออนุมัติ' : req.status === 'Approved' ? 'อนุมัติแล้ว' : req.status === 'Received' ? 'ได้รับแล้ว' : 'ปฏิเสธ'} 
                      <span> • </span> 
                      {req.shelterName || 'ไม่ทราบศูนย์'}
                    </div>
                  </div>
                </div>
                <div>
                  {getUrgencyBadge(req.urgency)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .hover-bg-secondary:hover {
          background-color: var(--bg-secondary);
        }
        .transition-all {
          transition: all 0.2s ease;
        }
        .x-small {
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}
