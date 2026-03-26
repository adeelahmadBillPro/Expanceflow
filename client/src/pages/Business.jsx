import { useState, useEffect } from 'react';
import { HiOutlineBuildingOffice2, HiOutlineBanknotes, HiOutlinePhoto } from 'react-icons/hi2';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Input, Spinner } from '../components/UI';

export default function Business() {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', city: '', ntn: '',
    bankName: '', bankAccount: '', bankIban: '', gstRate: '17',
  });
  const [logo, setLogo] = useState(null);
  const [currentLogo, setCurrentLogo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    api.get('/business').then((res) => {
      if (res.data) {
        setForm({
          name: res.data.name || '', email: res.data.email || '', phone: res.data.phone || '',
          address: res.data.address || '', city: res.data.city || '', ntn: res.data.ntn || '',
          bankName: res.data.bankName || '', bankAccount: res.data.bankAccount || '',
          bankIban: res.data.bankIban || '', gstRate: String(res.data.gstRate || 17),
        });
        setCurrentLogo(res.data.logo);
      }
    }).catch(() => toast.error('Failed to load business profile'))
      .finally(() => setLoading(false));
  }, []);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Business name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (form.gstRate === '' || parseFloat(form.gstRate) < 0) e.gstRate = 'Enter a valid GST rate';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (logo) formData.append('logo', logo);
      const res = await api.put('/business', formData);
      setCurrentLogo(res.data.logo);
      toast.success('Business profile saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="space-y-4"><PageHeader title="Business Profile" subtitle="This info appears on your invoices" /><Card><Spinner /></Card></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <PageHeader title="Business Profile" subtitle="This info appears on your invoices" />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Logo */}
        <Card>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <HiOutlinePhoto className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Company Logo</h3>
            </div>
            <div className="flex items-center gap-5">
              {currentLogo ? (
                <img src={currentLogo} alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <span className="text-xl font-bold text-indigo-400">{form.name?.charAt(0) || 'B'}</span>
                </div>
              )}
              <div>
                <input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files[0])}
                  className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-indigo-50 file:text-indigo-600 file:font-medium file:text-xs file:cursor-pointer" />
                <p className="text-[11px] text-slate-400 mt-1">Recommended: 200x200px, PNG or JPG</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Company Info */}
        <Card>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <HiOutlineBuildingOffice2 className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Company Information</h3>
            </div>
            <div className="space-y-4">
              <Input label="Business Name *" value={form.name} onChange={(e) => setField('name', e.target.value)}
                error={errors.name} placeholder="Your business name" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Email" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)}
                  error={errors.email} placeholder="business@example.com" />
                <Input label="Phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)}
                  placeholder="Phone number" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Address" value={form.address} onChange={(e) => setField('address', e.target.value)}
                  placeholder="Street address" />
                <Input label="City" value={form.city} onChange={(e) => setField('city', e.target.value)}
                  placeholder="City" />
              </div>
            </div>
          </div>
        </Card>

        {/* Tax & Bank */}
        <Card>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <HiOutlineBanknotes className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-700">Tax & Banking</h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="FBR NTN Number" value={form.ntn} onChange={(e) => setField('ntn', e.target.value)}
                  placeholder="1234567-8" />
                <Input label="Default GST Rate (%)" type="number" step="0.01" value={form.gstRate}
                  onChange={(e) => setField('gstRate', e.target.value)} error={errors.gstRate} placeholder="17" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Bank Name" value={form.bankName} onChange={(e) => setField('bankName', e.target.value)}
                  placeholder="HBL, Meezan, etc." />
                <Input label="Account Number" value={form.bankAccount} onChange={(e) => setField('bankAccount', e.target.value)}
                  placeholder="Account number" />
              </div>
              <Input label="IBAN" value={form.bankIban} onChange={(e) => setField('bankIban', e.target.value)}
                placeholder="PK00XXXX0000000000000000" />
            </div>
          </div>
        </Card>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Business Profile'}
        </Button>
      </form>
    </div>
  );
}
