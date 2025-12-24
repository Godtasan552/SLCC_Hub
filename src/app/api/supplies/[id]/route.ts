import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Supply from '@/models/Supply';

// GET - ดึงข้อมูลสิ่งของรายการเดียว
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const supply = await Supply.findById(id);
    
    if (!supply) {
      return NextResponse.json(
        { success: false, error: 'Supply not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      data: supply 
    });
  } catch (error) {
    console.error('Error fetching supply:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch supply' },
      { status: 500 }
    );
  }
}

// PUT - อัพเดทข้อมูลสิ่งของ
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const body = await req.json();
    
    const supply = await Supply.findByIdAndUpdate(
      id,
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!supply) {
      return NextResponse.json(
        { success: false, error: 'Supply not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      data: supply 
    });
  } catch (error) {
    console.error('Error updating supply:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update supply' },
      { status: 500 }
    );
  }
}

// DELETE - ลบสิ่งของ
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await dbConnect();
    
    const supply = await Supply.findByIdAndDelete(id);
    
    if (!supply) {
      return NextResponse.json(
        { success: false, error: 'Supply not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Supply deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting supply:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete supply' },
      { status: 500 }
    );
  }
}
