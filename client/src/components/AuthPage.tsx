// client/src/components/AuthPage.tsx

import React, { useState } from 'react';
import axios from 'axios';
import { auth } from '../firebase-client'; // Import Firebase auth instance
import type { FirebaseUser } from '../firebase-client'; 
import { signInWithEmailAndPassword, signInWithCustomToken } from 'firebase/auth';

interface AuthPageProps {
  onAuthSuccess: (user: FirebaseUser) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async () => {
    setLoading(true);
    setMessage('');
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password.');
      setLoading(false);
      return;
    }

    if (!auth) {
      setError('Authentication service not initialized. Please refresh.');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (userCredential.user) {
          onAuthSuccess(userCredential.user);
          setMessage('Logged in successfully!');
          console.log('User logged in:', userCredential.user.uid);
        } else {
          setError('Login failed: No user information received.');
        }
      } else {
        const response = await axios.post<{ success: boolean; message: string; uid?: string; token?: string }>(
          'http://localhost:5000/api/auth/register',
          { email, password }
        );

        if (response.data.success && response.data.token) {
          const customToken = response.data.token;
          const userCredential = await signInWithCustomToken(auth, customToken);
          if (userCredential.user) {
            onAuthSuccess(userCredential.user);
            setMessage('Registered and logged in successfully!');
            console.log('User registered and logged in:', userCredential.user.uid);
          } else {
            setError('Registration successful, but login failed: No user information received.');
          }
        } else {
          setError(response.data.message || 'Registration failed.');
        }
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      let errMsg = 'An unexpected authentication error occurred.';
      if (err.code) {
        if (err.code === 'auth/email-already-in-use') {
          errMsg = 'The email address is already registered.';
        } else if (err.code === 'auth/invalid-email') {
          errMsg = 'The email address is not valid.';
        } else if (err.code === 'auth/operation-not-allowed') {
          errMsg = 'Email/password sign-in is not enabled. (Check Firebase Console)';
        } else if (err.code === 'auth/weak-password') {
          errMsg = 'Password is too weak (min 6 characters).';
        } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
          errMsg = 'Invalid email or password.';
        } else if (err.code === 'auth/network-request-failed') {
          errMsg = 'Network error. Please check your internet connection.';
        }
        else {
            errMsg = err.message;
        }
      } else if (axios.isAxiosError(err) && err.response && err.response.data && err.response.data.message) {
          errMsg = err.response.data.message;
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">{isLogin ? 'Login' : 'Register'}</h2>
        {error && <p className="error-text message-display">{error}</p>}
        {message && <p className="success-text message-display">{message}</p>}

        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            disabled={loading}
            className="auth-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={loading}
            className="auth-input"
          />
        </div>

        <button onClick={handleAuth} disabled={loading} className="auth-button">
          {loading ? (isLogin ? 'Logging In...' : 'Registering...') : (isLogin ? 'Login' : 'Register')}
        </button>

        <p className="auth-toggle-message">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button onClick={() => setIsLogin(!isLogin)} className="auth-toggle-button">
            {isLogin ? 'Register here.' : 'Login here.'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
