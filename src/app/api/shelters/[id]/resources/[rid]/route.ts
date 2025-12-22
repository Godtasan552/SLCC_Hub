import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; rid: string } }
) {
  console.log('🔵 PATCH /api/shelters/[id]/resources/[rid]');

  await dbConnect();

  console.log('🟡 params:', params);

  const { id, rid } = params;

  console.log('🟠 id:', id);
  console.log('🟠 rid:', rid);

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

  console.log('🟣 update result:', shelter);

  if (!shelter) {
    console.log('🔴 ไม่พบ shelter หรือ status ไม่ใช่ Pending');

    return NextResponse.json(
      { success: false, message: 'ไม่พบคำร้องหรือสถานะไม่ถูกต้อง' },
      { status: 404 }
    );
  }

  console.log('🟢 Approve สำเร็จ');

  return NextResponse.json({
    success: true,
    message: 'อนุมัติคำร้องเรียบร้อย'
  });
}
