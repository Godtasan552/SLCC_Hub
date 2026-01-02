import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
import { Shelter as IShelter } from '@/types/shelter';
import { getCapacityStatus } from '@/utils/shelter-utils';
import { calculateCurrentOccupancy, getAllShelterOccupancy, getAllShelterMovements } from '@/utils/shelter-server-utils';

export async function GET(req: Request) {
  await dbConnect();
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '7');
    
    const shelters = await Shelter.find({}).sort({ updatedAt: -1 });
    
    // ✅ Optimization: ดึง occupancy และ movement ทั้งหมดในครั้งเดียว
    const [occupancyMap, movementMap] = await Promise.all([
      getAllShelterOccupancy(),
      getAllShelterMovements(days)
    ]);
    
    const sheltersWithData = shelters.map((shelter) => {
      const currentOccupancy = occupancyMap[shelter._id.toString()] || 0;
      const status = getCapacityStatus(currentOccupancy, shelter.capacity);
      const recentMovement = movementMap[shelter._id.toString()] || { in: 0, out: 0 };
      
      return {
        ...shelter.toObject(),
        currentOccupancy,
        capacityStatus: status.text,
        recentMovement
      };
    });
    
    return NextResponse.json({ success: true, data: sheltersWithData });
  } catch (error) {
    console.error('Failed to fetch shelters:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch shelters' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await dbConnect();
  try {
    const body = await req.json();
    const shelter = await Shelter.create(body);
    return NextResponse.json({ success: true, data: shelter }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create shelter:', error);
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000) {
      return NextResponse.json({ success: false, error: 'ชื่อศูนย์นี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'ไม่สามารถสร้างศูนย์ได้' }, { status: 400 });
  }
}

// PATCH for Bulk Import/Update
export async function PATCH(req: Request) {
  await dbConnect();
  try {
    const body = await req.json();
    const { data } = body;

    if (!Array.isArray(data)) {
      return NextResponse.json({ success: false, error: 'Data must be an array' }, { status: 400 });
    }

    const bulkOps = [];
    const results = [];

    for (const item of data) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, currentOccupancy, capacityStatus, dailyLogs, ...updateData } = item;
      
      const sanitizedName = (item.name || '').trim();
      if (typeof updateData.name === 'string') updateData.name = updateData.name.trim();
      if (typeof updateData.district === 'string') updateData.district = updateData.district.trim();
      if (typeof updateData.subdistrict === 'string') updateData.subdistrict = updateData.subdistrict.trim();
      
      if (!updateData.district) updateData.district = 'ไม่ระบุ';
      if (updateData.capacity === null || updateData.capacity === undefined || isNaN(Number(updateData.capacity))) {
          updateData.capacity = 0;
      }

      // Preparation for bulkWrite
      bulkOps.push({
        updateOne: {
          filter: { name: sanitizedName },
          update: { $set: updateData },
          upsert: true
        }
      });
      results.push({ name: sanitizedName });
    }

    if (bulkOps.length > 0) {
      const bulkResult = await Shelter.bulkWrite(bulkOps);
      return NextResponse.json({ 
        success: true, 
        summary: {
          matched: bulkResult.matchedCount,
          modified: bulkResult.modifiedCount,
          upserted: bulkResult.upsertedCount
        },
        results 
      });
    }

    return NextResponse.json({ success: true, results: [] });

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Failed to bulk import shelters:', error);
    return NextResponse.json({ success: false, error: 'Failed to bulk import shelters' }, { status: 500 });
  }
}
