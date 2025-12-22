import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; rid: string } }
) {
  console.log('🔵 PATCH /api/shelters/[id]/resources/[rid]');

  await dbConnect();
  const { id, rid } = await params;
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
