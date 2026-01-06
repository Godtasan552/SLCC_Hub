// app/api/shelters/[id]/resources/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id } = await params;
    const body = await req.json();

    // Support both single resource and array of resources (for bulk requests)
    const resourcesToPush = body.resources && Array.isArray(body.resources) 
      ? body.resources 
      : [body];

    // Validate each resource
    for (const res of resourcesToPush) {
      if (!res.category || !res.itemName || !res.amount || !res.unit) {
        return NextResponse.json(
          { success: false, error: 'ข้อมูลไม่ครบถ้วน (category, itemName, amount, unit are required)' },
          { status: 400 }
        );
      }
      if (Number(res.amount) <= 0) {
        return NextResponse.json(
          { success: false, error: 'จำนวนต้องมากกว่า 0' },
          { status: 400 }
        );
      }
    }

    // Add metadata to each resource
    const processedResources = resourcesToPush.map((res: { category: string, itemName: string, amount: number, unit: string, urgency?: string, status?: string }) => ({
      ...res,
      urgency: res.urgency || 'low',
      status: res.status || 'Pending',
      requestedAt: new Date()
    }));

    const shelter = await Shelter.findByIdAndUpdate(
      id,
      { $push: { resources: { $each: processedResources } } },
      { new: true }
    );

    if (!shelter) {
      return NextResponse.json(
        { success: false, error: 'ไม่พบข้อมูลศูนย์พักพิง' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `สร้างคำร้องขอสำเร็จ (${processedResources.length} รายการ)`,
      data: processedResources
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error
          ? error.message
          : 'เกิดข้อผิดพลาดที่ไม่รู้จัก'
      },
      { status: 500 }
    );
  }
}
