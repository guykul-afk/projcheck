import React, { useState } from 'react';
import { useAuth } from './AuthContext';

const Login = () => {
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error("Login error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError("שגיאה: עליך להפעיל את Google Sign-In בתוך Firebase Console.");
      } else if (err.code === 'auth/popup-blocked') {
        setError("שגיאה: הדפדפן חסם את חלונית ההתחברות. נסה שוב/אפשר פופאפים.");
      } else {
        setError(`שגיאה בהתחברות: ${err.message}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-canvas)',
      fontFamily: "var(--font-main)",
      direction: 'rtl'
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: '16px',
        padding: '3.5rem 3rem',
        boxShadow: 'var(--shadow-premium)',
        textAlign: 'center',
        maxWidth: '420px',
        width: '90%',
        border: '1px solid var(--border-sharp)'
      }}>
        {/* Logo */}
        <div style={{
          width: '72px',
          height: '72px',
          background: 'linear-gradient(135deg, var(--secondary), var(--accent))',
          borderRadius: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 2rem',
          fontSize: '32px',
          boxShadow: '0 8px 16px rgba(38, 70, 83, 0.15)'
        }}>
          📊
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-pri)', margin: '0 0 0.75rem', letterSpacing: '-0.02em' }}>
          ProjectCheck
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '2.5rem', lineHeight: 1.6 }}>
          מערכת ניתוח התכנות פיננסית
          <br />
          <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>כלי ניתוח מתקדם ליזמים ומשקיעי נדל"ן</span>
        </p>

        {error && (
          <div style={{
            background: '#fdecec',
            color: '#E76F51',
            padding: '14px',
            borderRadius: '10px',
            fontSize: '0.9rem',
            marginBottom: '2rem',
            border: '1px solid rgba(231, 111, 81, 0.2)',
            textAlign: 'right'
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          style={{
            width: '100%',
            padding: '16px 24px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-sharp)',
            borderRadius: '12px',
            cursor: isLoggingIn ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            fontSize: '1.05rem',
            fontWeight: 600,
            color: 'var(--text-pri)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: isLoggingIn ? 0.7 : 1,
            boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
          }}
          onMouseEnter={e => !isLoggingIn && (
            e.currentTarget.style.borderColor = 'var(--accent)',
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(88, 166, 255, 0.15)'
          )}
          onMouseLeave={e => !isLoggingIn && (
            e.currentTarget.style.borderColor = 'var(--border-sharp)',
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)'
          )}
        >
          {isLoggingIn ? (
            <div style={{ width: 22, height: 22, border: '2px solid var(--border-sharp)', borderTop: '2px solid var(--accent)', borderRadius: '50%', animation: 'spin-fast 0.8s linear infinite' }} />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {isLoggingIn ? 'מתחבר...' : 'המשך עם Google'}
        </button>

        <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
          התחברות מאובטחת באמצעות Google Cloud Identity
        </p>
        <style>{`@keyframes spin-fast { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};

export default Login;

