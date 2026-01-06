import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Hub from '@/models/Hub';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Support both single resource and array of resources
    const resourcesToPush = body.resources && Array.isArray(body.resources) 
      ? body.resources 
      : [body];

    // Validate
    for (const res of resourcesToPush) {
      if (!res.itemName || !res.amount) {
        return NextResponse.json({ success: false, error: 'ข้อมูลไม่ครบถ้วน (itemName and amount are required)' }, { status: 400 });
      }
      if (Number(res.amount) <= 0) {
        return NextResponse.json({ success: false, error: 'จำนวนต้องมากกว่า 0' }, { status: 400 });
      }
    }

    const hub = await Hub.findByIdAndUpdate(
      id,
      { $push: { resources: { $each: resourcesToPush } } },
      { new: true }
    );

    if (!hub) {
      return NextResponse.json({ success: false, error: 'Hub not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `บันทึกข้อมูลสำเร็จ (${resourcesToPush.length} รายการ)`,
      data: hub.resources 
    });
  } catch (err) {
    console.error('Failed to add resource:', err);
    return NextResponse.json({ success: false, error: 'Failed to add resource' }, { status: 500 });
  }
}
