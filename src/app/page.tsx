import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';

interface ShelterDoc {
  _id: unknown;
  name: string;
  district: string;
  capacity: number;
  capacityStatus: string;
}

export default async function HomePage() {
  await dbConnect();
  // Fetch all shelters, sorted by most recently updated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shelters = (await Shelter.find({}).sort({ updatedAt: -1 }).lean()) as any as ShelterDoc[];

  const getStatusColor = (status: string) => {
    if (status === 'ล้นศูนย์') return 'bg-danger';
    if (status === 'ใกล้เต็ม') return 'bg-warning text-dark';
    return 'bg-success';
  };

  return (
    <div className="container">
      <div className="row mb-4">
        <div className="col-md-8">
          <h2>สถานะศูนย์พักพิง (ทั้งหมด {shelters.length} แห่ง)</h2>
        </div>
        <div className="col-md-4 text-end">
          <button className="btn btn-outline-primary">Import JSON</button>
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
    </div>
  );
}