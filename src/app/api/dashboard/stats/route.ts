import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ShelterModel from '@/models/Shelter';
import Supply from '@/models/Supply';
import { Shelter as ShelterType, DailyLog } from '@/types/shelter';

export const dynamic = 'force-dynamic';

export async function GET() {
  await dbConnect();

  try {
    const totalShelters = await ShelterModel.countDocuments({});
    const criticalSheltersCount = await ShelterModel.countDocuments({ capacityStatus: 'ล้นศูนย์' });
    const warningSheltersCount = await ShelterModel.countDocuments({ capacityStatus: 'ใกล้เต็ม' });

    const shelterStats = await ShelterModel.aggregate([
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

    const totalSupplies = await Supply.countDocuments({});
    const outOfStockSupplies = await Supply.countDocuments({ quantity: 0 });
    const lowStockSupplies = await Supply.countDocuments({ quantity: { $gt: 0, $lt: 20 } });
    
    // Fetch critical shelters list
    const criticalList = await ShelterModel.find({ capacityStatus: 'ล้นศูนย์' }).lean();

    // --- Trend & Movement Calculation ---
    const allSheltersForTrend = await ShelterModel.find({}, 'currentOccupancy dailyLogs').lean();
    const daysToTrack = 90;
    const trendData = [];
    const movementData = [];
    const now = new Date();
    const dailyStats: Record<string, { net: number, checkIn: number, checkOut: number }> = {};
    
    allSheltersForTrend.forEach((s) => {
      const shelter = s as unknown as ShelterType;
      if (shelter.dailyLogs) {
        shelter.dailyLogs.forEach((log: DailyLog) => {
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
