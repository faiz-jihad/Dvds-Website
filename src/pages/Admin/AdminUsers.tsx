import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Search,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  User,
  Shield,
  KeyRound,
} from 'lucide-react';
import { AdminDataState } from '../../components/admin/AdminDataState';
import { UserAvatar } from '../../components/common/UserAvatar';
import { adminApi } from '../../lib/adminApi';
import { Profile, UserRole } from '../../types';
import { useAdminAuth } from '../../auth/AdminAuth';
import { useUiStore } from '../../stores/useUiStore';
import { formatDateUK } from '../../lib/formatters';
import { AdminPagination, useAdminPagination } from '../../components/admin/AdminPagination';

export const AdminUsers: React.FC = () => {
  const queryClient = useQueryClient();
  const { user: currentAdmin } = useAdminAuth();
  const addToast = useUiStore((state) => state.addToast);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Fetch users
  const { data: users = [], isLoading, isRefetching, refetch, error } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.getUsers(),
  });

  // Mutation to update user role (RBAC)
  const roleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: UserRole }) => {
      setUpdatingUserId(userId);
      return adminApi.updateUserRole(userId, newRole);
    },
    onSuccess: (updatedProfile) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'operational-activity'] });
      addToast(`Role for ${updatedProfile.email} updated to "${updatedProfile.role.toUpperCase()}"`, 'success');
      setUpdatingUserId(null);
    },
    onError: (err: any) => {
      addToast(err?.message || 'Failed to update user role', 'error');
      setUpdatingUserId(null);
    },
  });

  // Mutation to delete user
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (userId === currentAdmin?.id) {
        throw new Error('You cannot delete your own logged-in administrator account.');
      }
      return adminApi.deleteUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'operational-activity'] });
      addToast('User account deleted successfully', 'success');
    },
    onError: (err: any) => {
      addToast(err?.message || 'Failed to delete user', 'error');
    },
  });

  // Filtered list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const term = searchQuery.toLowerCase();
      const matchesSearch =
        !term ||
        (u.full_name && u.full_name.toLowerCase().includes(term)) ||
        u.email.toLowerCase().includes(term) ||
        (u.phone && u.phone.includes(term));
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, searchQuery]);

  const {
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    paginatedItems: paginatedUsers,
    totalItems: totalUsersCount,
  } = useAdminPagination(filteredUsers, 25);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((u) => u.role === 'admin').length,
      staff: users.filter((u) => u.role === 'staff').length,
      customers: users.filter((u) => u.role === 'customer').length,
    };
  }, [users]);

  const handleRoleChange = (targetUser: Profile, newRole: UserRole) => {
    if (targetUser.id === currentAdmin?.id && newRole !== 'admin') {
      addToast('You cannot change your own administrator role.', 'error');
      return;
    }
    roleMutation.mutate({ userId: targetUser.id, newRole });
  };

  const handleDelete = (targetUser: Profile) => {
    if (targetUser.id === currentAdmin?.id) {
      addToast('Cannot delete your own active administrator account.', 'error');
      return;
    }
    if (window.confirm(`Are you sure you want to remove user "${targetUser.email}"?`)) {
      deleteMutation.mutate(targetUser.id);
    }
  };

  if (error) return <AdminDataState error={error} onRetry={() => refetch()} />;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-dark tracking-tight">
              User & Access Control (RBAC)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-bold">
              {users.length} Registered
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Manage customer accounts, assign administrative privileges, and regulate backoffice access.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 shadow-xs transition cursor-pointer disabled:opacity-60 w-full sm:w-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-brand-blue' : ''}`} />
          <span>Refresh Database</span>
        </button>
      </div>

      {(roleMutation.error || deleteMutation.error) && <AdminDataState error={roleMutation.error || deleteMutation.error} />}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Users</span>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <div className="font-display font-extrabold text-2xl sm:text-3xl text-dark mt-2">{stats.total}</div>
          <div className="text-[11px] text-gray-400 mt-1">All registered accounts</div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Super Admins</span>
            <ShieldAlert className="w-5 h-5 text-purple-600" />
          </div>
          <div className="font-display font-extrabold text-2xl sm:text-3xl text-dark mt-2">{stats.admins}</div>
          <div className="text-[11px] text-gray-500 mt-1">Full backoffice access</div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Store Staff</span>
            <ShieldCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div className="font-display font-extrabold text-2xl sm:text-3xl text-dark mt-2">{stats.staff}</div>
          <div className="text-[11px] text-gray-500 mt-1">Orders & inventory</div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Customers</span>
            <UserCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="font-display font-extrabold text-2xl sm:text-3xl text-dark mt-2">{stats.customers}</div>
          <div className="text-[11px] text-gray-500 mt-1">Storefront buyers</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, phone..."
            className="h-10 w-full rounded-xl border border-gray-200 bg-gray-50/50 pl-10 pr-4 text-xs text-dark placeholder-gray-400 outline-none transition focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/10"
          />
        </div>

        {/* Role Filters Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['all', 'admin', 'staff', 'customer'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer capitalize ${
                roleFilter === r
                  ? 'bg-dark text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-dark'
              }`}
            >
              {r === 'all' ? 'All Roles' : `${r}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-gray-500">Loading user records from PostgreSQL...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="font-display font-bold text-dark text-base">No users found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'No users match your query. Try a different search term or clear the filter.'
                : 'No users currently registered in the database.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 text-[11px] font-mono uppercase tracking-wider text-gray-500">
                  <th className="py-3.5 px-5 font-semibold">User</th>
                  <th className="py-3.5 px-4 font-semibold">Contact</th>
                  <th className="py-3.5 px-4 font-semibold">Current Role</th>
                  <th className="py-3.5 px-4 font-semibold">Joined Date</th>
                  <th className="py-3.5 px-5 font-semibold text-right">RBAC Access Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {paginatedUsers.map((u) => {
                  const isCurrent = u.id === currentAdmin?.id;
                  const isUpdating = updatingUserId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            avatarUrl={u.avatar_url}
                            name={u.full_name}
                            email={u.email}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-dark flex items-center gap-2">
                              <span>{u.full_name || 'No Name Provided'}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 text-[10px] font-mono">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono truncate">{u.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Information */}
                      <td className="py-4 px-4">
                        <div className="text-dark font-medium">{u.email}</div>
                        <div className="text-gray-400 text-[11px] mt-0.5">{u.phone || '—'}</div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 px-4">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Shield className="w-3 h-3 text-purple-600" />
                            <span>Administrator</span>
                          </span>
                        ) : u.role === 'staff' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <KeyRound className="w-3 h-3 text-blue-600" />
                            <span>Staff Member</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            <User className="w-3 h-3 text-gray-500" />
                            <span>Customer</span>
                          </span>
                        )}
                      </td>

                      {/* Joined Date */}
                      <td className="py-4 px-4 font-mono text-gray-500 text-[11px]">
                        {u.created_at ? formatDateUK(u.created_at) : '—'}
                      </td>

                      {/* Action: RBAC Selector */}
                      <td className="py-4 px-5 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          {/* Role select dropdown */}
                          <div className="relative">
                            <select
                              value={u.role}
                              disabled={isCurrent || isUpdating || deleteMutation.isPending}
                              onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                              className="text-xs font-semibold py-1.5 px-3 rounded-xl border border-gray-200 bg-white hover:border-gray-300 text-dark outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 cursor-pointer disabled:opacity-50"
                            >
                              <option value="customer">Customer (Storefront)</option>
                              <option value="staff">Staff (Inventory/Orders)</option>
                              <option value="admin">Administrator (Full Access)</option>
                            </select>
                          </div>

                          {/* Delete button (cannot delete self) */}
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleDelete(u)}
                              title="Delete user account"
                              disabled={deleteMutation.isPending || roleMutation.isPending}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <AdminPagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalUsersCount}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 25, 50, 100]}
            itemLabel="users"
          />
          </>
        )}
      </div>

      {/* RBAC Documentation Guide Box */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800">
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck className="w-6 h-6 text-brand-blue" />
          <h3 className="font-display font-bold text-base text-white">
            Role-Based Access Control (RBAC) Matrix
          </h3>
        </div>
        <p className="text-xs text-slate-400 max-w-2xl leading-relaxed mb-6">
          Roles dictate which operations a user can execute within the DVDs Zone PostgreSQL database via Row-Level Security (RLS).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <span className="font-mono text-purple-300 font-bold uppercase tracking-wider block mb-1">
              Administrator (admin)
            </span>
            <p className="text-slate-300 leading-relaxed">
              Full privileges. Manage taxonomy, edit product catalog, change store settings, review finances, and assign RBAC user roles.
            </p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <span className="font-mono text-blue-300 font-bold uppercase tracking-wider block mb-1">
              Staff Member (staff)
            </span>
            <p className="text-slate-300 leading-relaxed">
              Operational access. Can process orders, dispatch Royal Mail shipments, adjust inventory, and respond to customer messages.
            </p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <span className="font-mono text-emerald-300 font-bold uppercase tracking-wider block mb-1">
              Customer (customer)
            </span>
            <p className="text-slate-300 leading-relaxed">
              Storefront access. Can browse editions, checkout with Stripe UK, manage their saved shipping addresses, and review own order status.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
