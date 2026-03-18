import { NextResponse } from 'next/server';

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

  const sourceLabel = leadSource === 'Booth & Special Events'
    ? `Booth & Special Events - ${boothLocation}`
    : leadSource;

  const payload = {
    firstName,
    lastName,
    email,
    phone,
    address1: streetAddress,
    city,
    source: sourceLabel,
    tags: [leadSource, `rep:${repId}`, ...(boothLocation ? [boothLocation] : [])],
    customField: {
      rep_id: repId,
      appointment_date_time: `${appointmentDate} ${appointmentTime}`,
      lead_source: sourceLabel,
    },
  };

  try {
    const ghlRes = await fetch('https://rest.gohighlevel.com/v1/contacts/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GHL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const ghlData = await ghlRes.json();

    if (!ghlRes.ok) {
      console.error('GHL error:', ghlData);
      return NextResponse.json({ message: ghlData?.message || 'GHL API error' }, { status: ghlRes.status });
    }

    if (ghlData?.contact?.id) {
      await fetch(`https://rest.gohighlevel.com/v1/contacts/${ghlData.contact.id}/notes/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GHL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: `Lead submitted via Windmar Solar Academy\n\nRep ID: ${repId}\nAppointment: ${appointmentDate} at ${appointmentTime}\nLead Source: ${sourceLabel}\nAddress: ${streetAddress}, ${city}`,
        }),
      });
    }

    return NextResponse.json({ success: true, contactId: ghlData?.contact?.id });
  } catch (err) {
    console.error('submit-lead error:', err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
