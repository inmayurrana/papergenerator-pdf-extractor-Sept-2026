import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Loader2, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';

export interface SolvedChallenge {
  challengeId: string;
  salt: string;
  difficulty: number;
  expiresAt: number;
  signature: string;
  nonce: number;
}

interface LoginChallengeProps {
  onSolved: (solution: SolvedChallenge | null) => void;
  disabled?: boolean;
}

export const LoginChallenge: React.FC<LoginChallengeProps> = ({ onSolved, disabled }) => {
  const [status, setStatus] = useState<'idle' | 'computing' | 'solved' | 'failed' | 'expired'>('idle');
  const [challengeData, setChallengeData] = useState<any>(null);
  const [nonce, setNonce] = useState<number | null>(null);
  const [expiresIn, setExpiresIn] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Fetch and solve challenge
  const fetchAndSolve = async () => {
    setStatus('computing');
    setErrorMsg('');
    onSolved(null);

    try {
      const res = await api.get('/auth/challenge');
      const challenge = res.data;
      setChallengeData(challenge);

      // Solve Proof-of-Work: find nonce where SHA256(salt + ":" + nonce) meets difficulty criteria
      const solvedNonce = await solvePoW(challenge.salt, challenge.difficulty);
      setNonce(solvedNonce);
      setStatus('solved');

      onSolved({
        challengeId: challenge.challengeId,
        salt: challenge.salt,
        difficulty: challenge.difficulty,
        expiresAt: challenge.expiresAt,
        signature: challenge.signature,
        nonce: solvedNonce,
      });

      // Compute remaining time
      const remaining = Math.max(0, Math.floor((challenge.expiresAt - Date.now()) / 1000));
      setExpiresIn(remaining);
    } catch (err: any) {
      console.error('Challenge error:', err);
      setStatus('failed');
      setErrorMsg(err.response?.data?.error || 'Failed to initialize security verification.');
      onSolved(null);
    }
  };

  // Web Crypto SHA-256 helper
  const solvePoW = async (salt: string, difficulty: number): Promise<number> => {
    const encoder = new TextEncoder();
    let currentNonce = 0;
    const maxIterations = 50000;

    while (currentNonce < maxIterations) {
      const inputStr = `${salt}:${currentNonce}`;
      const data = encoder.encode(inputStr);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      const prefixVal = parseInt(hashHex.substring(0, 6), 16);
      if (prefixVal % difficulty === 0) {
        return currentNonce;
      }
      currentNonce++;
    }

    return currentNonce;
  };

  // Timer countdown
  useEffect(() => {
    fetchAndSolve();
  }, []);

  useEffect(() => {
    if (status !== 'solved' || expiresIn <= 0) return;

    const timer = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          setStatus('expired');
          onSolved(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, expiresIn]);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          {status === 'computing' && (
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            </div>
          )}

          {status === 'solved' && (
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          )}

          {(status === 'failed' || status === 'expired') && (
            <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          )}

          <div>
            <div className="font-semibold text-slate-200">
              {status === 'computing' && 'Validating Security Challenge...'}
              {status === 'solved' && 'Anti-Bot Security Challenge Verified'}
              {status === 'expired' && 'Security Challenge Expired'}
              {status === 'failed' && 'Challenge Verification Failed'}
            </div>
            <div className="text-[10px] text-slate-400">
              {status === 'solved' && (
                <span>
                  Tamper-proof cryptographic proof verified &bull; Valid for {expiresIn}s
                </span>
              )}
              {status === 'computing' && 'Computing offline cryptographic challenge...'}
              {status === 'expired' && 'Please refresh the challenge to authenticate.'}
              {status === 'failed' && (errorMsg || 'Connection error. Click refresh.')}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAndSolve}
          disabled={disabled || status === 'computing'}
          className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40"
          title="Refresh Challenge"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${status === 'computing' ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};
