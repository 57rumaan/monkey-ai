import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useApp } from './AppContext';
import { Button, Input } from './ui';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { state, login, signup } = useApp();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (state.isAuthenticated) navigate('/');
  }, [state.isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const success = await login(email, password);
        if (!success) setError('Invalid email or password. Please try again.');
        else navigate('/');
      } else {
        if (!name.trim()) { setError('Name is required'); setLoading(false); return; }
        if (!email.trim()) { setError('Email is required'); setLoading(false); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return; }
        const success = await signup(name.trim(), email.trim(), password);
        if (!success) setError('An account with this email already exists.');
        else navigate('/');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🐵</div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Monkey AI</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Advanced AI Platform</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button onClick={() => { setMode('login'); setError(''); }} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'login' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Sign In</button>
            <button onClick={() => { setMode('signup'); setError(''); }} className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'signup' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>Sign Up</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && <Input label="Full Name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" icon={<User size={16} />} required />}
            <Input label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" icon={<Mail size={16} />} required />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Lock size={16} /></span>
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full pl-10 pr-10 py-2 rounded-lg border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-monkey-500 focus:border-transparent transition-all" required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </div>
            {error && <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>}
            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">{mode === 'login' ? 'Sign In' : 'Create Account'}<ArrowRight size={16} /></Button>
          </form>
          {mode === 'login' && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">Don't have an account?{' '}<button onClick={() => setMode('signup')} className="text-monkey-500 hover:text-monkey-600 font-medium">Sign up</button></p>
          )}
        </div>
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">By continuing, you agree to Monkey AI's Terms of Service and Privacy Policy.</p>
      </div>
    </div>
  );
}
