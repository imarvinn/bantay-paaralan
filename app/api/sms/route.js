import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // 1. Get the room data sent from the teacher's phone
    const { room, status } = await request.json();

    // 2. We only want to send a text if it's an actual breach
    if (status !== 'breach') {
      return NextResponse.json({ message: 'No SMS needed for this status.' }, { status: 200 });
    }

    // 3. Prepare the payload for Semaphore
    const apikey = process.env.SEMAPHORE_API_KEY;
    const number = process.env.EMERGENCY_TEST_NUMBER; 
    const message = `🚨 BANTAY PAARALAN ALERT: Immediate lockdown triggered at ${room}. Please dispatch response units.`;

    // 4. Send the request to Semaphore's servers
    const response = await fetch('https://api.semaphore.co/api/v4/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        apikey: apikey,
        number: number,
        message: message,
        sendername: 'SEMAPHORE' // The default sender name for free accounts
      })
    });

    const data = await response.json();
    return NextResponse.json({ success: true, data }, { status: 200 });

  } catch (error) {
    console.error("SMS API Error:", error);
    return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 });
  }
}