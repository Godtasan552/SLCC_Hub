import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
import Link from 'next/link';

interface ShelterDoc {
  _id: unknown;
  name: string;
  district: string;
  capacity: number;
  capacityStatus: string;
}

interface Props {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function HomePage({ searchParams }: Props) {
  await dbConnect();
  
  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1;
  const limit = 20; // จำนวนรายการต่อหน้า
  const skip = (page - 1) * limit;

  const totalShelters = await Shelter.countDocuments({});
  const totalPages = Math.ceil(totalShelters / limit);

  // Fetch shelters for current page
  const shelters = (await Shelter.find({})
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()) as unknown as ShelterDoc[];

  const getStatusColor = (status: string) => {
    if (status === 'ล้นศูนย์') return 'bg-danger';
    if (status === 'ใกล้เต็ม') return 'bg-warning text-dark';
    return 'bg-success';
  };

  return (
    <div className="container">
      <div className="row mb-4">
        <div className="col-md-8">
          <h2>สถานะศูนย์พักพิง (ทั้งหมด {totalShelters} แห่ง)</h2>
        </div>
        <div className="col-md-4 text-end">
          <Link href="/admin/import" className="btn btn-outline-primary">Import JSON</Link>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-hover border">
          <thead className="table-light">
            <tr>
              <th>ชื่อศูนย์</th>
              <th>อำเภอ</th>
              <th>ความจุ</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {shelters.map((shelter) => (
              <tr key={String(shelter._id)}>
                <td>{shelter.name}</td>
                <td>{shelter.district}</td>
                <td>{shelter.capacity}</td>
                <td>
                  <span className={`badge ${getStatusColor(shelter.capacityStatus)}`}>
                    {shelter.capacityStatus || 'N/A'}
                  </span>
                </td>
                <td><button className="btn btn-sm btn-info">ดูรายละเอียด</button></td>
              </tr>
            ))}
            {shelters.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center">ไม่พบข้อมูล</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <nav className="mt-4">
        <ul className="pagination justify-content-center">
          <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
            <Link className="page-link" href={`/?page=${page - 1}`}>ก่อนหน้า</Link>
          </li>
          <li className="page-item disabled">
            <span className="page-link">
              หน้า {page} จาก {totalPages}
            </span>
          </li>
          <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
            <Link className="page-link" href={`/?page=${page + 1}`}>ถัดไป</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}