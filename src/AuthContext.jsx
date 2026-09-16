import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from './firebase';

export const ALLOWED_EMAILS = [
  'guy@kuleski.co.il',
  'asaf@kuleski.co.il'
];

export const isEmailAllowed = (email) => {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.trim().toLowerCase());
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (!isEmailAllowed(firebaseUser.email)) {
          console.warn(`Unauthorized login attempt from: ${firebaseUser.email}`);
          await signOut(auth);
          setUser(null);
          setAuthError(`גישה נדחתה: כתובת הדוא"ל (${firebaseUser.email}) אינה מורשית. המערכת מוגבלת למורשים בלבד.`);
          return;
        }
      }
      setUser(firebaseUser); // null = logged out, object = logged in
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setAuthError(null);
    const credential = await signInWithPopup(auth, googleProvider);
    if (!isEmailAllowed(credential.user?.email)) {
      const email = credential.user?.email || '';
      await signOut(auth);
      setUser(null);
      const errorMsg = `גישה נדחתה: כתובת הדוא"ל (${email}) אינה מורשית. הכניסה מורשית רק עבור guy@kuleski.co.il ו-asaf@kuleski.co.il.`;
      setAuthError(errorMsg);
      throw new Error(errorMsg);
    }
    return credential;
  };

  const logout = () => {
    setAuthError(null);
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, logout, authError, setAuthError, isEmailAllowed }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

