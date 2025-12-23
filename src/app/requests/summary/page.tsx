import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
import Hub from '@/models/Hub';
import SummaryResources from '@/components/SummaryResources';

export const dynamic = 'force-dynamic';

interface Resource {
  _id: string;
  category: string;
  itemName: string;
  amount: number;
  unit: string;
  urgency: 'low' | 'medium' | 'high';
  status: 'Pending' | 'Approved' | 'Shipped' | 'Received';
  requestedAt: Date | string;
}

interface ShelterSummary {
  _id: string;
  name: string;
  resources: Resource[];
  isHub?: boolean;
}

export default async function RequestsSummaryPage() {
  await dbConnect();

  const [sheltersRaw, hubsRaw] = await Promise.all([
    Shelter.find(
      { 'resources.status': 'Pending' },
      {
        name: 1,
        resources: {
          $filter: {
            input: '$resources',
            as: 'res',
            cond: { $eq: ['$$res.status', 'Pending'] }
          }
        }
      }
    ).lean(),
    Hub.find(
      { 'resources.status': 'Pending' },
      {
        name: 1,
        resources: {
          $filter: {
            input: '$resources',
            as: 'res',
            cond: { $eq: ['$$res.status', 'Pending'] }
          }
        }
      }
    ).lean()
  ]);

  // Combine and serialize
  const merged = [
    ...(sheltersRaw as unknown as ShelterSummary[]).map(s => ({ ...s, isHub: false })),
    ...(hubsRaw as unknown as ShelterSummary[]).map(h => ({ ...h, isHub: true }))
  ];

  const shelters = JSON.parse(JSON.stringify(merged)) as ShelterSummary[];

  return (
    <div className="container py-4">
      <h4 className="mb-3">สรุปรายการคำร้องขอทรัพยากร (รอการอนุมัติ)</h4>
      <SummaryResources allShelters={shelters} />
    </div>
  );
}

