import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
import ShelterLog from '@/models/ShelterLog';
import Hub from '@/models/Hub';
import Supply from '@/models/Supply';
import DashboardDisplay from '@/components/dashboard/DashboardDisplay';
import { Shelter as ShelterType, ResourceRequest } from '@/types/shelter';
import { calculateCurrentOccupancy } from '@/utils/shelter-utils';

interface DashboardResource extends ResourceRequest {
  shelterName: string;
  isHub: boolean;
}

interface HubData {
  name: string;
  resources?: ResourceRequest[];
}

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await dbConnect();

  // --- Initial Data Fetching (SSR) ---
  const totalShelters = await Shelter.countDocuments({});
  
  // ✅ คำนวณ currentOccupancy และ capacityStatus จาก ShelterLog
  const allShelters = await Shelter.find({}).lean();
  let totalCapacity = 0;
  let totalOccupancy = 0;
  let criticalSheltersCount = 0;
  let warningSheltersCount = 0;
  
  const sheltersWithOccupancy = await Promise.all(
    allShelters.map(async (shelter) => {
      const currentOccupancy = await calculateCurrentOccupancy(shelter._id);
      totalOccupancy += currentOccupancy;
      totalCapacity += shelter.capacity || 0;
      
      const ratio = (currentOccupancy / (shelter.capacity || 1)) * 100;
      if (ratio >= 100) criticalSheltersCount++;
      else if (ratio >= 80) warningSheltersCount++;
      
      return {
        ...shelter,
        currentOccupancy,
        capacityStatus: ratio >= 100 ? 'ล้นศูนย์' : ratio >= 80 ? 'ใกล้เต็ม' : 'รองรับได้'
      };
    })
  );

  const allResources: DashboardResource[] = [];
  
  const [shelterData, hubData] = await Promise.all([
    Shelter.find({}).select('name resources capacity').lean() as Promise<ShelterType[]>,
    Hub.find({}).select('name resources').lean() as Promise<HubData[]>
  ]);
  
  shelterData.forEach(s => {
    if (s.resources) {
      s.resources.forEach(r => {
        allResources.push({ ...r, shelterName: s.name, isHub: false });
      });
    }
  });

  hubData.forEach(h => {
    if (h.resources) {
      h.resources.forEach(r => {
        allResources.push({ ...r, shelterName: h.name, isHub: true });
      });
    }
  });

  const totalResourceRequests = allResources.length;

  // Status counts
  const requestStats = {
    pending: allResources.filter(r => r.status === 'Pending').length,
    approved: allResources.filter(r => r.status === 'Approved').length,
    received: allResources.filter(r => r.status === 'Received').length,
    rejected: allResources.filter(r => r.status === 'Rejected').length
  };

  const totalSupplies = await Supply.countDocuments({});
  const outOfStockSupplies = await Supply.countDocuments({ quantity: 0 });
  const lowStockSupplies = await Supply.countDocuments({ quantity: { $gt: 0, $lt: 20 } });
  
  const criticalList = sheltersWithOccupancy.filter(s => s.capacityStatus === 'ล้นศูนย์');

  // ✅ Trend & Movement calculation จาก ShelterLog
  const daysToTrack = 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysToTrack);
  
  const logs = await ShelterLog.find({
    date: { $gte: startDate }
  }).sort({ date: 1 });
  
  const dailyStats: Record<string, { checkIn: number; checkOut: number }> = {};
  
  logs.forEach(log => {
    const dateStr = log.date.toISOString().split('T')[0];
    if (!dailyStats[dateStr]) dailyStats[dateStr] = { checkIn: 0, checkOut: 0 };
    
    if (log.action === 'in') {
      dailyStats[dateStr].checkIn += log.amount;
    } else if (log.action === 'out') {
      dailyStats[dateStr].checkOut += log.amount;
    }
  });

  const trendData = [];
  const movementData = [];
  let currentGlobalOccupancy = totalOccupancy;
  
  for (let i = 0; i < daysToTrack; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const statsForDay = dailyStats[dateStr] || { checkIn: 0, checkOut: 0 };
    const net = statsForDay.checkIn - statsForDay.checkOut;
    
    trendData.push({ date: dateStr, occupancy: Math.max(0, currentGlobalOccupancy) });
    movementData.push({ date: dateStr, checkIn: statsForDay.checkIn, checkOut: statsForDay.checkOut });
    currentGlobalOccupancy -= net;
  }

  const recentRequests = allResources
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
    .slice(0, 5);

  const initialData = {
    totalShelters,
    totalCapacity,
    totalOccupancy,
    criticalShelters: criticalSheltersCount,
    warningShelters: warningSheltersCount,
    totalResourceRequests,
    totalSupplies,
    lowStockSupplies,
    outOfStockSupplies,
    criticalList,
    requestStats,
    recentRequests: JSON.parse(JSON.stringify(recentRequests)),
    trendData: trendData.reverse(),
    movementData: movementData.reverse()
  };

  return (
    <div className="container-fluid min-vh-100 py-4" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="container">
        <DashboardDisplay initialData={initialData} />
      </div>
    </div>
  );
}
