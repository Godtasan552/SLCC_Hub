import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
import Hub from '@/models/Hub';
import Supply from '@/models/Supply';
import DashboardDisplay from '@/components/dashboard/DashboardDisplay';
import { Shelter as ShelterType, DailyLog, ResourceRequest } from '@/types/shelter';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await dbConnect();

  // --- Initial Data Fetching (SSR) ---
  const totalShelters = await Shelter.countDocuments({});
  const criticalSheltersCount = await Shelter.countDocuments({ capacityStatus: 'ล้นศูนย์' });
  const warningSheltersCount = await Shelter.countDocuments({ capacityStatus: 'ใกล้เต็ม' });

  const [shelterStats, hubStats] = await Promise.all([
    Shelter.aggregate([
      {
        $group: {
          _id: null,
          totalCapacity: { $sum: '$capacity' },
          totalOccupancy: { $sum: '$currentOccupancy' },
          resources: { $push: '$resources' }
        }
      }
    ]),
    Hub.aggregate([
      {
        $group: {
          _id: null,
          resources: { $push: '$resources' }
        }
      }
    ])
  ]);
  
  const sStats = shelterStats[0] || { totalCapacity: 0, totalOccupancy: 0, resources: [] };
  const hStats = hubStats[0] || { resources: [] };

  const totalCapacity = sStats.totalCapacity;
  const totalOccupancy = sStats.totalOccupancy;

  // Flatten all resources
  const allResources = [...sStats.resources.flat(), ...hStats.resources.flat()] as ResourceRequest[];
  const totalResourceRequests = allResources.length;

  // Status counts
  const requestStats = {
    pending: allResources.filter(r => r.status === 'Pending').length,
    approved: allResources.filter(r => r.status === 'Approved').length,
    shipped: allResources.filter(r => r.status === 'Shipped').length,
    received: allResources.filter(r => r.status === 'Received').length,
    rejected: allResources.filter(r => r.status === 'Rejected').length
  };

  const totalSupplies = await Supply.countDocuments({});
  const outOfStockSupplies = await Supply.countDocuments({ quantity: 0 });
  const lowStockSupplies = await Supply.countDocuments({ quantity: { $gt: 0, $lt: 20 } });
  
  const criticalList = JSON.parse(JSON.stringify(
    await Shelter.find({ capacityStatus: 'ล้นศูนย์' }).lean()
  ));

  // Trend & Movement calculation for initial load
  const allSheltersRaw = await Shelter.find({}, 'currentOccupancy dailyLogs').lean();
  const allSheltersForTrend = allSheltersRaw as unknown as ShelterType[];
  
  const daysToTrack = 90;
  const trendData = [];
  const movementData = [];
  const now = new Date();
  const dailyStats: Record<string, { net: number, checkIn: number, checkOut: number }> = {};
  
  allSheltersForTrend.forEach((s) => {
    if (s.dailyLogs) {
      s.dailyLogs.forEach((log: DailyLog) => {
        if (!dailyStats[log.date]) dailyStats[log.date] = { net: 0, checkIn: 0, checkOut: 0 };
        dailyStats[log.date].net += (log.checkIn || 0) - (log.checkOut || 0);
        dailyStats[log.date].checkIn += (log.checkIn || 0);
        dailyStats[log.date].checkOut += (log.checkOut || 0);
      });
    }
  });

  let currentGlobalOccupancy = totalOccupancy;
  for (let i = 0; i < daysToTrack; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const statsForDay = dailyStats[dateStr] || { net: 0, checkIn: 0, checkOut: 0 };
    trendData.push({ date: dateStr, occupancy: Math.max(0, currentGlobalOccupancy) });
    movementData.push({ date: dateStr, checkIn: statsForDay.checkIn, checkOut: statsForDay.checkOut });
    currentGlobalOccupancy -= statsForDay.net;
  }

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
