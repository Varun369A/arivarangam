'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';
import { authApi, getApiError } from '@/lib/api';

type State = 'idle' | 'loading' | 'success' | 'error' | 'no-token';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('no-token');
      return;
    }

    setState('loading');
    authApi.verifyEmail(token)
      .then((res) => {
        setState('success');
        setMessage(res.message || 'Your email has been verified!');
      })
      .catch((err) => {
        setState('error');
        setMessage(getApiError(err));
      });
  }, [token]);

  return (
    <>
      {/* Loading */}
      {(state === 'idle' || state === 'loading') && (
        <div className="text-center py-6">
          <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Loader2 className="w-7 h-7 text-indigo-600 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Verifying your email…</h1>
          <p className="text-sm text-slate-500">Please wait while we confirm your address.</p>
        </div>
      )}

      {/* No token */}
      {state === 'no-token' && (
        <div className="text-center py-6">
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Mail className="w-7 h-7 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Check your email</h1>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            We sent a verification link to your email address when you signed up.
            Click the link in that email to verify your account.
          </p>
          <p className="text-xs text-slate-400 mb-8">
            Didn&apos;t get it? Check your spam folder or contact support.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
              text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            Go to dashboard
          </Link>
        </div>
      )}

      {/* Success */}
      {state === 'success' && (
        <div className="text-center py-6">
          <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Email verified!</h1>
          <p className="text-sm text-slate-500 mb-8">{message}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700
              hover:to-indigo-800 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-all shadow-md
              shadow-indigo-100"
          >
            Continue to dashboard
          </Link>
        </div>
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="text-center py-6">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <XCircle className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Verification failed</h1>
          <p className="text-sm text-red-600 mb-2 font-medium">{message}</p>
          <p className="text-xs text-slate-400 mb-8">
            The link may have expired (valid for 24 hours) or already been used.
          </p>
          <div className="flex flex-col gap-3 items-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold
                text-sm px-5 py-2.5 rounded-xl transition-colors"
            >
              Try signing up again
            </Link>
            <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
              Back to sign in
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-center py-6"><Loader2 className="w-7 h-7 animate-spin mx-auto text-indigo-600" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
