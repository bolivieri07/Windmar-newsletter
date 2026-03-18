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
  clientName: '',
  phone: '',
  email: '',
  streetAddress: '',
  city: '',
  repId: '',
  appointmentDate: '',
  appointmentTime: '',
  leadSource: '',
  boothLocation: '',
};

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

export default function LeadUploadForm() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [errMsg, setErrMsg] = useState('');

  const handle = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'leadSource' && value !== 'Booth & Special Events' ? { boothLocation: '' } : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    setErrMsg('');
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
      setStatus('error');
      setErrMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#1e3a8a]">Submit New Lead</h2>
        <p className="text-sm text-gray-500 mt-1">All fields marked with * are required.</p>
      </div>

      {status === 'success' && (
        <div className="mb-5 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm font-medium">
          Lead submitted successfully to GoHighLevel!
        </div>
      )}
      {status === 'error' && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm font-medium">
          Error: {errMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Client Name *</label>
          <input type="text" name="clientName" value={form.clientName} onChange={handle} required placeholder="Jane Smith" className={inputClass} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Phone *</label>
            <input type="tel" name="phone" value={form.phone} onChange={handle} required placeholder="(407) 555-0100" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email *</label>
            <input type="email" name="email" value={form.email} onChange={handle} required placeholder="client@email.com" className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Street Address *</label>
          <input type="text" name="streetAddress" value={form.streetAddress} onChange={handle} required placeholder="123 Solar Lane" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>City *</label>
          <input type="text" name="city" value={form.city} onChange={handle} required placeholder="Orlando" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Windmar Rep ID *</label>
          <input type="text" name="repId" value={form.repId} onChange={handle} required pattern="[0-9]{10}" maxLength={10} placeholder="4075551234" className={inputClass} />
          <p className="text-xs text-gray-400 mt-1">Consultant phone number — 10 digits, no spaces or dashes</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Appointment Date *</label>
            <input type="date" name="appointmentDate" value={form.appointmentDate} onChange={handle} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Appointment Time *</label>
            <input type="time" name="appointmentTime" value={form.appointmentTime} onChange={handle} required className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Lead Source *</label>
          <select name="leadSource" value={form.leadSource} onChange={handle} required className={inputClass}>
            <option value="">Select lead source</option>
            {LEAD_SOURCES.map(src => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>
        </div>

        {form.leadSource === 'Booth & Special Events' && (
          <div>
            <label className={labelClass}>Store / Event Location *</label>
            <select name="boothLocation" value={form.boothLocation} onChange={handle} required className={inputClass}>
              <option value="">Select store</option>
              {BOOTH_LOCATIONS.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        )}

        <button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition text-sm tracking-wide mt-2">
          {loading ? 'Submitting...' : 'Submit Lead'}
        </button>
      </form>
    </div>
  );
}
