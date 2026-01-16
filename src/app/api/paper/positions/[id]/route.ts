import { NextRequest, NextResponse } from 'next/server';
import { getPositionById, updatePosition, deletePosition } from '@/lib/db/queries';
import logger from '@/lib/utils/logger';
import type { UpdatePositionRequest } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const position = getPositionById(id);

    if (!position) {
      return NextResponse.json(
        { error: 'Position not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(position, { status: 200 });
  } catch (error: any) {
    logger.error({ error: error.message, id: params.id }, 'Failed to get position');
    return NextResponse.json(
      { error: 'Failed to get position', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body: UpdatePositionRequest = await request.json();

    const position = updatePosition(id, body);

    if (!position) {
      return NextResponse.json(
        { error: 'Position not found' },
        { status: 404 }
      );
    }

    logger.info({ positionId: id, updates: body }, 'Position updated via API');

    return NextResponse.json(position, { status: 200 });
  } catch (error: any) {
    logger.error({ error: error.message, id: params.id }, 'Failed to update position');
    return NextResponse.json(
      { error: 'Failed to update position', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const success = deletePosition(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Position not found' },
        { status: 404 }
      );
    }

    logger.info({ positionId: id }, 'Position deleted via API');

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    logger.error({ error: error.message, id: params.id }, 'Failed to delete position');
    return NextResponse.json(
      { error: 'Failed to delete position', details: error.message },
      { status: 500 }
    );
  }
}
