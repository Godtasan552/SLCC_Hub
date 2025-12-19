import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
import Link from 'next/link';

interface ShelterDoc {
  _id: unknown;
  name: string;
  district: string;
  subdistrict?: string;
  capacity: number;
  currentOccupancy?: number;
  phoneNumbers?: string[];
  capacityStatus: string;
  updatedAt: Date;
}

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HomePage(props: Props) {
  await dbConnect();
  
  const searchParams = await props.searchParams;
  const pageParam = searchParams?.page;
  const page = typeof pageParam === 'string' ? parseInt(pageParam) : 1;
  const limit = 50;
  const skip = (page - 1) * limit;

  const totalShelters = await Shelter.countDocuments({});
  const totalPages = Math.ceil(totalShelters / limit);

  // Fetch shelters for current page
  const shelters = (await Shelter.find({})
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()) as unknown as ShelterDoc[];

  const getStatusBadge = (status: string) => {
    if (status === 'ล้นศูนย์') return <span className="badge rounded-pill bg-danger">ล้นศูนย์</span>;
    if (status === 'ใกล้เต็ม') return <span className="badge rounded-pill bg-warning text-dark">ใกล้เต็ม</span>;
    return <span className="badge rounded-pill bg-success">รองรับได้</span>;
  };

  const formatDate = (date: Date) => {
    try {
      return new Intl.DateTimeFormat('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(date));
    } catch (e) {
      return '-';
    }
  };

  return (
    <div className="container-fluid min-vh-100 py-4" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="container">
        {/* Header Count */}
        <div className="d-flex align-items-center mb-4 p-3 rounded border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="me-auto" style={{ color: 'var(--text-primary)' }}>
            <span className="me-2" style={{ color: 'var(--text-secondary)' }}>จำนวนศูนย์พักพิงที่พบ:</span>
            <span className="badge bg-primary fs-6 me-3">{totalShelters} รายการ</span>
            <span style={{ color: 'var(--text-secondary)' }}>หน้า {page} จาก {totalPages}</span>
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive rounded border border-secondary border-opacity-25">
          <table className="table table-hover mb-0 align-middle">
            <thead className="bg-secondary bg-opacity-25">
              <tr className="text-secondary small text-uppercase">
                <th style={{ width: '35%' }}>ชื่อศูนย์ / สถานที่</th>
                <th style={{ width: '15%' }}>ตำบล / อำเภอ</th>
                <th style={{ width: '15%' }}>เบอร์โทรติดต่อ</th>
                <th style={{ width: '10%' }}>ความจุ</th>
                <th style={{ width: '10%' }}>สถานะความจุ</th>
                <th style={{ width: '15%' }}>วันที่สร้าง</th>
              </tr>
            </thead>
            <tbody>
              {shelters.map((shelter) => (
                <tr key={String(shelter._id)}>
                  <td>
                    <div className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>{shelter.name}</div>
                    <div className="small" style={{ color: 'var(--text-secondary)' }}>
                      <i className="bi bi-geo-alt-fill me-1 text-danger"></i>
                      {shelter.subdistrict ? `📍 ${shelter.subdistrict}` : '📍 -'}
                    </div>
                  </td>
                  <td>
                    <div style={{ color: 'var(--text-primary)' }}>{shelter.subdistrict || '-'}</div>
                    <div className="small" style={{ color: 'var(--text-secondary)' }}>{shelter.district}</div>
                  </td>
                  <td style={{ color: 'var(--text-primary)' }}>
                    {shelter.phoneNumbers && shelter.phoneNumbers.length > 0 && !/^0+$/.test(shelter.phoneNumbers[0])
                      ? shelter.phoneNumbers[0] 
                      : null}
                  </td>
                  <td className="fs-5 fw-bold" style={{ color: 'var(--text-primary)', opacity: 0.75 }}>
                    {shelter.currentOccupancy || 0} / {shelter.capacity}
                  </td>
                  <td>
                    {getStatusBadge(shelter.capacityStatus)}
                  </td>
                  <td className="text-secondary">
                    {shelter.updatedAt ? formatDate(shelter.updatedAt) : '-'}
                  </td>
                </tr>
              ))}
              {shelters.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-secondary">
                    ไม่พบข้อมูลศูนย์พักพิง
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {/* Pagination Controls */}
        <nav className="mt-4">
          <ul className="pagination justify-content-center">
            {/* First Page */}
            <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
              <Link className="page-link bg-dark text-light border-secondary" href="/?page=1" aria-label="First">
                <span aria-hidden="true">&laquo;</span>
              </Link>
            </li>

            {/* Previous Page */}
            <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
              <Link className="page-link bg-dark text-light border-secondary" href={`/?page=${page - 1}`} aria-label="Previous">
                <span aria-hidden="true">&lsaquo;</span>
              </Link>
            </li>

            {/* Page Numbers */}
            {(() => {
              const items = [];
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) items.push(i);
              } else {
                items.push(1);
                if (page > 3) items.push('...');
                
                let start = Math.max(2, page - 1);
                let end = Math.min(totalPages - 1, page + 1);
                
                if (page <= 3) { end = 4; }
                if (page >= totalPages - 2) { start = totalPages - 3; }

                for (let i = start; i <= end; i++) items.push(i);
                
                if (page < totalPages - 2) items.push('...');
                items.push(totalPages);
              }

              return items.map((item, index) => {
                if (item === '...') {
                  return (
                    <li key={`ellipsis-${index}`} className="page-item disabled">
                      <span className="page-link bg-dark text-secondary border-secondary">...</span>
                    </li>
                  );
                }
                const isActive = item === page;
                return (
                  <li key={item} className={`page-item ${isActive ? 'active' : ''}`}>
                    <Link 
                      className={`page-link border-secondary ${isActive ? 'bg-primary text-white border-primary' : 'bg-dark text-light'}`} 
                      href={`/?page=${item}`}
                    >
                      {item}
                    </Link>
                  </li>
                );
              });
            })()}

            {/* Next Page */}
            <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
               <Link className="page-link bg-dark text-light border-secondary" href={`/?page=${page + 1}`} aria-label="Next">
                 <span aria-hidden="true">&rsaquo;</span>
               </Link>
            </li>

             {/* Last Page */}
            <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
               <Link className="page-link bg-dark text-light border-secondary" href={`/?page=${totalPages}`} aria-label="Last">
                 <span aria-hidden="true">&raquo;</span>
               </Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}