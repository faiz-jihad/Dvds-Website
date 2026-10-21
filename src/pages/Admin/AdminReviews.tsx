import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Star,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  Search,
  RefreshCw,
  Trash2,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  Eye,
  Film,
  Check,
  X,
  Filter,
} from 'lucide-react';
import { adminApi } from '../../lib/adminApi';
import { Review, ReviewStatus } from '../../types';
import { StarRating } from '../../components/common/StarRating';
import { AdminDataState } from '../../components/admin/AdminDataState';
import { AdminPagination, useAdminPagination } from '../../components/admin/AdminPagination';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { formatDateUK, formatDateTimeUK, cn } from '../../lib/formatters';
import { useUiStore } from '../../stores/useUiStore';

export const AdminReviews: React.FC = () => {
  const queryClient = useQueryClient();
  const addToast = useUiStore((state) => state.addToast);

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [moderationNote, setModerationNote] = useState('');
  const [deleteConfirmReview, setDeleteConfirmReview] = useState<Review | null>(null);

  // 1. Fetch reviews
  const reviewsQuery = useQuery({
    queryKey: ['admin', 'reviews', statusFilter, searchQuery],
    queryFn: () =>
      adminApi.getAdminReviews({
        status: statusFilter,
        search: searchQuery,
        limit: 100,
      }),
    refetchInterval: 30_000,
  });

  // 2. Fetch KPI stats
  const statsQuery = useQuery({
    queryKey: ['admin', 'reviews-stats'],
    queryFn: adminApi.getReviewStats,
    refetchInterval: 30_000,
  });

  const rawReviews = reviewsQuery.data?.reviews || [];
  const stats = statsQuery.data || { total: 0, pending: 0, approved: 0, rejected: 0 };

  // 3. Client-side secondary filters (rating & verified status)
  const filteredReviews = useMemo(() => {
    let list = rawReviews;

    if (ratingFilter !== 'all') {
      list = list.filter((r) => r.rating === ratingFilter);
    }

    if (verifiedOnly) {
      list = list.filter((r) => r.is_verified_purchase);
    }

    return list;
  }, [rawReviews, ratingFilter, verifiedOnly]);

  const {
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    paginatedItems,
    totalItems,
  } = useAdminPagination(filteredReviews, 15);

  // 4. Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: ReviewStatus; note?: string }) =>
      adminApi.updateReviewStatus(id, status, note),
    onSuccess: (updatedReview) => {
      addToast(
        updatedReview.status === 'approved'
          ? `Review by "${updatedReview.reviewer_name}" approved.`
          : `Review marked as ${updatedReview.status}.`,
        'success'
      );
      setSelectedReview(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews-stats'] });
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['store', 'products'] });
    },
    onError: (err: any) => {
      addToast(err.message || 'Could not update review status.', 'error');
    },
  });

  // 5. Delete review mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteReview(id),
    onSuccess: () => {
      addToast('Review deleted successfully.', 'success');
      setDeleteConfirmReview(null);
      if (selectedReview?.id === deleteConfirmReview?.id) {
        setSelectedReview(null);
      }
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'reviews-stats'] });
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['store', 'products'] });
    },
    onError: (err: any) => {
      addToast(err.message || 'Could not delete review.', 'error');
    },
  });

  const handleQuickApprove = (review: Review, e?: React.MouseEvent) => {
    e?.stopPropagation();
    updateStatusMutation.mutate({ id: review.id, status: 'approved' });
  };

  const handleQuickReject = (review: Review, e?: React.MouseEvent) => {
    e?.stopPropagation();
    updateStatusMutation.mutate({ id: review.id, status: 'rejected' });
  };

  const openDetailModal = (review: Review) => {
    setSelectedReview(review);
    setModerationNote(review.moderation_note || '');
  };

  if (reviewsQuery.isLoading && !reviewsQuery.data) {
    return <AdminDataState loading={true} />;
  }

  if (reviewsQuery.isError) {
    return (
      <AdminDataState
        error={reviewsQuery.error}
        onRetry={() => {
          reviewsQuery.refetch();
          statsQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-brand-blue font-semibold">
              Catalogue Governance
            </span>
            {stats.pending > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 animate-pulse">
                <Clock className="w-3 h-3" />
                {stats.pending} Pending Action
              </span>
            )}
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-dark dark:text-white tracking-tight mt-1">
            Customer Reviews &amp; Moderation
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Audit user submissions, verify buyer credentials, and approve ratings displayed across the storefront.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              reviewsQuery.refetch();
              statsQuery.refetch();
            }}
            disabled={reviewsQuery.isRefetching}
            className="inline-flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', reviewsQuery.isRefetching && 'animate-spin')} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total */}
        <div className="bg-white dark:bg-[#0E131F] rounded-xl p-4 border border-gray-200 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Reviews</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Star className="w-4 h-4 fill-current" />
            </div>
          </div>
          <span className="text-2xl font-black font-mono text-dark dark:text-white mt-2 block">
            {stats.total}
          </span>
          <span className="text-[11px] text-gray-400 mt-1 block">All recorded submissions</span>
        </div>

        {/* Pending */}
        <div className="bg-white dark:bg-[#0E131F] rounded-xl p-4 border border-amber-500/30 dark:border-amber-500/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-500">Pending Moderation</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black font-mono text-amber-500 mt-2 block">
            {stats.pending}
          </span>
          <span className="text-[11px] text-gray-400 mt-1 block">Requires staff approval</span>
        </div>

        {/* Approved */}
        <div className="bg-white dark:bg-[#0E131F] rounded-xl p-4 border border-gray-200 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Approved</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2 block">
            {stats.approved}
          </span>
          <span className="text-[11px] text-gray-400 mt-1 block">Published on DVD pages</span>
        </div>

        {/* Rejected */}
        <div className="bg-white dark:bg-[#0E131F] rounded-xl p-4 border border-gray-200 dark:border-white/10 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-500">Rejected</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black font-mono text-rose-500 mt-2 block">
            {stats.rejected}
          </span>
          <span className="text-[11px] text-gray-400 mt-1 block">Hidden from storefront</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-[#0E131F] rounded-xl p-4 border border-gray-200 dark:border-white/10 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {(
              [
                { label: 'All Reviews', value: 'all', count: stats.total },
                { label: 'Pending', value: 'pending', count: stats.pending },
                { label: 'Approved', value: 'approved', count: stats.approved },
                { label: 'Rejected', value: 'rejected', count: stats.rejected },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setStatusFilter(tab.value);
                  setCurrentPage(1);
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5',
                  statusFilter === tab.value
                    ? 'bg-brand-blue text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full font-mono text-[10px]',
                    statusFilter === tab.value
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search product, author, review..."
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-[#141A26] text-xs text-dark dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-brand-blue transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Secondary Filters: Rating & Verified Purchase */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100 dark:border-white/10 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-semibold">Rating:</span>
            <select
              value={ratingFilter}
              onChange={(e) => {
                const val = e.target.value;
                setRatingFilter(val === 'all' ? 'all' : Number(val));
                setCurrentPage(1);
              }}
              className="h-8 px-2.5 rounded-lg border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-[#141A26] text-xs text-dark dark:text-white focus:outline-none focus:border-brand-blue transition"
            >
              <option value="all">All Stars (1–5)</option>
              <option value="5">5 Stars only</option>
              <option value="4">4 Stars only</option>
              <option value="3">3 Stars only</option>
              <option value="2">2 Stars only</option>
              <option value="1">1 Star only</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => {
                setVerifiedOnly(e.target.checked);
                setCurrentPage(1);
              }}
              className="rounded border-gray-300 dark:border-white/20 text-brand-blue focus:ring-brand-blue"
            />
            <span className="text-gray-600 dark:text-gray-300 font-medium">
              Verified Purchases Only
            </span>
          </label>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white dark:bg-[#0E131F] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-xs">
        {paginatedItems.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-dark dark:text-white mb-1">No Reviews Found</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              There are no reviews matching your current status, rating, or search filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-[#141A26] border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 uppercase font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4">Product Title</th>
                  <th className="py-3 px-4">Reviewer</th>
                  <th className="py-3 px-4">Rating &amp; Headline</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {paginatedItems.map((review) => {
                  const isPending = review.status === 'pending';
                  const isApproved = review.status === 'approved';
                  const isRejected = review.status === 'rejected';

                  return (
                    <tr
                      key={review.id}
                      onClick={() => openDetailModal(review)}
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer transition"
                    >
                      {/* Product */}
                      <td className="py-3.5 px-4 min-w-[200px] max-w-[260px]">
                        <div className="flex items-center gap-3">
                          {review.product?.cover_image_url ? (
                            <img
                              src={review.product.cover_image_url}
                              alt=""
                              className="w-9 h-12 object-cover rounded shrink-0 bg-gray-100 dark:bg-white/5"
                            />
                          ) : (
                            <div className="w-9 h-12 rounded bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                              <Film className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold text-dark dark:text-white line-clamp-1 block">
                              {review.product?.title || 'DVD Product'}
                            </span>
                            {review.product?.sku && (
                              <span className="font-mono text-[10px] text-gray-400 block">
                                SKU: {review.product.sku}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Reviewer */}
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div>
                          <span className="font-medium text-dark dark:text-white block">
                            {review.reviewer_name}
                          </span>
                          {review.is_verified_purchase ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                              <ShieldCheck className="w-3 h-3 shrink-0" />
                              <span>Verified Buyer</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-400 font-mono">Unverified</span>
                          )}
                        </div>
                      </td>

                      {/* Rating & Content */}
                      <td className="py-3.5 px-4 min-w-[240px] max-w-[320px]">
                        <div className="space-y-1">
                          <StarRating rating={review.rating} size="xs" />
                          <span className="font-bold text-dark dark:text-white line-clamp-1 block">
                            {review.title}
                          </span>
                          <p className="text-gray-500 dark:text-gray-400 line-clamp-1 text-[11px]">
                            {review.comment}
                          </p>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                        {formatDateUK(review.created_at)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider',
                            isPending && 'bg-amber-500/10 text-amber-500 border border-amber-500/25',
                            isApproved && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
                            isRejected && 'bg-rose-500/10 text-rose-500 border border-rose-500/25'
                          )}
                        >
                          {isPending && <Clock className="w-3 h-3" />}
                          {isApproved && <Check className="w-3 h-3" />}
                          {isRejected && <X className="w-3 h-3" />}
                          <span>{review.status}</span>
                        </span>
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {!isApproved && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickApprove(review, e)}
                              disabled={updateStatusMutation.isPending}
                              title="Approve Review"
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {!isRejected && (
                            <button
                              type="button"
                              onClick={(e) => handleQuickReject(review, e)}
                              disabled={updateStatusMutation.isPending}
                              title="Reject Review"
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmReview(review);
                            }}
                            title="Delete Review"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalItems > pageSize && (
          <div className="p-4 border-t border-gray-200 dark:border-white/10">
            <AdminPagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>

      {/* Detail & Moderation Modal */}
      {selectedReview && (
        <Modal
          isOpen={Boolean(selectedReview)}
          onClose={() => setSelectedReview(null)}
          title="Review Moderation Details"
          maxWidth="lg"
        >
          <div className="space-y-6 text-xs">
            {/* Product & User Overview */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-gray-50 dark:bg-[#141A26] border border-gray-200 dark:border-white/10">
              <div>
                <span className="text-[10px] font-mono uppercase text-gray-400 block">Product</span>
                <span className="font-bold text-sm text-dark dark:text-white block mt-0.5">
                  {selectedReview.product?.title || 'DVD Product'}
                </span>
                {selectedReview.product?.slug && (
                  <Link
                    to={`/product/${selectedReview.product.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-[11px] text-brand-blue hover:underline mt-1"
                  >
                    <span>View on Storefront</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono uppercase text-gray-400 block">Reviewer</span>
                <span className="font-semibold text-dark dark:text-white block mt-0.5">
                  {selectedReview.reviewer_name}
                </span>
                {selectedReview.is_verified_purchase ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-0.5">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verified Purchase</span>
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400 font-mono">Unverified</span>
                )}
              </div>
            </div>

            {/* Content Card */}
            <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0E131F] space-y-3">
              <div className="flex items-center justify-between">
                <StarRating rating={selectedReview.rating} size="sm" />
                <span className="font-mono text-gray-400 text-[11px]">
                  Submitted: {formatDateTimeUK(selectedReview.created_at)}
                </span>
              </div>

              <h4 className="font-display font-bold text-base text-dark dark:text-white">
                {selectedReview.title}
              </h4>

              <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line font-normal">
                {selectedReview.comment}
              </p>
            </div>

            {/* Moderation Notes Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Internal Moderation Note
              </label>
              <textarea
                rows={2}
                value={moderationNote}
                onChange={(e) => setModerationNote(e.target.value)}
                placeholder="Optional internal record (e.g. 'Verified authentic pressing review', 'Rejected: contains profanity')..."
                className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-[#141A26] text-xs text-dark dark:text-white focus:outline-none focus:border-brand-blue"
              />
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setDeleteConfirmReview(selectedReview)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 font-semibold transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Review</span>
              </button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    updateStatusMutation.mutate({
                      id: selectedReview.id,
                      status: 'rejected',
                      note: moderationNote,
                    })
                  }
                  disabled={updateStatusMutation.isPending || selectedReview.status === 'rejected'}
                  className="text-xs"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  <span>Reject</span>
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    updateStatusMutation.mutate({
                      id: selectedReview.id,
                      status: 'approved',
                      note: moderationNote,
                    })
                  }
                  disabled={updateStatusMutation.isPending || selectedReview.status === 'approved'}
                  className="text-xs font-bold"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  <span>Approve &amp; Publish</span>
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmReview && (
        <Modal
          isOpen={Boolean(deleteConfirmReview)}
          onClose={() => setDeleteConfirmReview(null)}
          title="Delete Customer Review"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-center text-gray-600 dark:text-gray-300">
              Are you sure you want to permanently delete this review by{' '}
              <strong>&ldquo;{deleteConfirmReview.reviewer_name}&rdquo;</strong>?
              This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeleteConfirmReview(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate(deleteConfirmReview.id)}
                disabled={deleteMutation.isPending}
                className="font-bold"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminReviews;
