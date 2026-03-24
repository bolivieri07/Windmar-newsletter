import { NextResponse } from 'next/server';

export async function POST(request) {
  const webhook = process.env.ZAPIER_WEBHOOK_URL;
  if (!webhook) {
    return NextResponse.json({ message: 'Webhook not configured' }, { status: 500 });
  }

  const {
    firstName, lastName, phone, email, street, city,
    repId, apptDate, leadSource, storeLocation,
  } = await request.json();

  if (!firstName || !lastName || !phone || !email || !repId || !leadSource) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }
  if (leadSource === 'Booths and Special Events' && !storeLocation) {
    return NextResponse.json({ message: 'Store location is required for Booths and Special Events' }, { status: 400 });
  }

  const payload = {
    firstName,
    lastName,
    phone,
    email,
    street: street || '',
    city: city || '',
    address: `${street || ''}${street && city ? ', ' : ''}${city || ''}`,
    repId,
    apptDate: apptDate || '',
    leadSource,
    storeLocation: storeLocation || '',
  };

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Zapier error:', text);
      return NextResponse.json({ message: 'Zapier webhook error' }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('submit-lead error:', err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
