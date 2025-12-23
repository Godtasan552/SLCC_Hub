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

    // Check if we have either shelterId or hubId (identifying where the request came from)
    if ((!shelterId && !hubId) || !resourceId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the entity (Shelter or Hub) that made the request
    const isHubRequest = !!hubId;
    const Model = isHubRequest ? Hub : Shelter;
    const entity = await Model.findById(shelterId || hubId);

    if (!entity) {
      return NextResponse.json(
        { success: false, error: 'Requesting entity (Shelter/Hub) not found' },
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
      resource.status = 'Rejected';
      await entity.save();

      return NextResponse.json({
        success: true,
        message: 'คำร้องขอถูกปฏิเสธแล้ว',
        data: resource
      });
    }

    if (action === 'approve') {
      // 🎯 ดึงเฉพาะคันที่สร้างขึ้นเอง (Hubs)
      const allHubs = await Hub.find({}).select('_id');
      const hubIds = allHubs.map(h => h._id);

      console.log('🏗️ ระบบกำลังค้นหาสต็อกเฉพาะในคลังที่สร้างเอง (Hubs)...');
      console.log('📍 Hub IDs ทั้งหมด:', hubIds.length, 'แห่ง');

      // Escape reg-exp special characters from itemName
      const escapedItemName = resource.itemName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // ค้นหา Supply เฉพาะที่ผูกกับ Hub IDs เหล่านี้เท่านั้น
      // หมายเหตุ: ตัด category filter ออกเพื่อป้องกันปัญหาเรื่อง English/Thai category mismatch 
      // เนื่องจากเราใช้ itemName ที่ตรงกัน (case-insensitive) แทนแล้ว
      const hubSupplies = await Supply.find({
        name: { $regex: new RegExp(`^${escapedItemName}$`, 'i') },
        quantity: { $gt: 0 },
        shelterId: { $in: hubIds } 
      }).sort({ createdAt: 1 }); // FIFO

      console.log(`🔍 Searching for: "${resource.itemName}" (Escaped: "${escapedItemName}")`);
      console.log('📦 Found supplies in hubs:', hubSupplies.length, 'items');
      
      hubSupplies.forEach(s => {
        console.log(`   - ${s.name}: ${s.quantity} ${s.unit} (In Hub: ${s.shelterName || s.shelterId})`);
      });
      
      const totalAvailable = hubSupplies.reduce((sum, s) => sum + s.quantity, 0);
      console.log('📊 Total available in your hubs:', totalAvailable);

      let remainingAmount = resource.amount;
      const updatedSupplies = [];

      for (const supply of hubSupplies) {
        if (remainingAmount <= 0) break;

        if (supply.quantity >= remainingAmount) {
          supply.quantity -= remainingAmount;
          remainingAmount = 0;
          await supply.save();
          updatedSupplies.push(supply);
        } else {
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
            error: `สต็อกในคลัง(Hub)ไม่เพียงพอ ขาดอีก ${remainingAmount} ${resource.unit}` 
          },
          { status: 400 }
        );
      }

      // Update resource status to Approved
      resource.status = 'Approved';
      await entity.save();

      return NextResponse.json({
        success: true,
        message: 'อนุมัติคำร้องขอและตัดสต็อกจากคลัง(Hub)เรียบร้อย',
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
