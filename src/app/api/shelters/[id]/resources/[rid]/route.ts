import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
import Supply from '@/models/Supply';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; rid: string }> }
) {
  try {
    await dbConnect();
    const { id, rid } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ success: false, message: 'กรุณาระบุสถานะ' }, { status: 400 });
    }

    // 1. Update the status in Shelter model
    const shelter = await Shelter.findOneAndUpdate(
      {
        _id: id,
        'resources._id': rid,
      },
      {
        $set: { 'resources.$.status': status }
      },
      { new: true }
    );

    if (!shelter) {
      return NextResponse.json(
        { success: false, message: 'ไม่พบคำร้อง' },
        { status: 404 }
      );
    }

    // 2. If status is 'Received', increment targeted shelter's supply
    if (status === 'Received') {
      const resource = shelter.resources.id(rid);
      if (resource) {
        // Find existing supply in this shelter or create new
        const existingSupply = await Supply.findOne({
          shelterId: id,
          name: resource.itemName,
          category: resource.category
        });

        if (existingSupply) {
          existingSupply.quantity += resource.amount;
          await existingSupply.save();
        } else {
          await Supply.create({
            name: resource.itemName,
            category: resource.category,
            quantity: resource.amount,
            unit: resource.unit,
            shelterId: id,
            shelterName: shelter.name,
            description: 'ได้รับจากการเบิกจ่ายส่วนกลาง (Disbursement)'
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `เปลี่ยนสถานะเป็น "${status}" เรียบร้อยแล้ว`
    });

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
