import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';

interface Resource {
  _id: string;
  category: string;
  itemName: string;
  amount: number;
  unit: string;
  urgency: 'low' | 'medium' | 'high';
  status: string;
  requestedAt: Date;
}

interface ShelterWithResources {
  _id: string;
  name: string;
  resources: Resource[];
}

export const dynamic = 'force-dynamic';

export default async function RequestsPage() {
  await dbConnect();

  const sheltersWithRequests = await Shelter.find({
    'resources.0': { $exists: true }
  }).select('name resources').lean() as unknown as ShelterWithResources[];

  // Flatten all resources with their shelter name
  const allRequests = sheltersWithRequests.flatMap(shelter => 
    shelter.resources.map(res => ({
      ...res,
      shelterName: shelter.name,
      shelterId: shelter._id
    }))
  ).sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

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
      case 'Approved': return <span className="badge rounded-pill bg-primary">อนุมัติแล้ว</span>;
      case 'Shipped': return <span className="badge rounded-pill bg-info">กำลังขนส่ง</span>;
      case 'Received': return <span className="badge rounded-pill bg-success">ได้รับแล้ว</span>;
      default: return <span className="badge rounded-pill bg-secondary">{status}</span>;
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4" style={{ color: 'var(--text-primary)' }}>รายการร้องขอทรัพยากรทั้งหมด</h2>
      
      <div className="table-responsive rounded border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <table className="table table-hover align-middle mb-0">
          <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <tr style={{ color: 'var(--text-secondary)' }}>
              <th>ศูนย์พักพิง</th>
              <th>รายการ</th>
              <th>จำนวน</th>
              <th>ความด่วน</th>
              <th>สถานะ</th>
              <th>วันที่ขอ</th>
            </tr>
          </thead>
          <tbody>
            {allRequests.length > 0 ? (
              allRequests.map((req) => (
                <tr key={String(req._id)} style={{ color: 'var(--text-primary)' }}>
                  <td className="fw-bold">{req.shelterName}</td>
                  <td>
                    <div className="fw-bold">{req.itemName}</div>
                    <small className="text-secondary">{req.category}</small>
                  </td>
                  <td>{req.amount} {req.unit}</td>
                  <td>{getUrgencyBadge(req.urgency)}</td>
                  <td>{getStatusBadge(req.status)}</td>
                  <td>
                    {new Intl.DateTimeFormat('th-TH', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }).format(new Date(req.requestedAt))}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-5 text-secondary">ไม่พบรายการร้องขอในขณะนี้</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
