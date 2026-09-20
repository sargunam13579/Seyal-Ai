import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  X,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import appLogo from '../../assets/app-logo.png';
import { isValidGmail } from '../../utils/emailValidation';

export interface LoginPageProps {
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ isModal = false, onClose, onSuccess }) => {
  const {
    signIn,
    signUp,
    verifyOtp,
    signInWithOtp,
    checkUserExists,
    setPassword: updateAccountPassword,
    resetPassword,
    signInWithGoogle,
  } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showTryAnotherWay, setShowTryAnotherWay] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // OTP Verification State
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSendOtpLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const validation = isValidGmail(cleanEmail);
    if (!validation.isValid) {
      setError(validation.error || 'Please enter your @gmail.com address above first.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: otpErr } = await signInWithOtp(cleanEmail);
      if (otpErr) {
        // If Supabase says "you can only request this after X seconds", a code was already sent moments ago!
        if (
          otpErr.message.toLowerCase().includes('second') ||
          otpErr.message.toLowerCase().includes('security') ||
          otpErr.message.toLowerCase().includes('rate limit')
        ) {
          setIsVerifyingOtp(true);
          setResendCooldown(15);
          setMessage(`A verification code was sent to ${cleanEmail}. Enter it below.`);
        } else {
          setError(otpErr.message);
        }
      } else {
        setIsVerifyingOtp(true);
        setResendCooldown(30);
        setMessage(`A verification code has been sent to ${cleanEmail}. Enter it below.`);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const validation = isValidGmail(cleanEmail);
    if (!validation.isValid) {
      setError(validation.error || 'Please enter your @gmail.com address above first.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: resetErr } = await resetPassword(cleanEmail);
      if (resetErr) {
        setError(resetErr.message || 'Failed to send password reset link.');
      } else {
        setMessage(`Password reset email sent to ${cleanEmail}. Please check your Gmail.`);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Check URL parameters for OAuth errors or messages
  useEffect(() => {
    try {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const searchParams = new URLSearchParams(window.location.search);
      
      const errorDesc = hashParams.get('error_description') || searchParams.get('error_description');
      const errorCode = hashParams.get('error_code') || searchParams.get('error');
      
      if (errorDesc) {
        setError(decodeURIComponent(errorDesc).replace(/\+/g, ' '));
      } else if (errorCode) {
        setError(`Google Authentication Error: ${errorCode}`);
      }
    } catch (e) {
      console.error('Failed to parse URL auth parameters:', e);
    }
  }, []);

  const handleGoogleSignIn = async () => {
    setError(null);
    setMessage(null);
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setMessage(null);

    const cleanOtp = otpCode.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setError('Please enter the verification code.');
      return;
    }

    setLoading(true);
    try {
      const { error: otpError } = await verifyOtp(email.trim().toLowerCase(), cleanOtp);
      if (otpError) {
        setError('Incorrect or expired OTP code. Please check your Gmail and try again.');
      } else {
        // Sync entered password to Supabase user account
        if (password) {
          await updateAccountPassword(password).catch(() => {});
        }
        setIsVerifyingOtp(false);
        onSuccess?.();
        onClose?.();
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setMessage(null);
    try {
      const { error: resendErr } = await signInWithOtp(email.trim().toLowerCase());
      if (resendErr) {
        setError(resendErr.message || 'Failed to resend verification code.');
      } else {
        setMessage('A fresh verification code has been sent to your Gmail inbox.');
        setResendCooldown(30);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to resend verification code.');
    }
  };

  const handleCheckConfirmed = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (password) {
        const { error: signInErr } = await signIn(cleanEmail, password);
        if (!signInErr) {
          onSuccess?.();
          onClose?.();
          return;
        }
      }
      setError('Not yet verified. Please enter the verification code from your email below.');
    } catch (err: any) {
      setError(err?.message || 'Failed to verify confirmation status.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setShowTryAnotherWay(false);

    const cleanEmail = email.trim().toLowerCase();

    // 1. Strict Gmail Domain & Syntax Validation
    const validation = isValidGmail(cleanEmail);
    if (!validation.isValid) {
      setError(validation.error || 'Please enter a valid @gmail.com address.');
      return;
    }

    if (isSignUp) {
      // -----------------------------------------------------------------
      // IN THE ACCOUNT CREATE:
      // after filling gmail, password, confirm password:
      // -----------------------------------------------------------------
      if (!password) {
        setError('Please enter your password.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      // if passwor and confirm password is not correct: show password mach agala (in english)
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      setLoading(true);
      try {
        // check if gmail in db
        const exists = await checkUserExists(cleanEmail);
        if (exists) {
          // else: goto sign in page. password textbox empty ah erukkanum. and continue sign in process.
          setIsSignUp(false);
          setPassword('');
          setConfirmPassword('');
          setShowTryAnotherWay(false);
          setMessage('This Gmail is already registered. Please enter your password to sign in.');
          return;
        }

        // if gmail not in: send otp (to create account)
        const { error: signUpError } = await signUp(cleanEmail, password);

        if (signUpError) {
          const isAlreadyRegistered =
            signUpError.message.toLowerCase().includes('already registered') ||
            signUpError.message.toLowerCase().includes('already exists') ||
            signUpError.message.toLowerCase().includes('duplicate');

          if (isAlreadyRegistered) {
            setIsSignUp(false);
            setPassword('');
            setConfirmPassword('');
            setShowTryAnotherWay(false);
            setMessage('This Gmail is already registered. Please enter your password to sign in.');
            return;
          }

          // Try signInWithOtp as fallback
          const { error: otpFallbackErr } = await signInWithOtp(cleanEmail, true);
          if (!otpFallbackErr) {
            setIsVerifyingOtp(true);
            setResendCooldown(30);
            setMessage(`Verification code sent to ${cleanEmail}. Enter OTP below to create your account.`);
            return;
          }

          if (signUpError.message.toLowerCase().includes('confirmation email')) {
            setError(
              'SMTP Error: Supabase could not send confirmation email. (If using Resend in sandbox/test mode, only owner email can receive. In Supabase Settings -> SMTP Settings, disable Custom SMTP to send to all Gmails).'
            );
          } else {
            setError(signUpError.message);
          }
          return;
        }

        // New user: Send OTP to create account
        setIsVerifyingOtp(true);
        setResendCooldown(30);
        setMessage(`Verification code sent to ${cleanEmail}. Enter OTP below to create your account.`);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred during account creation.');
      } finally {
        setLoading(false);
      }
    } else {
      // -----------------------------------------------------------------
      // IN THE SIGN IN:
      // after filling gmail and password:
      // -----------------------------------------------------------------
      if (!password) {
        setError('Please enter your password.');
        return;
      }

      setLoading(true);
      try {
        // Attempt sign in with password
        const { error: signInError } = await signIn(cleanEmail, password);

        if (!signInError) {
          // if gmail in db and password is correct: open app!
          onSuccess?.();
          onClose?.();
          return;
        }

        // Check if gmail is in db
        const exists = await checkUserExists(cleanEmail);

        if (exists) {
          // if gmail in db:
          // else: show try another way button (to sign in with otp without password).
          // user can choose enter password or try another way
          setError('Incorrect password.');
          setShowTryAnotherWay(true);
        } else {
          // else: goto account create page.
          setIsSignUp(true);
          setPassword('');
          setConfirmPassword('');
          setShowTryAnotherWay(false);
          setError('Account not found with this Gmail. Please create an account below.');
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred during sign in.');
      } finally {
        setLoading(false);
      }
    }
  };

  const card = (
    <div
      className="w-full max-w-md bg-slate-900/95 border border-slate-800/90 backdrop-blur-2xl rounded-3xl p-7 sm:p-8 shadow-2xl relative z-10 font-sans max-h-[92vh] overflow-y-auto custom-scrollbar select-none"
      onClick={(e) => isModal && e.stopPropagation()}
    >
      {/* Top right cross close button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors z-20 cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header / Logo */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center mb-3">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-cyan-400/70 shadow-[0_0_24px_rgba(0,240,255,0.45)] bg-slate-950 p-0.5 transition-transform hover:scale-105 duration-300">
            <img
              src={appLogo}
              alt="Seyal AI Logo"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
          Seyal AI
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {isVerifyingOtp
            ? 'Verify your Gmail inbox to activate your account'
            : isSignUp
            ? 'Create your Seyal AI account with your verified Gmail'
            : 'Sign in to access your conversational computer agent'}
        </p>
      </div>

      {/* Alerts (Non-intrusive) */}
      {message && (
        <div className="mb-4 p-3 rounded-2xl bg-cyan-950/60 border border-cyan-500/50 text-cyan-200 text-xs flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* VIEW A: Email & OTP Verification Screen */}
      {isVerifyingOtp ? (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 text-center">
            <div className="flex items-center justify-center gap-2 text-cyan-300 font-bold text-xs mb-1">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              <span>Enter Verification Code (OTP)</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Enter the 8-digit or 6-digit code sent to:
            </p>
            <div className="font-mono text-xs font-bold text-cyan-200 mt-0.5 break-all">
              {email}
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Dedicated OTP Input (supports 6 or 8 digits) */}
          <div className="space-y-3">
            <div>
              <input
                type="text"
                maxLength={8}
                autoFocus
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • • • •"
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-2xl py-3 px-3 text-center font-mono text-xl sm:text-2xl font-bold tracking-[0.25em] sm:tracking-[0.35em] text-cyan-300 outline-none shadow-inner"
              />
            </div>

            <button
              type="button"
              onClick={() => handleVerifyOtp()}
              disabled={loading || otpCode.trim().length < 6}
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-950/50 transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Verify Code & Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Email Confirmation Link fallback */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleCheckConfirmed}
              disabled={loading}
              className="text-[11px] text-slate-400 hover:text-cyan-300 underline cursor-pointer transition-colors"
            >
              Clicked the sign-in link in your email? Click here to continue
            </button>
          </div>

          {/* Resend & Change Email Row */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendCooldown > 0}
              className="text-cyan-400 hover:text-cyan-300 disabled:text-slate-600 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsVerifyingOtp(false);
                setError(null);
                setMessage(null);
              }}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Change Gmail / Back
            </button>
          </div>
        </div>
      ) : (
        /* VIEW B: Sign In / Sign Up Form */
        <div>
          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full py-2.5 px-4 bg-slate-950/80 hover:bg-slate-950 border border-slate-700/80 hover:border-cyan-500/50 text-slate-100 font-semibold text-xs rounded-xl transition-all duration-200 flex items-center justify-center gap-2.5 shadow-md shadow-black/40 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            {googleLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* OR Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-slate-900/95 px-2.5 text-slate-500 font-mono tracking-wider">
                or with verified gmail
              </span>
            </div>
          </div>

          {/* Form Mode Toggle */}
          <div className="flex bg-slate-950/70 p-1 rounded-xl border border-slate-800 mb-4">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setPassword('');
                setConfirmPassword('');
                setError(null);
                setMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                !isSignUp
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setPassword('');
                setConfirmPassword('');
                setError(null);
                setMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                isSignUp
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Gmail Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="yourname@gmail.com"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 transition-all outline-none"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 transition-all outline-none"
                />
              </div>
              {!isSignUp && (
                <div className="flex items-center justify-end mt-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading || !email.trim()}
                    className="text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>

            {/* Confirm Password (only on Sign Up) */}
            {isSignUp && (
              <div className="animate-fadeIn">
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 transition-all outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-950/40 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {isSignUp ? 'Create Account & Send OTP' : 'Sign In'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {error && !isVerifyingOtp && (
              <div className="mt-3.5 p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-xs animate-fadeIn space-y-2.5">
                <div className="flex items-center justify-center gap-2 text-rose-300 text-center">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>

                {!isSignUp && showTryAnotherWay && (
                  <div className="pt-2 border-t border-rose-500/20 text-center">
                    <button
                      type="button"
                      onClick={handleSendOtpLogin}
                      disabled={loading || !email.trim()}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 font-semibold text-xs shadow-md shadow-cyan-950/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-40"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Try another way: Sign in with OTP</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Footer security info */}
      <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
        <ShieldCheck className="w-4 h-4 text-cyan-400" />
        <span>Secured by Supabase Authentication & Real Gmail Verification</span>
      </div>
    </div>
  );

  if (isModal) {
    if (typeof document === 'undefined') return null;
    return createPortal(
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
        onClick={onClose}
      >
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

        {card}
      </div>,
      document.body
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

      {card}
    </div>
  );
};
