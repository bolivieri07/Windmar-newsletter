'use client';
import { useState } from 'react';

const LEAD_SOURCES = ['Canvassing', 'FFR', 'Booth & Special Events'];

const BOOTH_LOCATIONS = [
  'Bravo Semoran',
  'THD Narcoossee - 6869',
  'THD Poinciana - 6852',
  'THD Orange City - 6323',
  'THD St. Cloud - 6350',
  'THD Alafaya Trail - 6331',
  'THD Southchase - 6328',
  'THD E Colonial - 0266',
  'THD Kissimmee - 0265',
];

const EMPTY_FORM = {
  clientName: '', phone: '', email: '', streetAddress: '',
  city: '', repId: '', appointmentDate: '', appointmentTime: '',
  leadSource: '', boothLocation: '',
};

const inputStyle = {
  width: '100%', padding: '0.8rem 1rem', border: '1.5px solid #e5e7eb',
  borderRadius: 8, fontSize: '0.95rem', fontFamily: 'Barlow,system-ui,sans-serif',
  outline: 'none', color: '#1f2937', boxSizing: 'border-box', background: 'white',
};

const labelStyle = {
  display: 'block', color: '#374151', fontSize: '0.78rem', fontWeight: 700,
  marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em',
};

const rowStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' };

export default function LeadUploadForm() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [errMsg, setErrMsg] = useState('');

  const handle = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev, [name]: value,
      ...(name === 'leadSource' && value !== 'Booth & Special Events' ? { boothLocation: '' } : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setStatus(null); setErrMsg('');
    try {
      const res = await fetch('/api/submit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');
      setStatus('success');
      setForm(EMPTY_FORM);
    } catch (err) {
      setStatus('error'); setErrMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'white', borderRadius: 16, padding: '2rem', maxWidth: 560, margin: '0 auto', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #f3f4f6' }}>

      {status === 'success' && (
        <div style={{ marginBottom: '1.25rem', padding: '0.9rem 1rem', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 8, color: '#15803d', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'Barlow,system-ui,sans-serif' }}>
          Lead submitted successfully!
        </div>
      )}
      {status === 'error' && (
        <div style={{ marginBottom: '1.25rem', padding: '0.9rem 1rem', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: '0.9rem', fontWeight: 700, fontFamily: 'Barlow,system-ui,sans-serif' }}>
          Error: {errMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Client Name *</label>
          <input type="text" name="clientName" value={form.clientName} onChange={handle} required placeholder="Jane Smith" style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#1a2f6e'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
        </div>

        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Phone *</label>
            <input type="tel" name="phone" value={form.phone} onChange={handle} required placeholder="(407) 555-0100" style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#1a2f6e'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>
          <div>
            <label style={labelStyle}>Email *</label>
            <input type="email" name="email" value={form.email} onChange={handle} required placeholder="client@email.com" style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#1a2f6e'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Street Address *</label>
          <input type="text" name="streetAddress" value={form.streetAddress} onChange={handle} required placeholder="123 Solar Lane" style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#1a2f6e'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>City *</label>
          <input type="text" name="city" value={form.city} onChange={handle} required placeholder="Orlando" style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#1a2f6e'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Windmar Rep ID *</label>
          <input type="text" name="repId" value={form.repId} onChange={handle} required pattern="[0-9]{10}" maxLength={10} placeholder="4075551234" style={inputStyle}
            onFocus={e => e.target.style.borderColor = '#1a2f6e'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.3rem', fontFamily: 'Barlow,system-ui,sans-serif' }}>
            10 digits, no spaces or dashes
          </div>
        </div>

        <div style={rowStyle}>
          <div>
            <label style={labelStyle}>Appointment Date *</label>
            <input type="date" name="appointmentDate" value={form.appointmentDate} onChange={handle} required style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#1a2f6e'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>
          <div>
            <label style={labelStyle}>Appointment Time *</label>
            <input type="time" name="appointmentTime" value={form.appointmentTime} onChange={handle} required style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#1a2f6e'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Lead Source *</label>
          <select name="leadSource" value={form.leadSource} onChange={handle} required style={{ ...inputStyle, cursor: 'pointer' }}
            onFocus={e => e.target.style.borderColor = '#1a2f6e'} onBlur={e => e.target.style.borderColor = '#e5e7eb'}>
            <option value="">Select lead source</option>
            {LEAD_SOURCES.map(src => <option key={src} value={src}>{src}</option>)}
          </select>
        </div>

        {form.leadSource === 'Booth & Special Events' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Store / Event Location *</label>
            <select name="boothLocation" value={form.boothLocation} onChange={handle} required style={{ ...inputStyle, cursor: 'pointer' }}
              onFocus={e => e.target.style.borderColor = '#1a2f6e'} onBlur={e => e.target.style.borderColor = '#e5e7eb'}>
              <option value="">Select store</option>
              {BOOTH_LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="submit" disabled={loading}
            style={{ flex: 1, padding: '0.8rem', background: loading ? '#9ca3af' : '#f89b24', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.95rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Barlow,system-ui,sans-serif', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Submitting...' : 'Submit Lead'}
          </button>
          <button type="button" onClick={() => setForm(EMPTY_FORM)}
            style={{ padding: '0.8rem 1.25rem', background: 'white', color: '#6b7280', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Barlow,system-ui,sans-serif' }}>
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}
