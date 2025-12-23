import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Hub from '@/models/Hub';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  try {
    const { id } = await params;
    const body = await req.json();
    
    const hub = await Hub.findByIdAndUpdate(
      id,
      { $push: { resources: body } },
      { new: true }
    );

    if (!hub) {
      return NextResponse.json({ success: false, error: 'Hub not found' }, { status: 404 });
    }

  } catch (err) {
    console.error('Failed to add resource:', err);
    return NextResponse.json({ success: false, error: 'Failed to add resource' }, { status: 400 });
  }
}
