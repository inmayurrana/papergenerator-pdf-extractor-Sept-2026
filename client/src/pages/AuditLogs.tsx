import React, { useState, useEffect } from 'react';
import { ScrollText, Filter, Search, Clock, User as UserIcon, Shield, Layers } from 'lucide-react';
import { api } from '../lib/api';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (actionFilter) params.action = actionFilter;
      if (resourceFilter) params.resourceType = resourceFilter;

      const res = await api.get('/audit-logs', { params });
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, resourceFilter]);

  return (
    <div className="space-y-6 w-full">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <ScrollText className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white">System Security & Audit Logging</h1>
            <p className="text-xs text-slate-400">
              Immutable audit trails for authentication, question creation, paper finalization, and OMR reviews
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="CREATE_QUESTION">CREATE_QUESTION</option>
            <option value="UPDATE_QUESTION">UPDATE_QUESTION</option>
            <option value="DELETE_QUESTION">DELETE_QUESTION</option>
            <option value="FINALIZE_PAPER">FINALIZE_PAPER</option>
            <option value="EVALUATE_OMR">EVALUATE_OMR</option>
            <option value="REVIEW_OMR">REVIEW_OMR</option>
            <option value="UNLOAD_MODELS">UNLOAD_MODELS</option>
          </select>

          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Resource Types</option>
            <option value="USER">USER</option>
            <option value="QUESTION">QUESTION</option>
            <option value="PAPER">PAPER</option>
            <option value="PAPER_SNAPSHOT">PAPER_SNAPSHOT</option>
            <option value="OMR_EVALUATION">OMR_EVALUATION</option>
            <option value="DOCUMENT">DOCUMENT</option>
            <option value="SYSTEM">SYSTEM</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h2 className="font-bold text-base text-white">Audit Event Stream ({logs.length})</h2>

        <div className="divide-y divide-slate-800 text-xs">
          <div className="grid grid-cols-12 py-2 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
            <div className="col-span-3">Timestamp</div>
            <div className="col-span-3">User / Actor</div>
            <div className="col-span-3">Action & Resource</div>
            <div className="col-span-3 text-right">Details Snapshot</div>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              {loading ? 'Loading audit records...' : 'No audit records matching filter criteria.'}
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="grid grid-cols-12 py-3 items-center hover:bg-slate-900/30 px-1 rounded-xl transition-colors">
                <div className="col-span-3 font-mono text-slate-400 text-[11px] flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>

                <div className="col-span-3 font-medium text-slate-200">
                  {log.user?.fullName || 'System Event'}
                  <span className="text-[10px] text-slate-400 block font-mono">{log.user?.email || 'SYSTEM'}</span>
                </div>

                <div className="col-span-3 space-x-1.5">
                  <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px]">
                    {log.action}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    [{log.resourceType}]
                  </span>
                </div>

                <div className="col-span-3 text-right font-mono text-[10px] text-slate-400 truncate" title={log.detailsJson}>
                  {log.detailsJson || '{}'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
