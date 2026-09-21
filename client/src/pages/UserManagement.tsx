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

  useEffect(() => {
    fetchUsers();
    fetchFolders();
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
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white">User Management & Access Control (RBAC + ACL)</h1>
            <p className="text-xs text-slate-400">
              Manage accounts, edit credentials, deactivate access, reset passwords, and configure Class / Subject folder permissions
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/20 flex items-center space-x-1.5 transition-all"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ Add New User</span>
        </button>
      </div>

      {/* User Table */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-white">System Users & Role Assignments</h2>
          <span className="text-xs text-slate-400 font-medium">Total: {users.length} Users</span>
        </div>

        <div className="divide-y divide-slate-800 text-xs">
          <div className="grid grid-cols-12 py-2 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
            <div className="col-span-3">User Details</div>
            <div className="col-span-2">Assigned Role</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">ACL Permissions</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>

          {users.map((u) => (
            <div key={u.id} className="grid grid-cols-12 py-3.5 items-center hover:bg-slate-900/40 px-2 rounded-xl transition-colors">
              {/* User Details */}
              <div className="col-span-3 space-y-0.5 pr-2">
                <div className="font-semibold text-slate-200 flex items-center space-x-1.5">
                  <span>{u.fullName}</span>
                  {currentUser?.id === u.id && (
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-mono font-normal">
                      You
                    </span>
                  )}
                </div>
                <div className="text-slate-400 font-mono text-[11px] truncate">{u.email}</div>
              </div>

              {/* Role */}
              <div className="col-span-2">
                <span className="font-mono text-[11px] text-indigo-300 font-semibold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                  {u.role}
                </span>
              </div>

              {/* Status / Active State */}
              <div className="col-span-2">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(u)}
                  className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                    u.isActive
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                  }`}
                  title={u.isActive ? 'Click to Deactivate user account' : 'Click to Activate user account'}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  <span>{u.isActive ? 'Active' : 'Deactivated'}</span>
                </button>
              </div>

              {/* ACL */}
              <div className="col-span-2 text-slate-400">
                {u.aclRules?.length > 0 ? (
                  <span className="text-emerald-400 font-mono text-[11px] font-medium">
                    {u.aclRules.length} Custom ACL(s)
                  </span>
                ) : (
                  <span className="text-slate-500 text-[11px]">Default Role Scope</span>
                )}
              </div>

              {/* Quick Actions */}
              <div className="col-span-3 text-right flex items-center justify-end space-x-1.5">
                {/* Edit Details */}
                <button
                  onClick={() => openEditModal(u)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs border border-slate-700 transition-colors"
                  title="Edit user details & role"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                {/* Reset Password */}
                <button
                  onClick={() => openResetPwdModal(u)}
                  className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-lg text-xs border border-amber-500/30 transition-colors"
                  title="Reset user password"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>

                {/* Set Folder ACL */}
                <button
                  onClick={() => {
                    setSelectedUser(u);
                    setIsAclModalOpen(true);
                  }}
                  className="px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg text-[11px] border border-indigo-500/30 font-medium transition-colors"
                  title="Assign granular folder permissions"
                >
                  ACL
                </button>

                {/* Delete User */}
                <button
                  onClick={() => openDeleteModal(u)}
                  disabled={currentUser?.id === u.id}
                  className="p-1.5 bg-rose-600/10 hover:bg-rose-600/25 text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs border border-rose-500/30 transition-colors"
                  title={currentUser?.id === u.id ? 'Cannot delete own account' : 'Delete user account'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl border border-slate-700 animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-indigo-400" />
                <span>Create New User Account</span>
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g., Rajesh Sharma"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g., rajesh@school.local"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">System Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl border border-slate-700 animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <span>Edit User: {selectedUser.fullName}</span>
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Assigned Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Account Status</label>
                <select
                  value={editIsActive ? 'active' : 'disabled'}
                  onChange={(e) => setEditIsActive(e.target.value === 'active')}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="active">🟢 Active (Access Granted)</option>
                  <option value="disabled">🔴 Deactivated (Access Suspended)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl border border-slate-700 animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Reset Password: {selectedUser.fullName}</span>
              </h2>
              <button
                onClick={() => setIsResetPwdModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Enter a new secure password for <span className="text-white font-medium">{selectedUser.email}</span>.
            </p>

            <form onSubmit={handleConfirmResetPassword} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">New Password (Min 6 chars)</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password..."
                    required
                    minLength={6}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 pr-10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
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
                  className="text-[11px] text-amber-400 hover:underline flex items-center space-x-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Generate Random Password</span>
                </button>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsResetPwdModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold shadow-md shadow-amber-600/30"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl border border-rose-500/30 animate-scale-up">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Confirm Account Deletion</h2>
                <p className="text-xs text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete the user account for{' '}
              <span className="text-white font-bold">{selectedUser.fullName}</span> (
              <span className="text-rose-300 font-mono">{selectedUser.email}</span>)? All assigned ACL rules will also be removed.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-semibold shadow-md shadow-rose-600/30 flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set ACL Modal */}
      {isAclModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl border border-slate-700 animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <FolderTree className="w-4 h-4 text-indigo-400" />
                <span>Folder ACL for {selectedUser.fullName}</span>
              </h2>
              <button
                onClick={() => setIsAclModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAcl} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Target Folder Taxonomy</label>
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
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
                <label className="block font-semibold text-slate-300 mb-1">Permission Level</label>
                <select
                  value={aclPermission}
                  onChange={(e) => setAclPermission(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="READ">READ (View Questions Only)</option>
                  <option value="WRITE">WRITE (Create & Edit Questions)</option>
                  <option value="ADMIN">ADMIN (Full Folder Control)</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAclModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
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
