import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  HelpCircle,
  QrCode,
  FileSpreadsheet,
  Trash2,
  AlertTriangle,
  SplitSquareVertical,
  Scissors,
  ArrowRight,
  Plus,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { StatusBadge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [stats, setStats] = useState({
    documentsCount: 0,
    questionsCount: 0,
    papersCount: 0,
    omrCount: 0,
  });
  const [recentDocs, setRecentDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DIGITAL' | 'SCANNED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<{ id: string; filename: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [docsRes, questionsRes, papersRes, omrRes] = await Promise.all([
        api.get('/documents'),
        api.get('/questions'),
        api.get('/papers'),
        api.get('/omr/evaluations'),
      ]);

      setStats({
        documentsCount: docsRes.data?.documents?.length || 0,
        questionsCount: questionsRes.data?.questions?.length || 0,
        papersCount: papersRes.data?.papers?.length || 0,
        omrCount: omrRes.data?.evaluations?.length || 0,
      });

      setRecentDocs(docsRes.data?.documents || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmDoc) return;
    try {
      setDeleting(true);
      await api.delete(`/documents/${deleteConfirmDoc.id}`);
      setRecentDocs((prev) => prev.filter((d) => d.id !== deleteConfirmDoc.id));
      setStats((prev) => ({
        ...prev,
        documentsCount: Math.max(0, prev.documentsCount - 1),
      }));
      setDeleteConfirmDoc(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Reset to first page when search query or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterQuery, typeFilter]);

  const statCards = [
    {
      title: 'Ingested Documents',
      value: stats.documentsCount,
      icon: FileText,
      description: 'PDFs, Word docs, & scanned textbooks',
      link: '/ingest',
    },
    {
      title: 'Extracted Questions',
      value: stats.questionsCount,
      icon: HelpCircle,
      description: 'Scientific questions with verified formulas',
      link: '/bank',
    },
    {
      title: 'Question Papers',
      value: stats.papersCount,
      icon: FileSpreadsheet,
      description: 'Assembled papers and examination sheets',
      link: '/designer',
    },
    {
      title: 'OMR Evaluated',
      value: stats.omrCount,
      icon: QrCode,
      description: 'Processed bubble answer sheets',
      link: '/omr-eval',
    },
  ];

  const filteredDocs = recentDocs.filter((doc) => {
    const matchesSearch = (doc.filename || '').toLowerCase().includes(filterQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (typeFilter === 'DIGITAL') return doc.isDigital === true;
    if (typeFilter === 'SCANNED') return doc.isDigital === false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / pageSize));
  const paginatedDocs = filteredDocs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 w-full text-left">
      {/* Page Header with Breadcrumbs (Requirement 10) */}
      <div className="bg-white border border-classic-border rounded-card p-6 shadow-classic">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-2 text-xs font-semibold text-classic-text-muted mb-2.5">
          <Link to="/" className="hover:text-classic-navy transition-colors">
            Home
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-classic-navy font-bold">Workspace Dashboard</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <h1 className="text-2xl sm:text-[26px] font-bold text-classic-text-primary tracking-tight leading-snug">
              Document Workspace
            </h1>
            <p className="text-sm text-classic-text-secondary leading-relaxed">
              Extract mathematical formulas, physics equations, chemistry structures, and diagrams from multi-format PDFs with confidence escalation. Design interactive papers and evaluate OMR answer sheets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              size="md"
              loading={isRefreshing}
              onClick={handleRefresh}
              icon={RefreshCw}
              title="Refresh workspace statistics and pipeline"
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/ingest')}
              icon={UploadCloud}
            >
              Ingest Document
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/designer')}
              icon={FileSpreadsheet}
            >
              Paper Designer
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Row (Section 7) with Skeleton State (Requirement 31) */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white border border-classic-border rounded-card p-5 shadow-classic animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 bg-slate-200 rounded" />
                <div className="w-10 h-10 rounded-classic bg-slate-100" />
              </div>
              <div className="mt-3 h-8 w-16 bg-slate-200 rounded" />
              <div className="mt-2 h-3 w-40 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <Link
                key={idx}
                to={card.link}
                className="bg-white border border-classic-border hover:border-classic-border-dark rounded-card p-5 shadow-classic transition-all hover:shadow-md block group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-classic-text-secondary group-hover:text-classic-navy transition-colors">
                    {card.title}
                  </span>
                  <div className="w-10 h-10 rounded-classic bg-slate-100 border border-classic-border-light flex items-center justify-center text-classic-navy group-hover:bg-blue-50 transition-colors">
                    <Icon className="w-5 h-5 text-classic-navy" />
                  </div>
                </div>

                <div className="mt-3 text-3xl font-extrabold text-classic-text-primary font-mono tracking-tight">
                  {card.value}
                </div>

                <p className="mt-1 text-xs text-classic-text-muted leading-tight">
                  {card.description}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {/* Recent Ingested Documents Pipeline */}
      <div className="bg-white border border-classic-border rounded-card shadow-classic overflow-hidden">
        {/* Table Top Bar */}
        <div className="p-5 border-b border-classic-border flex flex-wrap items-center justify-between gap-3 bg-white">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-classic-text-primary">
              Recent Document Pipeline
            </h2>
            <p className="text-xs text-classic-text-muted mt-0.5">
              Sequential page processing status and extraction confidence
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Pills */}
            <div className="flex items-center bg-slate-100 p-1 rounded-classic border border-classic-border text-xs font-semibold">
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  typeFilter === 'ALL'
                    ? 'bg-white text-classic-navy font-bold shadow-xs'
                    : 'text-classic-text-muted hover:text-classic-text-primary'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTypeFilter('DIGITAL')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  typeFilter === 'DIGITAL'
                    ? 'bg-white text-classic-navy font-bold shadow-xs'
                    : 'text-classic-text-muted hover:text-classic-text-primary'
                }`}
              >
                Digital PDFs
              </button>
              <button
                onClick={() => setTypeFilter('SCANNED')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  typeFilter === 'SCANNED'
                    ? 'bg-white text-classic-navy font-bold shadow-xs'
                    : 'text-classic-text-muted hover:text-classic-text-primary'
                }`}
              >
                Scanned
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-classic-text-muted absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter documents..."
                className="h-9 pl-9 pr-3 text-xs bg-slate-50 border border-classic-border rounded-classic focus:outline-none focus:ring-2 focus:ring-blue-700 w-44 sm:w-56 text-classic-text-primary"
              />
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/ingest')}
              icon={Plus}
            >
              Upload
            </Button>
          </div>
        </div>

        {/* Data Table with Skeleton Loader */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-slate-100 animate-pulse"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-classic bg-slate-200" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-48 sm:w-64 bg-slate-200 rounded" />
                      <div className="h-3 w-28 bg-slate-100 rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-16 bg-slate-200 rounded hidden sm:block" />
                  <div className="h-4 w-20 bg-slate-200 rounded hidden md:block" />
                  <div className="h-6 w-20 bg-slate-200 rounded" />
                  <div className="h-8 w-24 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-classic-text-secondary">
                {recentDocs.length === 0
                  ? 'No documents ingested yet. Upload your first PDF to begin.'
                  : 'No documents match your filter criteria.'}
              </p>
              {recentDocs.length === 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/ingest')}
                  icon={UploadCloud}
                >
                  Upload Document
                </Button>
              )}
            </div>
          ) : (
            <>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F3F4F6] border-b-2 border-classic-border-dark text-xs font-bold uppercase tracking-wider text-classic-text-primary">
                    <th className="px-5 py-3.5">Document Name</th>
                    <th className="px-5 py-3.5">Pages</th>
                    <th className="px-5 py-3.5">Type</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-classic-border-light bg-white text-sm">
                  {paginatedDocs.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-classic-surface-hover transition-colors"
                    >
                      <td className="px-5 py-3.5 font-semibold text-classic-text-primary">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-classic bg-slate-100 border border-classic-border-light flex items-center justify-center text-classic-navy shrink-0">
                            <FileText className="w-4 h-4 text-classic-navy" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-classic-text-primary truncate max-w-xs sm:max-w-md">
                              {doc.filename}
                            </div>
                            <div className="text-xs text-classic-text-muted font-mono mt-0.5">
                              SHA: {doc.sha256 ? doc.sha256.substring(0, 12) : '--'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 font-mono text-classic-text-secondary">
                        {doc.pageCount || 1} pages
                      </td>

                      <td className="px-5 py-3.5 text-xs font-medium text-classic-text-secondary">
                        {doc.isDigital ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            Digital PDF
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            Scanned / OCR
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <StatusBadge status={doc.status || 'COMPLETED'} size="sm" />
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/review?docId=${doc.id}`)}
                            icon={SplitSquareVertical}
                          >
                            Review
                          </Button>

                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => navigate(`/snip?docId=${doc.id}&pageNum=1`)}
                            icon={Scissors}
                          >
                            Snip
                          </Button>

                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              setDeleteConfirmDoc({ id: doc.id, filename: doc.filename })
                            }
                            icon={Trash2}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Controls (Requirement 28) */}
              <div className="px-5 py-3.5 border-t border-classic-border flex flex-wrap items-center justify-between gap-3 bg-[#F9FAFB]">
                <div className="text-xs font-medium text-classic-text-secondary">
                  Showing{' '}
                  <span className="font-bold text-classic-text-primary">
                    {filteredDocs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-bold text-classic-text-primary">
                    {Math.min(currentPage * pageSize, filteredDocs.length)}
                  </span>{' '}
                  of{' '}
                  <span className="font-bold text-classic-text-primary">
                    {filteredDocs.length}
                  </span>{' '}
                  documents
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    icon={ChevronLeft}
                  >
                    Previous
                  </Button>
                  <span className="text-xs font-semibold text-classic-text-primary px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    icon={ChevronRight}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal (Requirement 16) */}
      <Dialog
        isOpen={Boolean(deleteConfirmDoc)}
        onClose={() => setDeleteConfirmDoc(null)}
        title="Delete Document"
        subtitle="This action cannot be undone"
        maxWidth="md"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              disabled={deleting}
              onClick={() => setDeleteConfirmDoc(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              onClick={handleConfirmDelete}
              icon={Trash2}
            >
              Confirm Delete
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-classic-text-primary leading-relaxed">
            Are you sure you want to permanently delete{' '}
            <strong className="text-classic-navy">
              "{deleteConfirmDoc?.filename}"
            </strong>
            ?
          </p>
          <p className="text-xs text-classic-text-muted">
            All extracted pages, formulas, bounding boxes, and recognition metadata associated with this document will be permanently removed.
          </p>
        </div>
      </Dialog>
    </div>
  );
};
