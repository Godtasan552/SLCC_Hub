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

    // 1. Find the shelter and resource first to get sourceHubId and itemName
    const initialShelter = await Shelter.findById(id);
    if (!initialShelter) {
      return NextResponse.json({ success: false, message: 'ไม่พบศูนย์พักพิง' }, { status: 404 });
    }
    const resource = initialShelter.resources.id(rid);
    if (!resource) {
      return NextResponse.json({ success: false, message: 'ไม่พบคำร้อง' }, { status: 404 });
    }

    // 2. Handle Stock Deduction if status becomes 'Approved'
    if (status === 'Approved') {
      const finalAmount = typeof body.amount === 'number' ? body.amount : resource.amount;
      
      if (finalAmount <= 0) {
        return NextResponse.json({ success: false, message: 'จำนวนต้องมากกว่า 0' }, { status: 400 });
      }

      if (resource.sourceHubId) {
        const sourceHubSupply = await Supply.findOne({
          shelterId: resource.sourceHubId,
          name: resource.itemName
        });

        if (!sourceHubSupply || sourceHubSupply.quantity < finalAmount) {
          return NextResponse.json({ 
            success: false, 
            message: `สินค้าในคลังต้นทางไม่พอ (มี ${sourceHubSupply?.quantity || 0} ${resource.unit})` 
          }, { status: 400 });
        }

        // Deduct stock
        sourceHubSupply.quantity -= finalAmount;
        await sourceHubSupply.save();
      }

      // Update the status and potentially the amount
      await Shelter.findOneAndUpdate(
        { _id: id, 'resources._id': rid },
        { 
          $set: { 
            'resources.$.status': 'Approved',
            'resources.$.amount': finalAmount 
          } 
        }
      );
    } else if (status === 'Received') {
      // Logic for Received (increment destination stock)
      await Shelter.findOneAndUpdate(
        { _id: id, 'resources._id': rid },
        { $set: { 'resources.$.status': 'Received' } }
      );

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
          shelterName: initialShelter.name,
          description: 'ได้รับจากการเบิกจ่ายส่วนกลาง (Disbursement)'
        });
      }
    } else {
      // General status update (Rejected, etc.)
      await Shelter.findOneAndUpdate(
        { _id: id, 'resources._id': rid },
        { $set: { 'resources.$.status': status } }
      );
    }

    return NextResponse.json({
      success: true,
      message: `ดำเนินการสถานะ "${status}" เรียบร้อยแล้ว`
    });

  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
