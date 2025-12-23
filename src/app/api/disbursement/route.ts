import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
import Hub from '@/models/Hub';
import Supply from '@/models/Supply';
import { Supply as SupplyType } from '@/types/supply';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { shelterId, resourceId } = await req.json();

    if (!shelterId || !resourceId) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Find the shelter and the specific resource request
    const shelter = await Shelter.findById(shelterId);
    if (!shelter) {
      return NextResponse.json({ success: false, error: 'Shelter not found' }, { status: 404 });
    }

    const resourceRequest = shelter.resources.id(resourceId);
    if (!resourceRequest) {
      return NextResponse.json({ success: false, error: 'Resource request not found' }, { status: 404 });
    }

    if (resourceRequest.status !== 'Pending') {
      return NextResponse.json({ success: false, error: 'Request is not in Pending status' }, { status: 400 });
    }

    // 2. Find matching items in any Hub
    // First, get all Hub IDs to include their supplies
    const hubs = await Hub.find({}, { _id: 1 });
    const hubIds = hubs.map((h: { _id: unknown }) => h._id);

    const hubSupplies = await Supply.find({
      name: { $regex: new RegExp(`^${resourceRequest.itemName}$`, 'i') },
      category: resourceRequest.category,
      $or: [
        { shelterId: null }, 
        { shelterId: { $in: hubIds } },
        { shelterName: { $regex: /คลังกลาง|Hub/i } }
      ]
    });

    const totalAvailable = hubSupplies.reduce((sum: number, s: SupplyType) => sum + s.quantity, 0);

    if (totalAvailable < resourceRequest.amount) {
      return NextResponse.json({ 
        success: false, 
        error: 'จำนวนของในคลังกลางไม่เพียงพอ',
        available: totalAvailable,
        required: resourceRequest.amount
      }, { status: 400 });
    }

    // 3. Subtract from stock (simple FIFO-like deduction across multiple batches if necessary)
    let remainingToSubtract = resourceRequest.amount;
    for (const supply of hubSupplies) {
      if (remainingToSubtract <= 0) break;
      
      const subtractAmount = Math.min(supply.quantity, remainingToSubtract);
      supply.quantity -= subtractAmount;
      remainingToSubtract -= subtractAmount;
      await supply.save();
    }

    // 4. Update Resource Request status to Approved
    resourceRequest.status = 'Approved';
    await shelter.save();

    return NextResponse.json({
      success: true,
      message: 'ตัดสต็อกคลังกลางและเปลี่ยนสถานะเป็น "อนุมัติแล้ว" เรียบร้อยแล้ว',
      remainingStock: totalAvailable - resourceRequest.amount
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Disbursement Error:', error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
