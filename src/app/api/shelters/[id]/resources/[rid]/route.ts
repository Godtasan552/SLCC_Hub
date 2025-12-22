import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; rid: string } }
) {
  await dbConnect();

  const { id, rid } = params;

  const shelter = await Shelter.findOneAndUpdate(
    {
      _id: id,
      'resources._id': rid,
      'resources.status': 'Pending'
    },
    {
      $set: { 'resources.$.status': 'Approved' }
    },
    { new: true }
  );

  if (!shelter) {
    return NextResponse.json(
      { success: false, message: 'ไม่พบคำร้องหรือสถานะไม่ถูกต้อง' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'อนุมัติคำร้องเรียบร้อย'
  });
}
