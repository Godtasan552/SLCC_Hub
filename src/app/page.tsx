import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
import Supply from '@/models/Supply';
import StatsGrid from '@/components/dashboard/StatsGrid';
import CapacityOverview from '@/components/dashboard/CapacityOverview';
import CriticalShelters from '@/components/dashboard/CriticalShelters';
import OccupancyTrends from '@/components/dashboard/OccupancyTrends';
import { Stats, Shelter as ShelterType, DailyLog } from '@/types/shelter';

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
  dailyLogs?: DailyLog[];
}

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  await dbConnect();

  // --- Dashboard Data Fetching ---
  const totalShelters = await Shelter.countDocuments({});
  const criticalSheltersCount = await Shelter.countDocuments({ capacityStatus: 'ล้นศูนย์' });
  const warningSheltersCount = await Shelter.countDocuments({ capacityStatus: 'ใกล้เต็ม' });

  // Aggregate Capacity & Occupancy & Resource Requests
  const shelterStats = await Shelter.aggregate([
    {
      $group: {
        _id: null,
        totalCapacity: { $sum: '$capacity' },
        totalOccupancy: { $sum: '$currentOccupancy' },
        totalResourceRequests: { $sum: { $size: { $ifNull: ['$resources', []] } } }
      }
    }
  ]);
  const { totalCapacity, totalOccupancy, totalResourceRequests } = shelterStats[0] || { totalCapacity: 0, totalOccupancy: 0, totalResourceRequests: 0 };

  // Supply Stats
  const totalSupplies = await Supply.countDocuments({});
  const outOfStockSupplies = await Supply.countDocuments({ quantity: 0 });
  const lowStockSupplies = await Supply.countDocuments({ quantity: { $gt: 0, $lt: 20 } });
  
  const stats: Stats = {
    totalShelters,
    totalCapacity,
    totalOccupancy,
    criticalShelters: criticalSheltersCount,
    warningShelters: warningSheltersCount,
    totalResourceRequests,
    totalSupplies,
    lowStockSupplies,
    outOfStockSupplies
  };

  // Fetch Critical Shelters List
  // Use JSON.parse(JSON.stringify()) to ensure all ObjectIds and Dates are converted to strings
  const criticalList = JSON.parse(JSON.stringify(
    await Shelter.find({ capacityStatus: 'ล้นศูนย์' }).lean()
  ));

  // --- Growth Trend Calculation ---
  // Fetch all shelters with dailyLogs to compute global trend
  const allSheltersForTrend = await Shelter.find({}, 'currentOccupancy dailyLogs').lean() as unknown as ShelterDoc[];
  
  const daysToTrack = 90; // Increased to support 90 days filter
  const trendData = [];
  
  // Calculate today's date properly in Timezone (or just simple date string matching)
  const now = new Date();
  
  // Create a map of Date -> NetMovement (CheckIn - CheckOut)
  const dailyNetMovement: Record<string, number> = {};
  
  allSheltersForTrend.forEach(s => {
    if (s.dailyLogs) {
      s.dailyLogs.forEach(log => {
        if (!dailyNetMovement[log.date]) dailyNetMovement[log.date] = 0;
        dailyNetMovement[log.date] += (log.checkIn || 0) - (log.checkOut || 0);
      });
    }
  });

  // Backward calculation
  let currentGlobalOccupancy = totalOccupancy;
  
  // Loop for last 90 days (Today -> Past)
  for (let i = 0; i < daysToTrack; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0]; // "YYYY-MM-DD"

    trendData.push({
      date: dateStr,
      occupancy: currentGlobalOccupancy < 0 ? 0 : currentGlobalOccupancy // Prevent negative artifacts
    });

    // Prepare for previous day: Subtract the movement of this day
    const movement = dailyNetMovement[dateStr] || 0;
    currentGlobalOccupancy = currentGlobalOccupancy - movement;
  }
  
  // Reverse to show Past -> Today
  trendData.reverse();

  return (
    <div className="container-fluid min-vh-100 py-4" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="container">
        
        {/* Dashboard Section */}
        <section className="mb-5">
           <div className="d-flex align-items-center justify-content-between mb-4">
              <div>
                <h2 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>แดชบอร์ดภาพรวม</h2>
                <p className="text-secondary mb-0">ติดตามสถานะศูนย์พักพิงและทรัพยากรแบบเรียลไทม์</p>
              </div>
              <div className="text-end text-secondary small">
                ข้อมูลล่าสุด: {new Date().toLocaleTimeString('th-TH')}
              </div>
           </div>

           <StatsGrid stats={stats} />

           <div className="row g-4 mb-4">
              <div className="col-12 col-lg-8">
                <CapacityOverview stats={stats} />
              </div>
              <div className="col-12 col-lg-4">
                <CriticalShelters shelters={criticalList as unknown as ShelterType[]} />
              </div>
           </div>

           {/* Growth Graph */}
           <div className="mb-4">
              <OccupancyTrends data={trendData} />
           </div>
        </section>

      </div>
    </div>
  );
}