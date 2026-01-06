import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Hub from '@/models/Hub';
// Import Hub above ensures schema cache is cleared if updated

export async function GET() {
  await dbConnect();
  try {
    const hubs = await Hub.find({}).sort({ updatedAt: -1 });
    return NextResponse.json({ success: true, data: hubs });
  } catch (err) {
    console.error('Failed to fetch hubs:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch hubs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await dbConnect();
  try {
    const body = await req.json();
    const hub = await Hub.create(body);
    return NextResponse.json({ success: true, data: hub }, { status: 201 });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000) {
      return NextResponse.json({ success: false, error: 'ชื่อคลังกลางนี้มีอยู่ในระบบแล้ว' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'ไม่สามารถสร้างคลังกลางได้' }, { status: 400 });
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
      // Basic sanitization
      const sanitizedName = (item.name || '').trim();
      const updateData = {
        name: sanitizedName,
        district: (item.district || 'ไม่ระบุ').trim(),
        subdistrict: (item.subdistrict || '').trim(),
        phoneNumbers: Array.isArray(item.phoneNumbers) ? item.phoneNumbers : (item.phoneNumbers ? [item.phoneNumbers] : [])
      };

      if (!sanitizedName) continue;

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
      const bulkResult = await Hub.bulkWrite(bulkOps);
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
  } catch (error) {
    console.error('Failed to bulk import hubs:', error);
    return NextResponse.json({ success: false, error: 'Failed to bulk import hubs' }, { status: 500 });
  }
}
