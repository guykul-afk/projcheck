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
      background: 'linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      direction: 'rtl'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '3rem',
        boxShadow: '0 20px 60px rgba(59,130,246,0.12)',
        textAlign: 'center',
        maxWidth: '380px',
        width: '90%'
      }}>
        {/* Logo */}
        <div style={{
          width: '64px',
          height: '64px',
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          fontSize: '28px'
        }}>
          📊
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.5rem' }}>
          ProjectCheck
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
          מערכת ניתוח התכנות פיננסית
          <br />
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>הנתונים שלך שמורים בענן ונגישים מכל מחשב</span>
        </p>

        {error && (
          <div style={{
            background: '#fef2f2',
            color: '#b91c1c',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            border: '1px solid #fecaca',
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
            padding: '14px 24px',
            background: 'white',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            cursor: isLoggingIn ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontSize: '1rem',
            fontWeight: 600,
            color: '#1e293b',
            transition: 'all 0.2s',
            opacity: isLoggingIn ? 0.7 : 1,
            boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
          }}
          onMouseEnter={e => !isLoggingIn && (e.currentTarget.style.boxShadow = '0 6px 20px rgba(59,130,246,0.2)')}
          onMouseLeave={e => !isLoggingIn && (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)')}
        >
          {isLoggingIn ? (
            <div style={{ width: 20, height: 20, border: '2px solid #e2e8f0', borderTop: '2px solid #3b82f6', borderRadius: '50%', animation: 'spin-fast 0.8s linear infinite' }} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {isLoggingIn ? 'מתחבר...' : 'המשך עם Google'}
        </button>

        <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
          כניסה אחת נותנת גישה לכל הפרויקטים שלך מכל מכשיר
        </p>
        <style>{`@keyframes spin-fast { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};

export default Login;

