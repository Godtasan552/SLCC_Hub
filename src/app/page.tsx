import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
import Link from 'next/link';
import SearchBar from '@/components/SearchBar';

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
  const statusParam = searchParams?.status as string;
  const districtParam = searchParams?.district as string;
  const qParam = searchParams?.q as string;

  const page = typeof pageParam === 'string' ? parseInt(pageParam) : 1;
  const limit = 30;
  const skip = (page - 1) * limit;

  // Build Filter Query
  const query: Record<string, unknown> = {};
  if (statusParam && statusParam !== 'ทั้งหมด') {
    query.capacityStatus = statusParam;
  }
  if (districtParam && districtParam !== 'ทั้งหมด') {
    query.district = districtParam;
  }
  if (qParam && qParam !== '') {
    query.$or = [
      { name: { $regex: qParam, $options: 'i' } },
      { subdistrict: { $regex: qParam, $options: 'i' } }
    ];
  }

  const totalShelters = await Shelter.countDocuments(query);
  const totalPages = Math.ceil(totalShelters / limit) || 1;

  // Fetch shelters for current page
  const shelters = (await Shelter.find(query)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()) as unknown as ShelterDoc[];

  // Fetch unique districts for filter
  const districts = (await Shelter.distinct('district')).filter(Boolean);

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
    } catch {
      return '-';
    }
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return null;
    const phonePart = phone.split('/')[0].trim();
    if (/^0+$/.test(phonePart.replace(/[- ]/g, ''))) return null;
    return phonePart;
  };

  return (
    <div className="container-fluid min-vh-100 py-4" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="container">
        {/* Search Bar */}
        <div className="mb-4">
          <SearchBar districts={districts} />
        </div>

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
                <th style={{ width: '40%' }}>ชื่อศูนย์ / สถานที่</th>
                <th className="d-none d-md-table-cell" style={{ width: '15%' }}>ตำบล / อำเภอ</th>
                <th className="d-none d-sm-table-cell" style={{ width: '15%' }}>เบอร์โทรติดต่อ</th>
                <th style={{ width: '15%' }}>ความจุ</th>
                <th style={{ width: '15%' }}>สถานะ</th>
                <th className="d-none d-lg-table-cell" style={{ width: '15%' }}>วันที่สร้าง</th>
              </tr>
            </thead>
            <tbody>
              {shelters.map((shelter) => (
                <tr key={String(shelter._id)}>
                  <td>
                    <div className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>{shelter.name}</div>
                    <div className="small text-secondary">
                      <i className="bi bi-geo-alt-fill me-1 text-danger"></i>
                      {shelter.district} {shelter.subdistrict ? `(${shelter.subdistrict})` : ''}
                    </div>
                    <div className="d-sm-none small mt-1">
                      {shelter.phoneNumbers?.map((phone, idx, arr) => {
                        const formatted = formatPhoneNumber(phone);
                        if (!formatted) return null;
                        const isLast = idx === arr.length - 1;
                        return (
                          <div key={idx} className={`text-primary ${!isLast ? 'border-bottom border-secondary border-opacity-10 pb-1 mb-1' : ''}`}>
                            <i className="bi bi-telephone-fill me-1"></i>{formatted}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="d-none d-md-table-cell">
                    <div style={{ color: 'var(--text-primary)' }}>{shelter.subdistrict || '-'}</div>
                    <div className="small text-secondary">{shelter.district}</div>
                  </td>
                  <td className="d-none d-sm-table-cell" style={{ color: 'var(--text-primary)' }}>
                    {shelter.phoneNumbers && shelter.phoneNumbers.length > 0 ? (
                      <div className="d-flex flex-column">
                        {shelter.phoneNumbers.map((phone, idx, arr) => {
                          const formatted = formatPhoneNumber(phone);
                          if (!formatted) return null;
                          const isLast = idx === arr.length - 1;
                          return (
                            <div key={idx} className={`text-nowrap small py-1 ${!isLast ? 'border-bottom border-secondary border-opacity-10' : ''}`}>
                              {formatted}
                            </div>
                          );
                        })}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="fw-bold" style={{ color: 'var(--text-primary)', opacity: 0.85 }}>
                    {shelter.currentOccupancy || 0} / {shelter.capacity}
                  </td>
                  <td>
                    {getStatusBadge(shelter.capacityStatus)}
                  </td>
                  <td className="d-none d-lg-table-cell text-secondary">
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
          <ul className="pagination justify-content-center">
            {/* First Page */}
            <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
              <Link className="page-link bg-secondary text-theme border-theme" href="/?page=1" aria-label="First">
                <span aria-hidden="true">&laquo;</span>
              </Link>
            </li>

            {/* Previous Page */}
            <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
              <Link className="page-link bg-secondary text-theme border-theme" href={`/?page=${page - 1}`} aria-label="Previous">
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
                      <span className="page-link bg-secondary text-secondary border-theme">...</span>
                    </li>
                  );
                }
                const isActive = item === page;
                return (
                  <li key={item} className={`page-item ${isActive ? 'active' : ''}`}>
                    <Link 
                      className={`page-link border-theme ${isActive ? 'btn-primary text-white border-primary' : 'bg-secondary text-theme'}`} 
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
               <Link className="page-link bg-secondary text-theme border-theme" href={`/?page=${page + 1}`} aria-label="Next">
                 <span aria-hidden="true">&rsaquo;</span>
               </Link>
            </li>

             {/* Last Page */}
            <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
               <Link className="page-link bg-secondary text-theme border-theme" href={`/?page=${totalPages}`} aria-label="Last">
                 <span aria-hidden="true">&raquo;</span>
               </Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}