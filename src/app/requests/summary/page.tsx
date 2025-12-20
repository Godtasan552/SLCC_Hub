import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
import SummaryResources from '@/components/SummaryResources';

export const dynamic = 'force-dynamic';

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

export default async function RequestsSummaryPage() {
  await dbConnect();

  // Fetch all shelters with their resources
  const shelters = (await Shelter.find({
    'resources.0': { $exists: true }
  }).select('name resources').lean()) as unknown as Shelter[];

  return (
    <div className="container py-4">
      <SummaryResources allShelters={shelters} />
    </div>
  );
}
