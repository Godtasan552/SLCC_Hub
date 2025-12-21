import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
import { Shelter as IShelter } from '@/types/shelter';

export async function GET() {
  await dbConnect();
  try {
    const shelters = await Shelter.find({}).sort({ updatedAt: -1 });
    return NextResponse.json({ success: true, data: shelters });
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
  } catch (error) {
    console.error('Failed to create shelter:', error);
    return NextResponse.json({ success: false, error: 'Failed to create shelter' }, { status: 400 });
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

    const results = [];
    for (const item of data) {
      try {
        // ลบ _id ออกเพื่อป้องกัน Duplicate Key error หรือ Immutable field error
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...updateData } = item;

        // Try to find existing shelter by name, district, and subdistrict
        // เพื่อแยกแยะศูนย์ที่ชื่อซ้ำกันแม้จะอยู่ในอำเภอเดียวกันแต่อยู่คนละตำบล
        const query: Record<string, string | object> = { name: item.name };
        
        if (item.district) {
          query.district = item.district;
        }
        
        if (item.subdistrict) {
          query.subdistrict = item.subdistrict;
        }

        const existing = await Shelter.findOne(query);

        if (existing) {
          // Update existing
          Object.assign(existing, updateData);
          await existing.save();
          results.push({ action: 'updated', name: item.name });
        } else {
          // Create new
          const newShelter = await Shelter.create(updateData) as unknown as IShelter;
          results.push({ action: 'created', name: newShelter.name });
        }
      } catch (err) {
        console.error(`Error processing shelter ${item.name}:`, err);
        results.push({ action: 'error', name: item.name, error: String(err) });
        // Continue processing other items
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Failed to bulk import shelters:', error);
    return NextResponse.json({ success: false, error: 'Failed to bulk import shelters' }, { status: 500 });
  }
}
