import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
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
}

export default async function RequestsSummaryPage() {
  await dbConnect();

  /**
   * ดึงเฉพาะ resource ที่มี status = Pending
   * เพื่อให้ตรงกับหน้าสรุปคำร้องที่รอการอนุมัติ
   */
  const sheltersRaw = await Shelter.find(
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
  ).lean();

  // serialize สำหรับส่งเข้า Client Component
  const shelters = JSON.parse(JSON.stringify(sheltersRaw)) as ShelterSummary[];

  return (
    <div className="container py-4">
      <h4 className="mb-3">สรุปรายการคำร้องขอทรัพยากร (รอการอนุมัติ)</h4>
      <SummaryResources allShelters={shelters} />
    </div>
  );
}

