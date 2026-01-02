import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ShelterModel from '@/models/Shelter';
import ShelterLog from '@/models/ShelterLog';
import HubModel from '@/models/Hub';
import Supply from '@/models/Supply';
import { ResourceRequest } from '@/types/shelter';
import { calculateCurrentOccupancy } from '@/utils/shelter-utils';

interface DashboardResource extends ResourceRequest {
  shelterName: string;
  isHub: boolean;
}

interface LeanShelter {
  _id: string;
  name: string;
  capacity?: number;
  resources?: ResourceRequest[];
}

interface LeanHub {
  name: string;
  resources?: ResourceRequest[];
}

export const dynamic = 'force-dynamic';

export async function GET() {
  await dbConnect();

  try {
    const totalShelters = await ShelterModel.countDocuments({});

    // ✅ คำนวณ currentOccupancy และ capacityStatus จาก ShelterLog
    const allShelters = await ShelterModel.find({}).lean() as LeanShelter[];
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

    const [hubData] = await Promise.all([
      HubModel.find({}).select('name resources').lean() as Promise<LeanHub[]>
    ]);
    
    // Inject names and flatten resources
    const allResources: DashboardResource[] = [];
    
    sheltersWithOccupancy.forEach((s) => {
      if (s.resources && s.resources.length > 0) {
        s.resources.forEach((r: ResourceRequest) => {
           allResources.push({ ...r, shelterName: s.name, isHub: false });
        });
      }
    });

    hubData.forEach((h: LeanHub) => {
      if (h.resources && h.resources.length > 0) {
        h.resources.forEach((r: ResourceRequest) => {
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
    
    // Fetch critical shelters list
    const criticalList = sheltersWithOccupancy.filter(s => s.capacityStatus === 'ล้นศูนย์');

    // ✅ Trend & Movement Calculation จาก ShelterLog
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

    // Get 5 most recent requests for activity feed
    const recentRequests = allResources
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
      .slice(0, 5);

    const stats = {
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
      recentRequests,
      trendData: trendData.reverse(),
      movementData: movementData.reverse()
    };

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Fetch dashboard stats failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
