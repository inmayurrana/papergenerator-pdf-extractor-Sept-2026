import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Lock,
  Check,
  X,
  ShieldAlert,
  FolderTree,
  Edit3,
  Trash2,
  KeyRound,
  Sparkles,
  Power,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw,
  Unlock,
  Sliders,
  ShieldCheck,
  Image,
  Upload,
  ExternalLink,
  Type,
  Palette,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/authStore';

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [toastMsg, setToastMsg] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPwdModalOpen, setIsResetPwdModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAclModalOpen, setIsAclModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Create Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('TEACHER');

  // Edit Form states
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('TEACHER');
  const [editIsActive, setEditIsActive] = useState(true);

  // Reset Password states
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ACL states
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [aclPermission, setAclPermission] = useState('READ');

  // Security Policy & Token Expiry states
  const [tokenExpiryMinutes, setTokenExpiryMinutes] = useState(15);
  const [lockoutMinutes, setLockoutMinutes] = useState(5);
  const [maxFailedAttempts, setMaxFailedAttempts] = useState(5);
  const [requireChallenge, setRequireChallenge] = useState(true);
  const [savingPolicy, setSavingPolicy] = useState(false);

  // Login Page Branding & Appearance states
  const [loginTitle, setLoginTitle] = useState('PaperGen AI Intelligence');
  const [loginSubtitle, setLoginSubtitle] = useState('Secure Examination & Formula Extraction Suite');
  const [loginLogoUrl, setLoginLogoUrl] = useState('');
  const [loginFooterLeft, setLoginFooterLeft] = useState('256-bit Encrypted Session');
  const [loginFooterRight, setLoginFooterRight] = useState('Offline-Ready On-Premises Architecture');
  const [savingBranding, setSavingBranding] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.users || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFolders = async () => {
    try {
      const res = await api.get('/folders');
      setFolders(res.data.folders || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSecuritySettings = async () => {
    try {
      const res = await api.get('/security/settings');
      if (res.data?.parsed) {
        setTokenExpiryMinutes(res.data.parsed.tokenExpiryMinutes);
        setLockoutMinutes(res.data.parsed.lockoutMinutes);
        setMaxFailedAttempts(res.data.parsed.maxFailedAttempts);
        setRequireChallenge(res.data.parsed.requireChallenge);
      }
      if (res.data?.branding) {
        setLoginTitle(res.data.branding.title || 'PaperGen AI Intelligence');
        setLoginSubtitle(res.data.branding.subtitle || 'Secure Examination & Formula Extraction Suite');
        setLoginLogoUrl(res.data.branding.logoUrl || '');
        setLoginFooterLeft(res.data.branding.footerLeft || '256-bit Encrypted Session');
        setLoginFooterRight(res.data.branding.footerRight || 'Offline-Ready On-Premises Architecture');
      }
    } catch (err) {
      console.error('Failed to load security settings:', err);
    }
  };

  const handleSaveSecurityPolicy = async () => {
    setSavingPolicy(true);
    try {
      await api.put('/security/settings', {
        tokenExpiryMinutes: Number(tokenExpiryMinutes),
        maxFailedAttempts: Number(maxFailedAttempts),
        lockoutMinutes: Number(lockoutMinutes),
        requireChallenge: Boolean(requireChallenge),
      });
      showToast(`✓ Security policy saved! Token expiry set to ${tokenExpiryMinutes} mins.`);
    } catch (err: any) {
      alert(`Failed to save security policy: ${err.response?.data?.error || err.message}`);
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    try {
      await api.put('/security/branding', {
        title: loginTitle.trim(),
        subtitle: loginSubtitle.trim(),
        logoUrl: loginLogoUrl.trim(),
        footerLeft: loginFooterLeft.trim(),
        footerRight: loginFooterRight.trim(),
      });
      showToast('✓ Login page branding & logo updated successfully!');
    } catch (err: any) {
      alert(`Failed to save login branding: ${err.response?.data?.error || err.message}`);
    } finally {
      setSavingBranding(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Logo file exceeds 5MB size limit.');
      return;
    }

    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await api.post('/security/branding/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.logoUrl) {
        setLoginLogoUrl(res.data.logoUrl);
        showToast('✓ Custom logo uploaded and applied to login page!');
      }
    } catch (err: any) {
      alert(`Logo upload failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleUnlockUser = async (userId: string, userName: string) => {
    try {
      await api.post(`/security/unlock-user/${userId}`);
      fetchUsers();
      showToast(`✓ Account for ${userName} has been unlocked!`);
    } catch (err: any) {
      alert(`Unlock failed: ${err.response?.data?.error || err.message}`);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchFolders();
    fetchSecuritySettings();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', { fullName, email, password, role });
      setIsCreateModalOpen(false);
      setFullName('');
      setEmail('');
      setPassword('');
      fetchUsers();
      showToast(`✓ User account created for ${fullName}!`);
    } catch (err: any) {
      alert(`Create user failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const openEditModal = (user: any) => {
    setSelectedUser(user);
    setEditFullName(user.fullName);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditIsActive(user.isActive);
    setIsEditModalOpen(true);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await api.put(`/users/${selectedUser.id}`, {
        fullName: editFullName,
        email: editEmail,
        role: editRole,
        isActive: editIsActive,
      });
      setIsEditModalOpen(false);
      fetchUsers();
      showToast(`✓ User ${editFullName} updated successfully!`);
    } catch (err: any) {
      alert(`Update user failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleToggleStatus = async (user: any) => {
    try {
      const newStatus = !user.isActive;
      await api.put(`/users/${user.id}`, { isActive: newStatus });
      fetchUsers();
      showToast(newStatus ? `🟢 Activated account: ${user.fullName}` : `🔴 Deactivated account: ${user.fullName}`);
    } catch (err: any) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const openResetPwdModal = (user: any) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPassword(false);
    setIsResetPwdModalOpen(true);
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }
    try {
      await api.post(`/users/${selectedUser.id}/reset-password`, { newPassword });
      setIsResetPwdModalOpen(false);
      setNewPassword('');
      showToast(`🔑 Password reset successfully for ${selectedUser.fullName}!`);
    } catch (err: any) {
      alert(`Password reset failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const openDeleteModal = (user: any) => {
    if (currentUser?.id === user.id) {
      alert('You cannot delete your own logged-in administrator account!');
      return;
    }
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await api.delete(`/users/${selectedUser.id}`);
      setIsDeleteModalOpen(false);
      fetchUsers();
      showToast(`🗑️ Deleted user account: ${selectedUser.fullName}`);
    } catch (err: any) {
      alert(`Delete user failed: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleSaveAcl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedFolderId) return;
    try {
      await api.post(`/users/${selectedUser.id}/acl`, {
        resource: 'FOLDER',
        resourceId: selectedFolderId,
        permission: aclPermission,
      });
      setIsAclModalOpen(false);
      fetchUsers();
      showToast(`✓ Saved ACL rule for ${selectedUser.fullName}!`);
    } catch (err: any) {
      alert(`Save ACL failed: ${err.message}`);
    }
  };

  const roles = [
    'SUPER_ADMIN',
    'ADMIN',
    'CONTENT_MANAGER',
    'QUESTION_CREATOR',
    'TEACHER',
    'REVIEWER',
    'EXAM_CREATOR',
    'OMR_EVALUATOR',
    'VIEWER',
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-indigo-600 border border-indigo-400 text-white px-5 py-3 rounded-2xl shadow-2xl animate-fade-in flex items-center space-x-2 text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-indigo-200" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-[#D1D5DB] rounded-xl shadow-sm p-4 sm:p-5">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#0B1F3A]/5 text-[#0B1F3A] border border-[#0B1F3A]/15 flex items-center justify-center">
            <Users className="w-4 h-4 text-[#0B1F3A]" />
          </div>
          <div>
            <h1 className="font-bold text-base sm:text-lg text-[#111827]">User Management & Access Control (RBAC + ACL)</h1>
            <p className="text-xs text-[#4B5563]">
              Manage accounts, edit credentials, deactivate access, reset passwords, and configure Class / Subject folder permissions
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-[#0B1F3A] hover:bg-[#16365F] text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm flex items-center space-x-1.5 transition-all"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ Add New User</span>
        </button>
      </div>

      {/* Security Policy & Token Expiry Card (Admins Only) */}
      {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') && (
        <>
          <div className="bg-white border border-[#D1D5DB] rounded-xl shadow-sm p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0B1F3A]/5 text-[#0B1F3A] border border-[#0B1F3A]/15 flex items-center justify-center">
                <Sliders className="w-4 h-4 text-[#0B1F3A]" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#111827]">System Security Policy & Session Control</h3>
                <p className="text-xs text-[#4B5563]">
                  Configure token lifetime, automated 5-minute lockout thresholds, and anti-bot challenge protection
                </p>
              </div>
            </div>

            <button
              onClick={handleSaveSecurityPolicy}
              disabled={savingPolicy}
              className="px-4 py-2 bg-[#0B1F3A] hover:bg-[#16365F] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{savingPolicy ? 'Saving Policy...' : 'Save Security Policy'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {/* Token Expiry */}
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3.5 space-y-1.5">
              <label className="text-xs font-bold text-[#4B5563] uppercase tracking-wider block">
                Token Expiration (Minutes)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={tokenExpiryMinutes}
                  onChange={(e) => setTokenExpiryMinutes(parseInt(e.target.value) || 15)}
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-2.5 py-1.5 text-xs text-[#111827] font-mono focus:outline-none focus:border-[#0B1F3A]"
                />
                <span className="text-xs text-[#6B7280]">mins</span>
              </div>
              <p className="text-xs text-[#6B7280]">Access token lifetime before re-auth</p>
            </div>

            {/* Lockout Duration */}
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3.5 space-y-1.5">
              <label className="text-xs font-bold text-[#4B5563] uppercase tracking-wider block">
                Lockout Duration (Minutes)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={lockoutMinutes}
                  onChange={(e) => setLockoutMinutes(parseInt(e.target.value) || 5)}
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-2.5 py-1.5 text-xs text-[#111827] font-mono focus:outline-none focus:border-[#0B1F3A]"
                />
                <span className="text-xs text-[#6B7280]">mins</span>
              </div>
              <p className="text-xs text-[#6B7280]">Account locked after failed limit</p>
            </div>

            {/* Max Failed Attempts */}
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3.5 space-y-1.5">
              <label className="text-xs font-bold text-[#4B5563] uppercase tracking-wider block">
                Max Failed Login Attempts
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={maxFailedAttempts}
                  onChange={(e) => setMaxFailedAttempts(parseInt(e.target.value) || 5)}
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-2.5 py-1.5 text-xs text-[#111827] font-mono focus:outline-none focus:border-[#0B1F3A]"
                />
                <span className="text-xs text-[#6B7280]">tries</span>
              </div>
              <p className="text-xs text-[#6B7280]">Consecutive failures trigger lockout</p>
            </div>

            {/* Anti-Bot Challenge */}
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3.5 space-y-1.5">
              <label className="text-xs font-bold text-[#4B5563] uppercase tracking-wider block">
                Login Proof-of-Work Challenge
              </label>
              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRequireChallenge(!requireChallenge)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    requireChallenge
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-white text-[#4B5563] border-[#D1D5DB]'
                  }`}
                >
                  {requireChallenge ? 'Active (Enforced)' : 'Disabled'}
                </button>
              </div>
              <p className="text-xs text-[#6B7280]">Proof-of-Work anti-bot defense</p>
            </div>
          </div>
        </div>

        {/* Login Page Portal Branding & Logo Customization Panel */}
        <div className="bg-white border border-[#D1D5DB] rounded-xl shadow-sm p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0B1F3A]/5 text-[#0B1F3A] border border-[#0B1F3A]/15 flex items-center justify-center">
                <Palette className="w-4 h-4 text-[#0B1F3A]" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#111827]">Login Page Portal Branding & Logo</h3>
                <p className="text-xs text-[#4B5563]">
                  Customize the application title, subtitle description, school logo, and security footer displayed on the login page
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <a
                href="/login"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-white hover:bg-[#F3F4F6] text-[#374151] rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all border border-[#D1D5DB]"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#6B7280]" />
                <span>View Live Login Page</span>
              </a>

              <button
                onClick={handleSaveBranding}
                disabled={savingBranding}
                className="px-4 py-1.5 bg-[#0B1F3A] hover:bg-[#16365F] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm disabled:opacity-50"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{savingBranding ? 'Saving Branding...' : 'Save Branding'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
            {/* Left 7 Columns: Form Controls */}
            <div className="lg:col-span-7 space-y-3.5">
              {/* Application / Portal Title */}
              <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3.5 space-y-1.5">
                <label className="text-xs font-semibold text-[#374151] flex items-center space-x-1.5">
                  <Type className="w-3.5 h-3.5 text-[#0B1F3A]" />
                  <span>Portal Title / School Name</span>
                </label>
                <input
                  type="text"
                  value={loginTitle}
                  onChange={(e) => setLoginTitle(e.target.value)}
                  placeholder="e.g. PaperGen AI Intelligence or St. Xavier's High School"
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#0B1F3A]"
                />
                <p className="text-xs text-[#6B7280]">
                  Primary prominent header text displayed on top of the login card.
                </p>
              </div>

              {/* Subtitle / Department Description */}
              <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3.5 space-y-1.5">
                <label className="text-xs font-semibold text-[#374151] flex items-center space-x-1.5">
                  <Type className="w-3.5 h-3.5 text-[#0B1F3A]" />
                  <span>Subtitle / Department Description</span>
                </label>
                <input
                  type="text"
                  value={loginSubtitle}
                  onChange={(e) => setLoginSubtitle(e.target.value)}
                  placeholder="e.g. Secure Examination & Formula Extraction Suite"
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#0B1F3A]"
                />
                <p className="text-xs text-[#6B7280]">
                  Secondary description text beneath the main portal title.
                </p>
              </div>

              {/* Custom Logo Upload / URL */}
              <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3.5 space-y-2">
                <label className="text-xs font-semibold text-[#374151] flex items-center space-x-1.5">
                  <Image className="w-3.5 h-3.5 text-[#0B1F3A]" />
                  <span>Custom School / Organization Logo</span>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer px-3 py-1.5 bg-white hover:bg-[#F3F4F6] border border-[#D1D5DB] rounded-lg text-xs font-semibold text-[#111827] flex items-center space-x-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-[#0B1F3A]" />
                    <span>{logoUploading ? 'Uploading...' : 'Upload Logo Image'}</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/svg+xml, image/webp"
                      onChange={handleLogoUpload}
                      disabled={logoUploading}
                      className="hidden"
                    />
                  </label>

                  {loginLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setLoginLogoUrl('')}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 rounded-lg text-xs font-medium transition-colors"
                    >
                      Reset to Default Shield
                    </button>
                  )}
                </div>

                <div className="pt-1">
                  <input
                    type="text"
                    value={loginLogoUrl}
                    onChange={(e) => setLoginLogoUrl(e.target.value)}
                    placeholder="Or enter logo image URL (e.g. /data/uploads/my_logo.png)"
                    className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-1.5 text-xs text-[#111827] placeholder-[#9CA3AF] font-mono focus:outline-none focus:border-[#0B1F3A]"
                  />
                </div>
                <p className="text-xs text-[#6B7280]">
                  Recommended: Transparent PNG, SVG, or high-res JPG (square or horizontal ratio, up to 5MB).
                </p>
              </div>

              {/* Footer Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3.5 space-y-1">
                  <label className="text-xs font-bold text-[#4B5563] uppercase tracking-wider block">
                    Left Footer Badge Text
                  </label>
                  <input
                    type="text"
                    value={loginFooterLeft}
                    onChange={(e) => setLoginFooterLeft(e.target.value)}
                    className="w-full bg-white border border-[#D1D5DB] rounded-lg px-2.5 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0B1F3A]"
                  />
                </div>
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3.5 space-y-1">
                  <label className="text-xs font-bold text-[#4B5563] uppercase tracking-wider block">
                    Right Footer Badge Text
                  </label>
                  <input
                    type="text"
                    value={loginFooterRight}
                    onChange={(e) => setLoginFooterRight(e.target.value)}
                    className="w-full bg-white border border-[#D1D5DB] rounded-lg px-2.5 py-1.5 text-xs text-[#111827] focus:outline-none focus:border-[#0B1F3A]"
                  />
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Live Real-Time Login Portal Preview */}
            <div className="lg:col-span-5 flex flex-col justify-between bg-[#F9FAFB] border border-[#D1D5DB] rounded-xl p-4">
              <div className="space-y-1 pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0B1F3A]">
                    Live Portal Preview
                  </span>
                  <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-mono font-semibold">
                    Real-time
                  </span>
                </div>
                <p className="text-xs text-[#6B7280]">
                  Preview of how teachers & students see the login page:
                </p>
              </div>

              {/* Mockup Card (White theme standard) */}
              <div className="my-3 p-4 bg-white rounded-xl border border-slate-300 shadow-md text-black space-y-3">
                <div className="text-center space-y-1.5">
                  {loginLogoUrl ? (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto shadow-sm overflow-hidden bg-white border border-slate-200 p-0.5">
                      <img
                        src={loginLogoUrl}
                        alt="Preview Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-[#001f3f] rounded-xl flex items-center justify-center mx-auto shadow-sm">
                      <ShieldCheck className="w-7 h-7 text-white" />
                    </div>
                  )}

                  <div className="font-extrabold text-sm text-black tracking-tight leading-tight">
                    {loginTitle || 'PaperGen AI Intelligence'}
                  </div>
                  <div className="text-xs font-medium text-slate-600 leading-tight">
                    {loginSubtitle || 'Secure Examination & Formula Extraction Suite'}
                  </div>
                </div>

                {/* Mockup input boxes */}
                <div className="space-y-1.5 pt-1">
                  <div className="h-7 bg-slate-50 border border-slate-300 rounded-lg px-2 flex items-center text-xs text-slate-400">
                    admin@school.local
                  </div>
                  <div className="h-7 bg-slate-50 border border-slate-300 rounded-lg px-2 flex items-center text-xs text-slate-400">
                    ••••••••••••
                  </div>
                  <div className="h-7 bg-[#001f3f] text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-sm">
                    Sign In →
                  </div>
                </div>

                {/* Mockup footer */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100 font-medium">
                  <span>🔒 {loginFooterLeft}</span>
                  <span>🛡️ {loginFooterRight}</span>
                </div>
              </div>

              <div className="text-center">
                <span className="text-xs text-slate-400">
                  Changes take effect immediately across all client devices upon saving.
                </span>
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* User Table */}
      <div className="bg-white border border-[#D1D5DB] rounded-xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
          <h2 className="font-bold text-base text-[#111827]">System Users & Role Assignments</h2>
          <span className="text-xs text-[#6B7280] font-medium font-mono">Total: {users.length} Users</span>
        </div>

        <div className="divide-y divide-[#E5E7EB] text-xs">
          <div className="grid grid-cols-12 py-2.5 text-[#6B7280] font-bold uppercase tracking-wider text-xs bg-[#F9FAFB] px-3 rounded-lg">
            <div className="col-span-3">User Details</div>
            <div className="col-span-2">Assigned Role</div>
            <div className="col-span-2">Status & Security</div>
            <div className="col-span-2">ACL Permissions</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>

          {users.map((u) => {
            const isUserLocked = u.lockedUntil && new Date(u.lockedUntil) > new Date();

            return (
              <div key={u.id} className="grid grid-cols-12 py-3.5 items-center hover:bg-[#F9FAFB] px-3 rounded-lg transition-colors">
                {/* User Details */}
                <div className="col-span-3 space-y-0.5 pr-2">
                  <div className="font-semibold text-[#111827] flex items-center space-x-1.5">
                    <span>{u.fullName}</span>
                    {currentUser?.id === u.id && (
                      <span className="text-xs bg-[#0B1F3A]/5 text-[#0B1F3A] border border-[#0B1F3A]/20 px-1.5 py-0.5 rounded font-mono font-medium">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-[#6B7280] font-mono text-xs truncate">{u.email}</div>
                  {u.failedLoginAttempts > 0 && !isUserLocked && (
                    <div className="text-xs text-amber-400/80 font-mono">
                      Failed attempts: {u.failedLoginAttempts}/5
                    </div>
                  )}
                </div>

                {/* Role */}
                <div className="col-span-2">
                  <span className="font-mono text-xs text-[#0B1F3A] font-semibold bg-[#0B1F3A]/5 border border-[#0B1F3A]/20 px-2.5 py-0.5 rounded-md">
                    {u.role}
                  </span>
                </div>

                {/* Status / Active State / Lockout */}
                <div className="col-span-2 space-y-1">
                  {isUserLocked ? (
                    <div className="inline-flex flex-col">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/40 text-amber-300">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        <span>Locked (5m)</span>
                      </span>
                      <span className="text-xs text-slate-400 font-mono pt-0.5">
                        Until {new Date(u.lockedUntil).toLocaleTimeString()}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(u)}
                      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                        u.isActive
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                          : 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100'
                      }`}
                      title={u.isActive ? 'Click to Deactivate user account' : 'Click to Activate user account'}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                      <span>{u.isActive ? 'Active' : 'Deactivated'}</span>
                    </button>
                  )}
                </div>

                {/* ACL */}
                <div className="col-span-2 text-slate-400">
                  {u.aclRules?.length > 0 ? (
                    <span className="text-emerald-400 font-mono text-xs font-medium">
                      {u.aclRules.length} Custom ACL(s)
                    </span>
                  ) : (
                    <span className="text-slate-500 text-xs">Default Role Scope</span>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="col-span-3 text-right flex items-center justify-end space-x-1.5">
                  {/* Unlock Account button (if locked or has failed attempts) */}
                  {(isUserLocked || u.failedLoginAttempts > 0) && (
                    <button
                      onClick={() => handleUnlockUser(u.id, u.fullName)}
                      className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded-lg text-xs border border-emerald-500/30 font-medium transition-colors flex items-center space-x-1"
                      title="Reset failed login attempts & immediately unlock account"
                    >
                      <Unlock className="w-3 h-3" />
                      <span>Unlock</span>
                    </button>
                  )}

                  {/* Edit Details */}
                  <button
                    onClick={() => openEditModal(u)}
                    className="p-1.5 bg-white hover:bg-[#F3F4F6] text-[#374151] rounded-lg text-xs border border-[#D1D5DB] transition-colors"
                    title="Edit user details & role"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#374151]" />
                  </button>

                  {/* Reset Password */}
                  <button
                    onClick={() => openResetPwdModal(u)}
                    className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs border border-amber-300 transition-colors"
                    title="Reset user password"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                  </button>

                  {/* Set Folder ACL */}
                  <button
                    onClick={() => {
                      setSelectedUser(u);
                      setIsAclModalOpen(true);
                    }}
                    className="px-2 py-1 bg-[#0B1F3A]/5 hover:bg-[#0B1F3A]/10 text-[#0B1F3A] rounded-lg text-xs border border-[#0B1F3A]/20 font-semibold transition-colors"
                    title="Assign granular folder permissions"
                  >
                    ACL
                  </button>

                  {/* Delete User */}
                  <button
                    onClick={() => openDeleteModal(u)}
                    disabled={currentUser?.id === u.id}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs border border-rose-300 transition-colors"
                    title={currentUser?.id === u.id ? 'Cannot delete own account' : 'Delete user account'}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-700" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 ">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl border border-[#D1D5DB] animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
              <h2 className="text-base font-bold text-[#111827] flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-[#0B1F3A]" />
                <span>Create New User Account</span>
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#6B7280] hover:text-[#111827] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#374151] mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Rajesh Sharma"
                  required
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#0B1F3A]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#374151] mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., rajesh@school.local"
                  required
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#0B1F3A]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#374151] mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#0B1F3A]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#374151] mb-1">System Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-[#111827] focus:outline-none focus:border-[#0B1F3A]"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-white text-[#374151] border border-[#D1D5DB] rounded-lg hover:bg-[#F3F4F6] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0B1F3A] hover:bg-[#16365F] text-white rounded-lg font-semibold text-xs shadow-sm"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 ">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl border border-[#D1D5DB] animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
              <h2 className="text-base font-bold text-[#111827] flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-[#0B1F3A]" />
                <span>Edit User: {selectedUser.fullName}</span>
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#6B7280] hover:text-[#111827] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#374151] mb-1">Full Name</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-[#111827] focus:outline-none focus:border-[#0B1F3A]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#374151] mb-1">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-[#111827] focus:outline-none focus:border-[#0B1F3A]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#374151] mb-1">Assigned Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-[#111827] focus:outline-none focus:border-[#0B1F3A]"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#374151] mb-1">Account Status</label>
                <select
                  value={editIsActive ? 'active' : 'disabled'}
                  onChange={(e) => setEditIsActive(e.target.value === 'active')}
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-[#111827] focus:outline-none focus:border-[#0B1F3A]"
                >
                  <option value="active">🟢 Active (Access Granted)</option>
                  <option value="disabled">🔴 Deactivated (Access Suspended)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-white text-[#374151] border border-[#D1D5DB] rounded-lg hover:bg-[#F3F4F6] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0B1F3A] hover:bg-[#16365F] text-white rounded-lg font-semibold text-xs shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {isResetPwdModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 ">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl border border-[#D1D5DB] animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
              <h2 className="text-base font-bold text-[#111827] flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>Reset Password: {selectedUser.fullName}</span>
              </h2>
              <button
                onClick={() => setIsResetPwdModalOpen(false)}
                className="text-[#6B7280] hover:text-[#111827] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#4B5563]">
              Enter a new secure password for <span className="text-[#111827] font-semibold">{selectedUser.email}</span>.
            </p>

            <form onSubmit={handleConfirmResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#374151] mb-1">New Password (Min 6 chars)</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password..."
                    required
                    minLength={6}
                    className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 pr-10 text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#0B1F3A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const randomPwd = `Pass@${Math.floor(100000 + Math.random() * 900000)}`;
                    setNewPassword(randomPwd);
                    setShowPassword(true);
                  }}
                  className="text-xs text-amber-400 hover:underline flex items-center space-x-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Generate Random Password</span>
                </button>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setIsResetPwdModalOpen(false)}
                  className="px-4 py-2 bg-white text-[#374151] border border-[#D1D5DB] rounded-lg hover:bg-[#F3F4F6] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs shadow-sm"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 ">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl border border-[#D1D5DB] animate-scale-up">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-300">
                <AlertTriangle className="w-6 h-6 text-rose-700" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Confirm Account Deletion</h2>
                <p className="text-xs text-slate-700 font-medium">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-[#4B5563] leading-relaxed">
              Are you sure you want to permanently delete the user account for{' '}
              <span className="text-[#111827] font-bold">{selectedUser.fullName}</span> (
              <span className="text-rose-700 font-mono font-medium">{selectedUser.email}</span>)? All assigned ACL rules will also be removed.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-white text-[#374151] border border-[#D1D5DB] rounded-lg hover:bg-[#F3F4F6] text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-white" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set ACL Modal */}
      {isAclModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 ">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl border border-[#D1D5DB] animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
              <h2 className="text-base font-bold text-[#111827] flex items-center space-x-2">
                <FolderTree className="w-4 h-4 text-[#0B1F3A]" />
                <span>Folder ACL for {selectedUser.fullName}</span>
              </h2>
              <button
                onClick={() => setIsAclModalOpen(false)}
                className="text-[#6B7280] hover:text-[#111827] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAcl} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#374151] mb-1">Target Folder Taxonomy</label>
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  required
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-[#111827] focus:outline-none focus:border-[#0B1F3A]"
                >
                  <option value="">Select Folder...</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#374151] mb-1">Permission Level</label>
                <select
                  value={aclPermission}
                  onChange={(e) => setAclPermission(e.target.value)}
                  className="w-full bg-white border border-[#D1D5DB] rounded-lg px-3 py-2 text-[#111827] focus:outline-none focus:border-[#0B1F3A]"
                >
                  <option value="READ">READ (View Questions Only)</option>
                  <option value="WRITE">WRITE (Create & Edit Questions)</option>
                  <option value="ADMIN">ADMIN (Full Folder Control)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setIsAclModalOpen(false)}
                  className="px-4 py-2 bg-white text-[#374151] border border-[#D1D5DB] rounded-lg hover:bg-[#F3F4F6] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0B1F3A] hover:bg-[#16365F] text-white rounded-lg font-semibold text-xs shadow-sm"
                >
                  Save Permission Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
