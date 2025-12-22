// app/api/shelters/[id]/resources/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const { id } = params;
    const body = await req.json();

    const {
      category,
      itemName,
      amount,
      unit,
      urgency
    } = body;

    // Validation ขั้นพื้นฐาน
    if (!category || !itemName || !amount || !unit || !urgency) {
      return NextResponse.json(
        { success: false, error: 'ข้อมูลไม่ครบถ้วน' },
        { status: 400 }
      );
    }

    const newResource = {
      category,
      itemName,
      amount,
      unit,
      urgency,
      status: 'Pending',      // สำคัญมากสำหรับหน้า summary
      requestedAt: new Date()
    };

    const shelter = await Shelter.findByIdAndUpdate(
      id,
      { $push: { resources: newResource } },
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
      message: 'สร้างคำร้องขอสำเร็จ',
      data: newResource
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
