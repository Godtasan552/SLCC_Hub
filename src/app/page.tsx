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
  const limit = 20;
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
    <div className="container-fluid bg-dark min-vh-100 text-light py-4">
      <div className="container">
        {/* Header Count */}
        <div className="d-flex align-items-center mb-4 p-3 rounded bg-secondary bg-opacity-10 border border-secondary border-opacity-25">
          <div className="me-auto text-light">
            <span className="me-2 text-secondary">จำนวนศูนย์พักพิงที่พบ:</span>
            <span className="badge bg-primary fs-6 me-3">{totalShelters} รายการ</span>
            <span className="text-secondary">หน้า {page} จาก {totalPages}</span>
          </div>
          <div>
             <Link href="/admin/import" className="btn btn-outline-light btn-sm">Import JSON</Link>
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive rounded border border-secondary border-opacity-25">
          <table className="table table-dark table-hover mb-0 align-middle">
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
                    <div className="fw-bold text-white mb-1">{shelter.name}</div>
                    <div className="text-secondary small">
                      <i className="bi bi-geo-alt-fill me-1 text-danger"></i>
                      {shelter.subdistrict ? `📍 ${shelter.subdistrict}` : '📍 -'}
                    </div>
                  </td>
                  <td>
                    <div className="text-light">{shelter.subdistrict || '-'}</div>
                    <div className="text-secondary small">{shelter.district}</div>
                  </td>
                  <td className="text-light">
                    {shelter.phoneNumbers && shelter.phoneNumbers.length > 0 && !/^0+$/.test(shelter.phoneNumbers[0])
                      ? shelter.phoneNumbers[0] 
                      : null}
                  </td>
                  <td className="text-light fs-5 fw-bold text-opacity-75">
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
        <nav className="mt-4">
          <ul className="pagination justify-content-end pagination-sm custom-pagination">
             <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
              <Link className="page-link bg-dark text-light border-secondary" href={`/?page=${page - 1}`}>
                &lt;
              </Link>
            </li>
            <li className="page-item disabled">
              <span className="page-link bg-dark text-light border-secondary">
                {page} / {totalPages}
              </span>
            </li>
             <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
               <Link className="page-link bg-dark text-light border-secondary" href={`/?page=${page + 1}`}>
                 &gt;
               </Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}