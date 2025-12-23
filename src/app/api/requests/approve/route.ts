import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';
import Supply from '@/models/Supply';
import Hub from '@/models/Hub';

// Approve or Reject a resource request
export async function POST(req: Request) {
  await dbConnect();
  
  try {
    const body = await req.json();
    const { shelterId, resourceId, action, hubId } = body;
    // action: 'approve' or 'reject'

    if (!shelterId || !resourceId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the shelter/hub and the specific resource
    const isHub = !!hubId;
    const Model = isHub ? Hub : Shelter;
    const entity = await Model.findById(shelterId || hubId);

    if (!entity) {
      return NextResponse.json(
        { success: false, error: 'Shelter/Hub not found' },
        { status: 404 }
      );
    }

    const resource = entity.resources.id(resourceId);
    if (!resource) {
      return NextResponse.json(
        { success: false, error: 'Resource request not found' },
        { status: 404 }
      );
    }

    if (action === 'reject') {
      // Simply update status to Rejected
      resource.status = 'Rejected';
      await entity.save();

      return NextResponse.json({
        success: true,
        message: 'คำร้องขอถูกปฏิเสธแล้ว',
        data: resource
      });
    }

    if (action === 'approve') {
      // Check if there's enough stock in hub supplies (supplies without shelterId are hub supplies)
      const hubSupplies = await Supply.find({
        name: { $regex: new RegExp(`^${resource.itemName}$`, 'i') },
        category: resource.category,
        $or: [
          { shelterId: { $exists: false } },
          { shelterId: null }
        ],
        quantity: { $gt: 0 } // Only get supplies with quantity > 0
      }).sort({ createdAt: 1 }); // FIFO

      console.log('🔍 Searching for:', resource.itemName, 'Category:', resource.category);
      console.log('📦 Found supplies:', hubSupplies.length, 'items');
      console.log('📊 Total available:', hubSupplies.reduce((sum, s) => sum + s.quantity, 0));

      let remainingAmount = resource.amount;
      const updatedSupplies = [];

      for (const supply of hubSupplies) {
        if (remainingAmount <= 0) break;

        if (supply.quantity >= remainingAmount) {
          // This supply has enough
          supply.quantity -= remainingAmount;
          remainingAmount = 0;
          await supply.save();
          updatedSupplies.push(supply);
        } else {
          // Take all from this supply and continue
          remainingAmount -= supply.quantity;
          supply.quantity = 0;
          await supply.save();
          updatedSupplies.push(supply);
        }
      }

      if (remainingAmount > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: `สต็อกไม่เพียงพอ ขาดอีก ${remainingAmount} ${resource.unit}` 
          },
          { status: 400 }
        );
      }

      // Update resource status to Approved
      resource.status = 'Approved';
      await entity.save();

      return NextResponse.json({
        success: true,
        message: 'อนุมัติคำร้องขอและตัดสต็อกเรียบร้อย',
        data: resource,
        stockDeducted: resource.amount
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error processing request approval:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
