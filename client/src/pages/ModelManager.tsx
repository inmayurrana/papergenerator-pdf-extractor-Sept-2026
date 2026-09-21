import React, { useState, useEffect } from 'react';
import {
  Cpu,
  HardDrive,
  Activity,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../lib/api';

export const ModelManager: React.FC = () => {
  const [resources, setResources] = useState<any | null>(null);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [unloading, setUnloading] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchSystemData = async () => {
    setLoading(true);
    try {
      const [resRes, modelsRes] = await Promise.all([
        api.get('/system/resources'),
        api.get('/system/models'),
      ]);
      setResources(resRes.data);
      setModels(modelsRes.data.models || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(fetchSystemData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUnloadModels = async () => {
    setUnloading(true);
    try {
      const res = await api.post('/system/models/unload');
      setMsg(res.data.message || 'All loaded models released from RAM/VRAM.');
      fetchSystemData();
      setTimeout(() => setMsg(''), 4000);
    } catch (err: any) {
      alert(`Unload failed: ${err.message}`);
    } finally {
      setUnloading(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white">System Resource & Model Manager</h1>
            <p className="text-xs text-slate-400">
              Target Hardware: Intel Core i3 8th Gen, 8GB RAM, 4GB VRAM &bull; Dynamic Sequential Loading
            </p>
          </div>
        </div>

        <button
          onClick={handleUnloadModels}
          disabled={unloading}
          className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold px-4 py-2 rounded-xl border border-rose-500/30 flex items-center space-x-1.5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{unloading ? 'Releasing Memory...' : 'Unload All Models & Free RAM'}</span>
        </button>
      </div>

      {msg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 text-center font-medium">
          {msg}
        </div>
      )}

      {/* Hardware Resource Dials */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CPU */}
        <div className="glass-panel p-6 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider">CPU Utilization</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {resources ? `${resources.cpu_percent}%` : '--'}
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                resources && resources.cpu_percent > 85 ? 'bg-rose-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${resources?.cpu_percent || 0}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400">
            {resources?.cpu_count || 4} Logical Cores Available
          </div>
        </div>

        {/* System RAM */}
        <div className="glass-panel p-6 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider">RAM Usage & Target Cap</span>
            <HardDrive className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {resources ? `${(resources.ram_used_mb / 1024).toFixed(1)} / ${(resources.ram_total_mb / 1024).toFixed(1)} GB` : '--'}
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                resources && resources.ram_percent > 80 ? 'bg-amber-500' : 'bg-violet-500'
              }`}
              style={{ width: `${resources?.ram_percent || 0}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400">
            Target Cap: <span className="font-mono text-indigo-300">5.0 GB</span> &bull; Free: <span className="font-mono text-emerald-400">{resources ? (resources.ram_available_mb / 1024).toFixed(1) : 0} GB</span>
          </div>
        </div>

        {/* GPU / VRAM */}
        <div className="glass-panel p-6 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider">GPU & Concurrency Lock</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {resources?.gpu?.available ? `${resources.gpu.vram_used_mb} MB` : 'CPU Mode'}
          </div>
          <div className="text-[11px] text-slate-400 space-y-1">
            <div>Device: <span className="text-slate-200 font-medium">{resources?.gpu?.name || 'CPU Integrated'}</span></div>
            <div>Max Heavy Jobs: <span className="font-mono text-indigo-300 font-bold">{resources?.max_heavy_jobs || 1}</span> &bull; Sequential Lock Active</div>
          </div>
        </div>
      </div>

      {/* Engine Adapters Table */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-white">Pluggable Engine Adapter Registry</h2>
          <span className="text-xs text-slate-400 font-mono">Idle Unload Timeout: 180s</span>
        </div>

        <div className="divide-y divide-slate-800 text-xs">
          <div className="grid grid-cols-12 py-2 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
            <div className="col-span-4">Engine Name & Capabilities</div>
            <div className="col-span-2">Version</div>
            <div className="col-span-2">RAM / VRAM</div>
            <div className="col-span-2">Health</div>
            <div className="col-span-2 text-right">Status</div>
          </div>

          {models.map((m, idx) => (
            <div key={idx} className="grid grid-cols-12 py-3.5 items-center hover:bg-slate-900/30 px-1 rounded-xl transition-colors">
              <div className="col-span-4 space-y-0.5">
                <div className="font-semibold text-slate-200">{m.name}</div>
                <div className="flex flex-wrap gap-1">
                  {(m.capabilities || []).map((c: string, cIdx: number) => (
                    <span key={cIdx} className="text-[9px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="col-span-2 font-mono text-slate-400">{m.version}</div>

              <div className="col-span-2 font-mono text-slate-300">
                ~{m.ram_req_mb} MB {m.vram_req_mb > 0 ? `+ ${m.vram_req_mb} MB VRAM` : ''}
              </div>

              <div className="col-span-2">
                <span className={`inline-flex items-center space-x-1 font-semibold ${
                  m.health === 'HEALTHY' ? 'text-emerald-400' : 'text-slate-400'
                }`}>
                  {m.health === 'HEALTHY' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>{m.health}</span>
                </span>
              </div>

              <div className="col-span-2 text-right">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                  m.is_enabled
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  {m.is_enabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
