import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertTriangle,
  Clock,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/authStore';
import { ScientificBackground } from '../components/ScientificBackground';

interface CaptchaData {
  challengeId: string;
  prompt: string;
  token: string;
  expiresAt: number;
}

interface BrandingData {
  title: string;
  subtitle: string;
  logoUrl: string;
  footerLeft: string;
  footerRight: string;
}

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // Dynamic Login Page Branding & Customization
  const [branding, setBranding] = useState<BrandingData>({
    title: 'PaperGen AI Intelligence',
    subtitle: 'Secure Examination & Formula Extraction Suite',
    logoUrl: '',
    footerLeft: '256-bit Encrypted Session',
    footerRight: 'Offline-Ready On-Premises Architecture',
  });

  // CAPTCHA State
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaChallenge, setCaptchaChallenge] = useState<CaptchaData | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

  // 5-minute lockout state
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const { user, setAuth } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const navigate = useNavigate();

  // Load custom branding on mount
  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const res = await api.get('/security/branding');
        if (res.data) {
          setBranding(res.data);
        }
      } catch (e) {
        // Fallback to defaults
      }
    };
    fetchBranding();
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (!isLocked || lockoutSeconds <= 0) return;

    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          setIsLocked(false);
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLocked, lockoutSeconds]);

  const fetchCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const res = await api.get('/auth/captcha/challenge');
      setCaptchaChallenge(res.data);
      setCaptchaAnswer('');
    } catch (e) {
      console.error('Failed to load CAPTCHA challenge', e);
    } finally {
      setCaptchaLoading(false);
    }
  };

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    setLoading(true);
    setError('');

    try {
      const payload: any = {
        email: email.trim(),
        password,
        rememberDevice,
      };

      if (captchaRequired && captchaChallenge) {
        payload.captchaId = captchaChallenge.challengeId;
        payload.captchaAnswer = captchaAnswer.trim();
        payload.captchaToken = captchaChallenge.token;
        payload.captchaExpiresAt = captchaChallenge.expiresAt;
      }

      const res = await api.post('/auth/login', payload);
      setAuth(
        res.data.user,
        res.data.token,
        res.data.refreshToken,
        res.data.permissions || [],
        res.data.sessionId
      );
      navigate('/');
    } catch (err: any) {
      const status = err.response?.status;
      const data = err.response?.data;

      if (status === 423 || data?.isLocked) {
        setIsLocked(true);
        const secs = data?.remainingSeconds || 300;
        setLockoutSeconds(secs);
        setError(data?.error || 'Account locked for 5 minutes due to multiple failed login attempts.');
      } else {
        setError(data?.error || 'Login failed. Please check your credentials.');
        if (data?.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }

        // Trigger CAPTCHA if required by server response
        if (data?.captchaRequired) {
          setCaptchaRequired(true);
          if (data?.challenge) {
            setCaptchaChallenge(data.challenge);
          } else {
            fetchCaptcha();
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const res = await api.get('/auth/google/url');
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (e: any) {
      setError('Google Single Sign-On is currently unavailable in this environment.');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#F5F7FA] overflow-hidden px-4 py-8">
      {/* Dynamic Scientific Background with Multi-Directional Floating Motion, Varied Scales, Colors & Interactive Mouse Repulsion */}
      <ScientificBackground />
      {/* Admin Quick Branding Shortcut (if already logged in as Admin) */}
      {isAdmin && (
        <button
          onClick={() => navigate('/users')}
          className="absolute top-4 right-4 z-20 text-xs font-semibold text-[#0B1F3A] bg-white hover:bg-[#F3F4F6] border border-[#D1D5DB] px-3.5 py-2 rounded-md flex items-center space-x-1.5 shadow-sm transition-colors"
          title="Configure login page title, subtitle, and custom logo"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Edit Login Branding</span>
        </button>
      )}

      {/* Login Card Container */}
      <div className="relative z-10 w-full max-w-[460px] mx-auto">
        <div className="rounded-xl border border-[#D1D5DB] bg-white shadow-lg overflow-hidden">
          {/* Header */}
          <div className="border-b border-[#E5E7EB] px-8 py-7 text-center bg-white">
            {branding.logoUrl ? (
              <div className="mx-auto mb-5 flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-2xl bg-white border border-[#D1D5DB] p-2.5 overflow-hidden shadow-sm transition-transform hover:scale-105">
                <img
                  src={branding.logoUrl}
                  alt="School/App Logo"
                  className="w-full h-full object-contain filter drop-shadow-xs"
                />
              </div>
            ) : (
              <div className="mx-auto mb-5 flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-2xl bg-[#0B1F3A] text-3xl sm:text-4xl font-extrabold text-white shadow-md">
                SD
              </div>
            )}

            <h1
              style={{ color: '#0B1F3A' }}
              className="text-lg sm:text-xl font-bold tracking-tight text-[#0B1F3A] uppercase leading-snug"
            >
              {branding.title || 'Scientific Document Intelligence'}
            </h1>

            <p
              style={{ color: '#4B5563' }}
              className="mt-1.5 text-xs sm:text-sm font-medium text-[#4B5563]"
            >
              {branding.subtitle || 'Secure Examination & Formula Extraction Suite'}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-5 p-8 bg-white">
            {/* Account Lockout Banner */}
            {isLocked && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-md text-sm space-y-1.5">
                <div className="flex items-center space-x-2 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>Account Temporarily Locked (5 Minutes)</span>
                </div>
                <p className="text-amber-800 text-xs">
                  Multiple consecutive failed login attempts detected. To protect your account, logins are temporarily suspended.
                </p>
                <div className="flex items-center space-x-2 font-mono text-amber-950 font-bold text-xs pt-1">
                  <Clock className="w-3.5 h-3.5 text-amber-800" />
                  <span>Unlocks in: {formatCountdown(lockoutSeconds)}</span>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {!isLocked && error && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-md text-red-900 text-sm space-y-1">
                <div className="font-semibold">{error}</div>
                {remainingAttempts !== null && (
                  <div className="text-xs text-red-800">
                    Notice: Exceeding maximum failed attempts will lock your account for 5 minutes.
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Field */}
              <div>
                <label
                  style={{ color: '#111827' }}
                  className="mb-1.5 block text-sm font-semibold text-[#111827]"
                >
                  Email or Username
                </label>
                <div className="relative flex items-center">
                  <div className="pointer-events-none absolute left-3.5 flex items-center justify-center text-[#6B7280]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLocked}
                    required
                    style={{ paddingLeft: '2.75rem', height: '44px' }}
                    className="classic-input w-full"
                    placeholder="Enter email or username"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    style={{ color: '#111827' }}
                    className="block text-sm font-semibold text-[#111827]"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => alert('Please contact your administrator to reset your password.')}
                    className="text-xs sm:text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <div className="pointer-events-none absolute left-3.5 flex items-center justify-center text-[#6B7280]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLocked}
                    required
                    style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem', height: '44px' }}
                    className="classic-input w-full"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 p-1 text-[#6B7280] hover:text-[#111827] flex items-center justify-center"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Adaptive Local Cryptographic CAPTCHA */}
              {captchaRequired && captchaChallenge && (
                <div className="p-3 bg-[#F3F4F6] border border-[#D1D5DB] rounded-md space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-[#111827]">
                      Security Verification (CAPTCHA)
                    </span>
                    <button
                      type="button"
                      onClick={fetchCaptcha}
                      disabled={captchaLoading}
                      className="text-xs text-[#0B1F3A] font-semibold flex items-center space-x-1 hover:underline"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${captchaLoading ? 'animate-spin' : ''}`} />
                      <span>New Challenge</span>
                    </button>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-[#E5E7EB] text-center font-mono font-bold text-base text-[#111827]">
                    {captchaChallenge.prompt}
                  </div>
                  <input
                    type="text"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    placeholder="Enter solution"
                    required
                    style={{ height: '42px' }}
                    className="classic-input text-center font-mono w-full"
                  />
                </div>
              )}

              {/* Remember Device Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-sm text-[#4B5563] cursor-pointer">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="h-4 w-4 rounded border-[#D1D5DB] text-[#0B1F3A] focus:ring-[#0B1F3A]"
                  />
                  <span>Remember device</span>
                </label>
              </div>

              {/* Sign In Primary Action Button */}
              <button
                type="submit"
                disabled={loading || isLocked}
                style={{ height: '44px' }}
                className="classic-button classic-button-primary w-full text-sm font-semibold flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </>
                )}
              </button>
            </form>

            {/* SSO Divider */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#D1D5DB]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs uppercase text-[#6B7280] font-semibold">
                  OR
                </span>
              </div>
            </div>

            {/* Google SSO Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLocked}
              style={{ height: '44px' }}
              className="classic-button classic-button-secondary w-full text-sm font-medium flex items-center justify-center gap-3 border border-[#D1D5DB] bg-white hover:bg-[#F9FAFB] text-[#111827]"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="border-t border-[#E5E7EB] bg-[#F9FAFB] px-8 py-4 text-center text-xs text-[#6B7280]">
            {branding.footerLeft || 'Authorized users only'} &bull; {branding.footerRight || '256-bit Encrypted Session'}
          </div>
        </div>
      </div>
    </div>
  );
};
