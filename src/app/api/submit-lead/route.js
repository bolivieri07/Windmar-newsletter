import { NextResponse } from 'next/server';

const ZAPIER_WEBHOOK = 'https://hooks.zapier.com/hooks/catch/1588078/uuqt28n/';

export async function POST(request) {
  const {
    clientName, phone, email, streetAddress, city,
    repId, appointmentDate, appointmentTime, leadSource, boothLocation,
  } = await request.json();

  if (!clientName || !phone || !email || !repId || !leadSource) {
    return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
  }
  if (leadSource === 'Booth & Special Events' && !boothLocation) {
    return NextResponse.json({ message: 'Store location is required for Booth & Special Events' }, { status: 400 });
  }

  const parts = clientName.trim().split(' ');
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ') || '';

  // Map fields to match the Zapier webhook format (same as the HTML form)
  const payload = {
    firstName,
    lastName,
    phone,
    email,
    street: streetAddress,
    city,
    address: `${streetAddress}${streetAddress && city ? ', ' : ''}${city}`,
    repId,
    apptDate: appointmentDate && appointmentTime
      ? `${appointmentDate}T${appointmentTime}`
      : appointmentDate || '',
    leadSource: leadSource === 'Booth & Special Events'
      ? 'Booths and Special Events'
      : leadSource,
    storeLocation: boothLocation || '',
  };

  try {
    const res = await fetch(ZAPIER_WEBHOOK, {
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
