import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
import Hub from '@/models/Hub';
import RequestListClient from '@/components/requests/RequestListClient';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

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
  isHub?: boolean;
}

export default async function RequestsPage() {
  await dbConnect();

  const [sheltersRaw, hubsRaw] = await Promise.all([
    Shelter.find({ 'resources.0': { $exists: true } }).select('name resources').lean(),
    Hub.find({ 'resources.0': { $exists: true } }).select('name resources').lean()
  ]);

  // Combine and sort
  const allRequests = [
    ...(sheltersRaw as unknown as ShelterWithResources[]).flatMap(s => 
      s.resources.map(r => ({ ...r, shelterName: s.name, shelterId: s._id, isHub: false }))
    ),
    ...(hubsRaw as unknown as ShelterWithResources[]).flatMap(h => 
      h.resources.map(r => ({ ...r, shelterName: h.name, shelterId: h._id, isHub: true }))
    )
  ].sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

  // Serialize for client component
  const serializedRequests = JSON.parse(JSON.stringify(allRequests));

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0" style={{ color: 'var(--text-primary)' }}>รายการร้องขอทรัพยากรทั้งหมด</h2>
        <Link href="/requests/create" className="btn btn-warning fw-bold shadow-sm">
          <i className="bi bi-plus-circle me-2"></i>สร้างคำร้องขอ
        </Link>
      </div>
      
      <RequestListClient initialRequests={serializedRequests} />
    </div>
  );
}
