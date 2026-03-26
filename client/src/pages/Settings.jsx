import { useState } from 'react';
import { HiOutlineUser, HiOutlineLockClosed } from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, Input } from '../components/UI';

export default function Settings() {
  const { user } = useAuth();
  const [nameForm, setNameForm] = useState({ name: user?.name || '' });
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [passErrors, setPassErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const setProfileField = (field, value) => {
    setNameForm((prev) => ({ ...prev, [field]: value }));
    if (profileErrors[field]) setProfileErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const setPassField = (field, value) => {
    setPassForm((prev) => ({ ...prev, [field]: value }));
    if (passErrors[field]) setPassErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateProfile = () => {
    const e = {};
    if (!nameForm.name.trim()) e.name = 'Name is required';
    setProfileErrors(e);
    return Object.keys(e).length === 0;
  };

  const validatePassword = () => {
    const e = {};
    if (!passForm.currentPassword) e.currentPassword = 'Current password is required';
    if (!passForm.newPassword) e.newPassword = 'New password is required';
    else if (passForm.newPassword.length < 6) e.newPassword = 'Password must be at least 6 characters';
    if (!passForm.confirmPassword) e.confirmPassword = 'Confirm your new password';
    else if (passForm.newPassword !== passForm.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setPassErrors(e);
    return Object.keys(e).length === 0;
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    if (!validateProfile()) return;
    setSavingProfile(true);
    try {
      await api.put('/auth/profile', nameForm);
      toast.success('Profile updated');
    } catch { toast.error('Failed to update profile'); }
    finally { setSavingProfile(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (!validatePassword()) return;
    setSavingPassword(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      });
      toast.success('Password changed');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPassErrors({});
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally { setSavingPassword(false); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <PageHeader title="Settings" subtitle="Manage your account" />

      {/* Profile */}
      <Card>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineUser className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">Profile</h3>
          </div>
          <form onSubmit={updateProfile} className="space-y-4">
            <Input label="Email" type="email" value={user?.email || ''} disabled />
            <Input label="Name *" value={nameForm.name} onChange={(e) => setProfileField('name', e.target.value)}
              error={profileErrors.name} placeholder="Your name" />
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Update Profile'}
            </Button>
          </form>
        </div>
      </Card>

      {/* Change Password */}
      <Card>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineLockClosed className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">Change Password</h3>
          </div>
          <form onSubmit={changePassword} className="space-y-4">
            <Input label="Current Password *" type="password" value={passForm.currentPassword}
              onChange={(e) => setPassField('currentPassword', e.target.value)}
              error={passErrors.currentPassword} placeholder="Enter current password" />
            <Input label="New Password *" type="password" value={passForm.newPassword}
              onChange={(e) => setPassField('newPassword', e.target.value)}
              error={passErrors.newPassword} placeholder="At least 6 characters" />
            <Input label="Confirm New Password *" type="password" value={passForm.confirmPassword}
              onChange={(e) => setPassField('confirmPassword', e.target.value)}
              error={passErrors.confirmPassword} placeholder="Confirm new password" />
            <Button type="submit" disabled={savingPassword}>
              {savingPassword ? 'Changing...' : 'Change Password'}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
