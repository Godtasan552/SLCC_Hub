'use client';

interface Resource {
  _id?: string;
  category: string;
  itemName: string;
  amount: number;
  unit: string;
  urgency: 'low' | 'medium' | 'high';
  status: string;
  requestedAt: Date | string;
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
  // รวมข้อมูลคำขอจากทุกศูนย์ที่ยังเป็นสถานะ 'Pending'
  const allRequests = allShelters.flatMap(s => 
    (s.resources || [])
      .filter(r => r.status === 'Pending')
      .map(r => ({ ...r, shelterName: s.name }))
  ).sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'high': return <span className="badge bg-danger">ด่วนมาก</span>;
      case 'medium': return <span className="badge bg-warning text-dark">ด่วน</span>;
      case 'low': return <span className="badge bg-info text-dark">ปกติ</span>;
      default: return <span className="badge bg-secondary">{urgency}</span>;
    }
  };

  return (
    <div className="mt-5 p-4 rounded border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
      <h3 className="mb-4" style={{ color: 'var(--text-primary)' }}>📋 รายการที่รอการจัดส่ง (ภาพรวมทั้งจังหวัด)</h3>
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <tr style={{ color: 'var(--text-secondary)' }}>
              <th>ประเภท</th>
              <th>ชื่อสิ่งของ</th>
              <th>จำนวน</th>
              <th>จากศูนย์</th>
              <th>ความด่วน</th>
            </tr>
          </thead>
          <tbody>
            {allRequests.length > 0 ? (
              allRequests.map((req, index) => (
                <tr key={index} style={{ color: 'var(--text-primary)' }}>
                  <td>
                    <span className="badge bg-secondary opacity-75">{req.category}</span>
                  </td>
                  <td className="fw-bold">{req.itemName}</td>
                  <td>{req.amount} {req.unit}</td>
                  <td>{req.shelterName}</td>
                  <td>{getUrgencyBadge(req.urgency)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-5 text-secondary">
                  ไม่มีรายการที่รอการจัดส่งในขณะนี้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
