import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Shelter from '@/models/Shelter';

export async function GET() {
  await dbConnect();
  try {
    const shelters = await Shelter.find({}).sort({ updatedAt: -1 });
    return NextResponse.json({ success: true, data: shelters });
  } catch (error) {
    console.error('Failed to fetch shelters:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch shelters' }, { status: 500 });
  }
}
