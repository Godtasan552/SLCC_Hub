import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
import Hub from '@/models/Hub';
import Supply from '@/models/Supply';

export async function GET() {
  await dbConnect();
  try {
    // 1. Shelter Stats (Filter by type: 'Shelter' if needed, but currently mostly Shelters)
    const statsResult = await Shelter.aggregate([
      {
        $match: { type: { $ne: 'Hub' } } // Exclude any Hubs stored in Shelter model if any
      },
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
          totalShelterResources: {
            $sum: { $size: { $ifNull: ["$resources", []] } }
          }
        }
      }
    ]);

    // 2. Hub Stats
    const hubStatsResult = await Hub.aggregate([
      {
        $group: {
          _id: null,
          totalHubs: { $sum: 1 },
          totalHubResources: { $sum: { $size: { $ifNull: ["$resources", []] } } }
        }
      }
    ]);

    // 3. Supply Stats
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
      totalShelterResources: 0,
    };

    const hubStats = hubStatsResult[0] || {
      totalHubs: 0,
      totalHubResources: 0
    };

    const supplyStats = supplyStatsResult[0] || {
      totalSupplies: 0,
      lowStockSupplies: 0,
      outOfStockSupplies: 0
    };

    return NextResponse.json({ 
      ...shelterStats, 
      ...hubStats, 
      ...supplyStats,
      totalResourceRequests: shelterStats.totalShelterResources + hubStats.totalHubResources
    });
  } catch (error) {
    console.error('Stats API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}