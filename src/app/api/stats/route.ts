// app/api/stats/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';

export async function GET() {
  await dbConnect();
  try {
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
          // สรุปยอดรวมของที่ต้องการ (ตัวอย่าง: ยา)
          totalMedicalRequests: {
            $sum: {
              $size: {
                $filter: {
                  input: { $ifNull: ["$resources", []] },
                  as: "res",
                  cond: { $eq: ["$$res.category", "Medical"] }
                }
              }
            }
          }
        }
      }
    ]);

    const stats = statsResult[0] || {
      totalShelters: 0,
      totalCapacity: 0,
      totalOccupancy: 0,
      criticalShelters: 0,
      warningShelters: 0,
      totalMedicalRequests: 0,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Stats API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}