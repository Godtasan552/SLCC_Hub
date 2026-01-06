import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
import ShelterLog from '@/models/ShelterLog';
import Hub from '@/models/Hub';
import Supply from '@/models/Supply';
import DashboardDisplay from '@/components/dashboard/DashboardDisplay';
import { Shelter as ShelterType, ResourceRequest } from '@/types/shelter';
import { getCapacityStatus } from '@/utils/shelter-utils';
import { calculateCurrentOccupancy, getAllShelterOccupancy, getAllShelterMovements, getGlobalDailyStats } from '@/utils/shelter-server-utils';

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
  // We'll replicate the optimized fetching from the API here to keep maintenance easy
  const [totalShelters, occupancyMap, hubs, rawShelters] = await Promise.all([
    Shelter.countDocuments({}),
    getAllShelterOccupancy(),
    Hub.find({}).select('name resources').lean() as Promise<HubData[]>,
    Shelter.find({}).select('name resources capacity').lean() as Promise<ShelterType[]>
  ]);

  let totalCapacity = 0;
  let totalOccupancy = 0;
  let criticalSheltersCount = 0;
  let warningSheltersCount = 0;
  const allResources: DashboardResource[] = [];
  
  // Process Shelters
  const sheltersWithOccupancy = rawShelters.map((shelter) => {
    const currentOccupancy = occupancyMap[shelter._id.toString()] || 0;
    totalOccupancy += currentOccupancy;
    totalCapacity += shelter.capacity || 0;
    
    const status = getCapacityStatus(currentOccupancy, shelter.capacity || 0);
    if (status.text === 'ล้นศูนย์') criticalSheltersCount++;
    else if (status.text === 'ใกล้เต็ม') warningSheltersCount++;
    
    if (shelter.resources) {
      shelter.resources.forEach(r => {
        allResources.push({ ...r, shelterName: shelter.name, isHub: false });
      });
    }

    return {
      ...shelter,
      currentOccupancy,
      capacityStatus: status.text
    };
  });

  // Process Hubs
  hubs.forEach(h => {
    if (h.resources) {
      h.resources.forEach(r => {
        allResources.push({ ...r, shelterName: h.name, isHub: true });
      });
    }
  });

  const [totalSupplies, outOfStockSupplies, lowStockSupplies, globalDailyStats] = await Promise.all([
    Supply.countDocuments({}),
    Supply.countDocuments({ quantity: 0 }),
    Supply.countDocuments({ quantity: { $gt: 0, $lt: 20 } }),
    getGlobalDailyStats(90)
  ]);

  // ✅ Transform globalDailyStats into trend & movement formats
  let runningOccupancy = totalOccupancy;
  const trendData = [];
  const movementData = [];
  const reversedStats = [...globalDailyStats].reverse();
  for (const day of reversedStats) {
    trendData.push({ date: day.date, occupancy: Math.max(0, runningOccupancy) });
    movementData.push({ date: day.date, checkIn: day.checkIn, checkOut: day.checkOut });
    runningOccupancy -= (day.checkIn - day.checkOut);
  }

  const initialData = JSON.parse(JSON.stringify({
    totalShelters,
    totalCapacity,
    totalOccupancy,
    criticalShelters: criticalSheltersCount,
    warningShelters: warningSheltersCount,
    totalResourceRequests: allResources.length,
    totalSupplies,
    lowStockSupplies,
    outOfStockSupplies,
    criticalList: sheltersWithOccupancy.filter(s => s.capacityStatus === 'ล้นศูนย์'),
    requestStats: {
      pending: allResources.filter(r => r.status === 'Pending').length,
      approved: allResources.filter(r => r.status === 'Approved').length,
      received: allResources.filter(r => r.status === 'Received').length,
      rejected: allResources.filter(r => r.status === 'Rejected').length
    },
    recentRequests: allResources
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
      .slice(0, 5),
    trendData: trendData.reverse(),
    movementData: movementData.reverse()
  }));

  return (
    <div className="container-fluid min-vh-100 py-4" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="container">
        <DashboardDisplay initialData={initialData} />
      </div>
    </div>
  );
}
