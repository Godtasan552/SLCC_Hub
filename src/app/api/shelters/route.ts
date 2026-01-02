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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');
    const searchTerm = searchParams.get('searchTerm') || '';
    const districtFilter = searchParams.get('district') || 'All';
    const statusFilter = searchParams.get('status') || 'All';
    const skip = (page - 1) * limit;

    // 1. สร้าง Base Pipeline
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pipeline: any[] = [];

    // Filter เบื้องต้น (Search & District)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match: any = {};
    if (searchTerm) {
      match.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { district: { $regex: searchTerm, $options: 'i' } }
      ];
    }
    if (districtFilter !== 'All') {
      match.district = districtFilter;
    }
    pipeline.push({ $match: match });

    // 2. Lookup เพื่อคำนวณ Occupancy (ใช้ logic เดียวกับ getAllShelterOccupancy แต่ทำใน Pipeline)
    pipeline.push({
      $lookup: {
        from: 'shelterlogs', // ชื่อ collection ใน MongoDB
        localField: '_id',
        foreignField: 'shelterId',
        as: 'logs'
      }
    });

    pipeline.push({
      $addFields: {
        currentOccupancy: {
          $max: [
            0,
            {
              $subtract: [
                { $sum: { $map: { input: "$logs", as: "log", in: { $cond: [{ $eq: ["$$log.action", "in"] }, "$$log.amount", 0] } } } },
                { $sum: { $map: { input: "$logs", as: "log", in: { $cond: [{ $eq: ["$$log.action", "out"] }, "$$log.amount", 0] } } } }
              ]
            }
          ]
        }
      }
    });

    // 3. คำนวณ Capacity Status
    pipeline.push({
      $addFields: {
        percent: { 
          $cond: [
            { $gt: ["$capacity", 0] }, 
            { $multiply: [{ $divide: ["$currentOccupancy", "$capacity"] }, 100] }, 
            0 
          ] 
        }
      }
    });

    pipeline.push({
      $addFields: {
        capacityStatus: {
          $cond: [
            { $gt: ["$percent", 100] }, "ล้นศูนย์",
            { $cond: [{ $gte: ["$percent", 80] }, "ใกล้เต็ม", "รองรับได้"] }
          ]
        }
      }
    });

    // 4. กรองด้วย Status (ถ้ามีการเลือก)
    if (statusFilter !== 'All') {
      pipeline.push({ $match: { capacityStatus: statusFilter } });
    }

    // 5. ใช้ Facet เพื่อทำ Pagination และนับจำนวนทั้งหมดในทีเดียว
    pipeline.push({
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $sort: { updatedAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          { $project: { logs: 0, percent: 0 } }
        ]
      }
    });

    const results = await Shelter.aggregate(pipeline);
    const rawData = results[0].data;
    const totalCount = results[0].metadata[0]?.total || 0;
    const totalPages = Math.ceil(totalCount / limit);

    // ✅ เพิ่ม recentMovement กลับเข้าไป (ใช้ logic เดิมเพราะเร็วและครอบคลุมกว่าการทำ complex lookup ใน pipeline)
    const days = parseInt(new URL(req.url).searchParams.get('days') || '7');
    const movementMap = await getAllShelterMovements(days);
    
    const data = rawData.map((s: IShelter) => ({
      ...s,
      recentMovement: movementMap[s._id?.toString() || ''] || { in: 0, out: 0 }
    }));

    return NextResponse.json({ 
      success: true, 
      data,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages
      }
    });
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
