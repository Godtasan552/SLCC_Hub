// app/api/stats/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
import Supply from '@/models/Supply';

export async function GET() {
  await dbConnect();
  try {
    // 1. Shelter Stats
    const statsResult = await Shelter.aggregate([
      {
        $group: {
          _id: null,
          totalShelters: { $sum: 1 },
          totalCapacity: { $sum: { $ifNull: ["$capacity", 0] } },
          totalOccupancy: { $sum: { $ifNull: ["$currentOccupancy", 0] } },
          criticalShelters: {
            $sum: { $cond: [{ $eq: ["$capacityStatus", "ล้นศูนย์"] }, 1, 0] }
          },
          warningShelters: {
            $sum: { $cond: [{ $eq: ["$capacityStatus", "ใกล้เต็ม"] }, 1, 0] }
          },
          // สรุปยอดรวมคำขอทรัพยากรทั้งหมด
          totalResourceRequests: {
            $sum: {
              $size: { $ifNull: ["$resources", []] }
            }
          }
        }
      }
    ]);

    // 2. Supply Stats
    const supplyStatsResult = await Supply.aggregate([
      {
        $group: {
          _id: null,
          totalSupplies: { $sum: 1 },
          lowStockSupplies: { $sum: { $cond: [{ $lte: ["$quantity", 10] }, 1, 0] } },
          outOfStockSupplies: { $sum: { $cond: [{ $eq: ["$quantity", 0] }, 1, 0] } }
        }
      }
    ]);

    const shelterStats = statsResult[0] || {
      totalShelters: 0,
      totalCapacity: 0,
      totalOccupancy: 0,
      criticalShelters: 0,
      warningShelters: 0,
      totalResourceRequests: 0,
    };

    const supplyStats = supplyStatsResult[0] || {
      totalSupplies: 0,
      lowStockSupplies: 0,
      outOfStockSupplies: 0
    };

    return NextResponse.json({ ...shelterStats, ...supplyStats });
  } catch (error) {
    console.error('Stats API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}