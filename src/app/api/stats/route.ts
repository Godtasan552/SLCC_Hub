// app/api/stats/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';

interface Resource {
  category: string;
  [key: string]: unknown;
}

interface ShelterDoc {
  capacity?: number;
  currentOccupancy?: number;
  capacityStatus?: string;
  resources: Resource[];
}

export async function GET() {
  await dbConnect();
  try {
    const shelters = await Shelter.find({}) as unknown as ShelterDoc[];
    
    const stats = {
      totalShelters: shelters.length,
      totalCapacity: shelters.reduce((acc, s) => acc + (s.capacity || 0), 0),
      totalOccupancy: shelters.reduce((acc, s) => acc + (s.currentOccupancy || 0), 0),
      criticalShelters: shelters.filter(s => s.capacityStatus === 'ล้นศูนย์').length,
      warningShelters: shelters.filter(s => s.capacityStatus === 'ใกล้เต็ม').length,
      // สรุปยอดรวมของที่ต้องการ (ตัวอย่าง: ยา)
      totalMedicalRequests: shelters.reduce((acc, s) => 
        acc + (s.resources || []).filter((r: Resource) => r.category === 'Medical').length, 0),
    };

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}