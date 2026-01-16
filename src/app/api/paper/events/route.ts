import { NextRequest, NextResponse } from 'next/server';
import { getEventsByPosition } from '@/lib/db/queries';
import getDb from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const positionId = searchParams.get('positionId');
    const limit = parseInt(searchParams.get('limit') || '100');

    let events;

    if (positionId) {
      // Get events for specific position
      events = getEventsByPosition(parseInt(positionId));
    } else {
      // Get all events with limit
      const db = getDb();
      const stmt = db.prepare(`
        SELECT * FROM paper_events
        ORDER BY ts DESC
        LIMIT ?
      `);
      events = stmt.all(limit);
    }

    // Parse JSON payloads
    const parsedEvents = events.map((event: any) => ({
      ...event,
      payload: event.payload ? JSON.parse(event.payload) : null,
    }));

    return NextResponse.json(parsedEvents);
  } catch (error: any) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', details: error.message },
      { status: 500 }
    );
  }
}
