import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../App';

export default function Signup() {
  const { signup } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setError("Please fill in all fields.");
      return;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError('');
    setLoading(true);

    const res = await signup(email, password, fullName);
    setLoading(false);

    if (res.success) {
      showToast("Account created successfully! Please log in.");
      navigate('/login');
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
        
        {/* Header Title */}
        <div className="text-center">
          <Link to="/" className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-lg shadow-md mb-4">
            $
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Create Account
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Sign up to start tracking your finances
          </p>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-100 text-xs font-semibold dark:bg-red-950/50 dark:text-red-200 dark:border-red-900/50">
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="appearance-none rounded-lg relative block w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="appearance-none rounded-lg relative block w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-4 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold">
            Log In
          </Link>
        </div>

      </div>
    </div>
  );
}
