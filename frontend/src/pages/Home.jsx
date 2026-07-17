import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white text-gray-900 dark:from-gray-900 dark:to-gray-950 dark:text-gray-100 flex flex-col justify-between">
      {/* Navbar on landing page */}
      <nav className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold shadow-md">
            ₹
          </div>
          <span className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
            WealthWise AI
          </span>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow transition-colors"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
                Log In
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-20 text-center flex-1 flex flex-col justify-center">
        <div className="max-w-3xl mx-auto">
          <span className="px-3 py-1 text-xs font-semibold text-blue-800 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-200 rounded-full">
            MCA Final Year Project - AI & ML Track
          </span>
          <h1 className="mt-6 text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            AI-Powered Personal <br className="hidden sm:block"/>
            <span className="text-blue-600 dark:text-blue-400">Finance Assistant</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            Gain control of your spending habits with smart automated classification, future spending predictions, and anomaly detection. Upload bank statements and receive instant financial recommendations.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              to={isAuthenticated ? "/dashboard" : "/signup"}
              className="px-6 py-3 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-colors"
            >
              Get Started Free
            </Link>
            <a
              href="#project-details"
              className="px-6 py-3 font-semibold text-blue-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-blue-400 dark:hover:bg-gray-700 transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>

        {/* Feature Mockup Box */}
        <div className="mt-16 max-w-4xl mx-auto rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:bg-gray-800 dark:border-gray-700">
          <div className="rounded-lg bg-gray-50 p-6 sm:p-10 text-left border border-gray-100 dark:bg-gray-900 dark:border-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-bold">Project Live Demo Preview</h3>
                <p className="text-xs text-gray-500">Visual representations of the active Machine Learning modules.</p>
              </div>
              <div className="flex gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400"></span>
                <span className="h-3 w-3 rounded-full bg-yellow-400"></span>
                <span className="h-3 w-3 rounded-full bg-green-400"></span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm dark:bg-gray-800 dark:border-gray-700">
                <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">Random Forest Classifier</div>
                <div className="text-sm font-bold text-gray-700 dark:text-gray-200">"Walmart grocery delivery"</div>
                <div className="mt-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200 font-medium">
                  🏷️ Classified: Food
                </div>
              </div>
              <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm dark:bg-gray-800 dark:border-gray-700">
                <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">Linear Regression Forecast</div>
                <div className="text-sm font-bold text-gray-700 dark:text-gray-200">August 2026 Spending</div>
                <div className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  📈 Predicted: ₹1,424.00 (± ₹32 MAE)
                </div>
              </div>
              <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm dark:bg-gray-800 dark:border-gray-700">
                <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">Isolation Forest Anomalies</div>
                <div className="text-sm font-bold text-gray-700 dark:text-gray-200">"Zara Shopping - ₹1,400"</div>
                <div className="mt-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 font-medium animate-pulse">
                  ⚠️ Anomaly: Flagged Outlier
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Project Details Section */}
      <section id="project-details" className="bg-white border-t border-b border-gray-100 py-16 dark:bg-gray-800/40 dark:border-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold">Academic Project Architecture</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Engineered using state-of-the-art frameworks to mimic a modern, enterprise production ecosystem without unnecessary overhead.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
            <div className="p-5 bg-gray-50 rounded-lg border border-gray-200 shadow-sm dark:bg-gray-900 dark:border-gray-700">
              <div className="text-2xl mb-3">🎨</div>
              <h3 className="font-bold text-sm">Responsive Frontend</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                Built with React.js and styled dynamically using Tailwind CSS. Features dark mode, responsive cards, and Chart.js dashboards.
              </p>
            </div>
            
            <div className="p-5 bg-gray-50 rounded-lg border border-gray-200 shadow-sm dark:bg-gray-900 dark:border-gray-700">
              <div className="text-2xl mb-3">⚡</div>
              <h3 className="font-bold text-sm">Robust REST API</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                FastAPI backend handles high-performance routing. Features JWT session-bearer auth, password hashing, and secure endpoints.
              </p>
            </div>

            <div className="p-5 bg-gray-50 rounded-lg border border-gray-200 shadow-sm dark:bg-gray-900 dark:border-gray-700">
              <div className="text-2xl mb-3">🤖</div>
              <h3 className="font-bold text-sm">Scikit-learn Pipelines</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                Trains TF-IDF models, Random Forest ensembles, and Isolation Forests locally. Compares multiple models and details precision.
              </p>
            </div>

            <div className="p-5 bg-gray-50 rounded-lg border border-gray-200 shadow-sm dark:bg-gray-900 dark:border-gray-700">
              <div className="text-2xl mb-3">📁</div>
              <h3 className="font-bold text-sm">Structured Ingestion</h3>
              <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                Imports CSV bank statements with automatic date cleaning, type alignment, and instant PDF report compiler with reportlab.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-10 dark:bg-gray-950 dark:border-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
          <div>
            <h4 className="font-bold text-gray-700 dark:text-gray-200">AI Powered Personal Finance Assistant</h4>
            <p className="mt-1">MCA AI & ML Final Semester Project submission.</p>
          </div>
          <div className="flex gap-4 font-medium">
            <Link to="/login" className="hover:text-blue-600">Login</Link>
            <Link to="/signup" className="hover:text-blue-600">Signup</Link>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <span>SQLite v3</span>
            <span>FastAPI Python</span>
            <span>React.js</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
