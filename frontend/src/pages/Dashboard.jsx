import React, { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import api from '../services/api';
import { useToast } from '../App';

// Register ChartJS elements
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement);

export default function Dashboard() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [predicting, setPredicting] = useState(false);
  const [scanningAnomalies, setScanningAnomalies] = useState(false);
  
  // Historical trend data state (for Line/Bar charts)
  const [dailySpending, setDailySpending] = useState([]);
  const [budgets, setBudgets] = useState({});

  // Chat & AI Search State
  const [chatQuery, setChatQuery] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [recurringBills, setRecurringBills] = useState([]);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatQuery.trim()) return;
    setChatLoading(true);
    setChatResponse('');
    try {
      const res = await api.post('/insights/query', { query: chatQuery });
      setChatResponse(res.data.response);
    } catch (err) {
      console.error(err);
      setChatResponse("Could not process your question. Please verify your connection.");
    } finally {
      setChatLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setError('');
      const response = await api.get('/dashboard/summary');
      setData(response.data);
      
      // Fetch budget configurations
      const budgetRes = await api.get('/budgets');
      const bMap = {};
      budgetRes.data.forEach(b => {
        bMap[b.category] = b.limit_amount;
      });
      setBudgets(bMap);

      // Fetch recurring bills
      try {
        const recRes = await api.get('/dashboard/recurring');
        setRecurringBills(recRes.data);
      } catch (err) {
        console.error("Failed to load recurring bills:", err);
      }

      // Fetch all transactions to calculate cumulative daily trend for current month
      const txRes = await api.get('/transactions?limit=100');
      const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
      
      const currentMonthExpenses = txRes.data.transactions.filter(t => 
        t.type === 'expense' && t.date.substring(0, 7) === currentMonth
      );
      
      // Group by day of month
      const dailyMap = {};
      currentMonthExpenses.forEach(t => {
        const day = parseInt(t.date.split('-')[2]);
        dailyMap[day] = (dailyMap[day] || 0) + t.amount;
      });
      
      // Sort and calculate cumulative sum
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const cumulativeData = [];
      let cumulativeSum = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const amountSpent = dailyMap[day] || 0;
        cumulativeSum += amountSpent;
        // Don't plot future days
        if (day <= new Date().getDate()) {
          cumulativeData.push({ day, amount: cumulativeSum });
        }
      }
      setDailySpending(cumulativeData);

    } catch (err) {
      console.error(err);
      setError('Failed to fetch dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const runPrediction = async () => {
    setPredicting(true);
    try {
      const res = await api.post('/predictions/predict');
      showToast(`Forecast generated successfully using ${res.data.model_used}!`);
      fetchDashboardData();
    } catch (err) {
      showToast(err.response?.data?.detail || "Could not generate predictions. Ensure you have 4 months of transactions.", "error");
    } finally {
      setPredicting(false);
    }
  };

  const scanAnomalies = async () => {
    setScanningAnomalies(true);
    try {
      const res = await api.post('/predictions/anomalies');
      showToast(res.data.message);
      fetchDashboardData();
    } catch (err) {
      showToast("Anomaly scan failed. Ensure you have at least 5 expenses.", "error");
    } finally {
      setScanningAnomalies(false);
    }
  };

  const downloadPDFReport = async () => {
    try {
      showToast("Compiling PDF report...");
      const genRes = await api.post('/reports/generate');
      
      // Download file response
      const reportId = genRes.data.id;
      const downloadRes = await api.get(`/reports/download/${reportId}`, { responseType: 'blob' });
      
      // Create download link
      const blob = new Blob([downloadRes.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `financial_report_${new Date().toISOString().substring(0, 7)}.pdf`;
      link.click();
      showToast("PDF downloaded successfully!");
    } catch (err) {
      console.error(err);
      showToast("Failed to download report PDF", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-center max-w-lg mx-auto mt-10">
        <p className="font-semibold mb-2">⚠️ Error loading dashboard</p>
        <p className="text-sm mb-4">{error}</p>
        <button onClick={fetchDashboardData} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold transition-colors">
          Retry
        </button>
      </div>
    );
  }

  // Chart configuration: Pie Chart (Expense Categories)
  const categoryLabels = data.category_spending.map(c => c.category);
  const categoryAmounts = data.category_spending.map(c => c.amount);
  
  const pieData = {
    labels: categoryLabels.length > 0 ? categoryLabels : ['No Expenses'],
    datasets: [{
      data: categoryAmounts.length > 0 ? categoryAmounts : [1],
      backgroundColor: [
        '#1E3A8A', '#2563EB', '#3B82F6', '#60A5FA',
        '#93C5FD', '#BFDBFE', '#D1D5DB', '#9CA3AF'
      ],
      borderWidth: 1,
    }]
  };

  // Chart configuration: Bar Chart (Current Expenses vs Category Budget Limits)
  const barCategories = ['Food', 'Travel', 'Shopping', 'Bills', 'Medical', 'Entertainment', 'Education', 'Others'];
  const barSpending = barCategories.map(cat => {
    const found = data.category_spending.find(c => c.category === cat);
    return found ? found.amount : 0;
  });
  const barBudgetLimits = barCategories.map(cat => budgets[cat] || 0);

  const barData = {
    labels: barCategories,
    datasets: [
      {
        label: 'Spent Amount',
        data: barSpending,
        backgroundColor: '#2563EB',
        borderRadius: 4,
      },
      {
        label: 'Budget Limit',
        data: barBudgetLimits,
        backgroundColor: '#D1D5DB',
        borderRadius: 4,
      }
    ]
  };

  // Chart configuration: Line Chart (Cumulative spending day-by-day)
  const lineData = {
    labels: dailySpending.map(d => `Day ${d.day}`),
    datasets: [{
      label: 'Cumulative Expense (₹)',
      data: dailySpending.map(d => d.amount),
      fill: true,
      backgroundColor: 'rgba(37, 99, 235, 0.1)',
      borderColor: '#2563EB',
      tension: 0.3,
      pointRadius: 2,
    }]
  };

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Financial Dashboard</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Insightful summary of your expenses, budgets, and AI observations.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadPDFReport}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            📥 Export PDF Report
          </button>
        </div>
      </div>

      {/* AI Assistant Chat Query Box */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700 space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-1.5">
          <span>💬</span> Ask WealthWise AI (Natural Language Search)
        </h3>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Query your finances: *"How much did I spend on food last month?"*, *"Do I have anomalies?"*, or *"Show my recent expenses."*
        </p>
        <form onSubmit={handleChatSubmit} className="flex gap-2">
          <input
            type="text"
            required
            placeholder="Ask a question about your transactions..."
            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-xs bg-transparent focus:ring-2 focus:ring-blue-500"
            value={chatQuery}
            onChange={(e) => setChatQuery(e.target.value)}
            disabled={chatLoading}
          />
          <button
            type="submit"
            disabled={chatLoading}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {chatLoading ? "Asking..." : "Ask AI"}
          </button>
        </form>
        {chatResponse && (
          <div className="p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl text-xs border border-blue-100/50 dark:border-blue-900/30 leading-relaxed text-gray-800 dark:text-gray-200">
            <b>AI Assistant:</b> {chatResponse}
          </div>
        )}
      </div>

      {/* Row 1: Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Balance Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Net Balance</span>
            <h3 className={`text-2xl font-bold mt-2 ${data.total_balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              ₹{data.total_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-gray-500 mt-1 dark:text-gray-400">Cumulative historical earnings minus spendings</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold dark:bg-blue-900/50 dark:text-blue-400">
            💼
          </div>
        </div>

        {/* Monthly Spending Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Monthly Spending</span>
            <h3 className="text-2xl font-bold mt-2 text-gray-900 dark:text-white">
              ₹{data.monthly_spending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-gray-500 mt-1 dark:text-gray-400">Sum of expenses in the current month</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-xl font-bold dark:bg-red-900/50 dark:text-red-400">
            📊
          </div>
        </div>

        {/* Savings Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Monthly Net Savings</span>
            <h3 className={`text-2xl font-bold mt-2 ${data.savings >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              ₹{data.savings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[10px] text-gray-500 mt-1 dark:text-gray-400">Current month income minus current expenses</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-xl font-bold dark:bg-green-900/50 dark:text-green-400">
            💰
          </div>
        </div>

        {/* Financial Health Score Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Financial Health Score</span>
            <div className="flex items-baseline gap-1 mt-2">
              <h3 className={`text-2xl font-extrabold ${
                data.health_score >= 80 ? 'text-green-600 dark:text-green-400' :
                data.health_score >= 50 ? 'text-amber-500 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {data.health_score}
              </h3>
              <span className="text-gray-400 text-xs font-bold">/100</span>
            </div>
            <span className={`inline-block text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded mt-2.5 ${
              data.health_score >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-950/80 dark:text-green-300' :
              data.health_score >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300' :
              'bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300'
            }`}>
              {data.health_score >= 80 ? 'Excellent' : data.health_score >= 50 ? 'Moderate' : 'Needs Action'}
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl font-bold dark:bg-purple-900/50 dark:text-purple-400">
            ❤️
          </div>
        </div>

      </div>

      {/* Row 2: Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pie Chart: Expense Distribution */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700 flex flex-col justify-between min-h-[300px]">
          <div>
            <h4 className="text-sm font-bold border-b border-gray-100 pb-2 mb-4 dark:border-gray-700">Expense Allocations</h4>
          </div>
          <div className="flex-1 flex items-center justify-center max-h-[220px]">
            {categoryLabels.length > 0 ? (
              <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 9 } } } } }} />
            ) : (
              <p className="text-xs text-gray-400">No expense records logged this month.</p>
            )}
          </div>
        </div>

        {/* Bar Chart: Spending vs Budgets */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700 flex flex-col justify-between lg:col-span-2 min-h-[300px]">
          <div>
            <h4 className="text-sm font-bold border-b border-gray-100 pb-2 mb-4 dark:border-gray-700">Category Spending vs Monthly Budget Limits</h4>
          </div>
          <div className="flex-1 max-h-[220px]">
            <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, labels: { boxWidth: 10, font: { size: 9 } } } }, scales: { x: { grid: { display: false } } } }} />
          </div>
        </div>

      </div>

      {/* Row 3: Line Chart & ML Predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Line Chart: Cumulative Spending Trend */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700 lg:col-span-2 flex flex-col justify-between min-h-[300px]">
          <div>
            <h4 className="text-sm font-bold border-b border-gray-100 pb-2 mb-4 dark:border-gray-700">Cumulative Daily Spending Trend (Current Month)</h4>
          </div>
          <div className="flex-1 max-h-[220px]">
            {dailySpending.length > 0 ? (
              <Line data={lineData} options={{ responsive: true, maintainAspectRatio: false, scales: { x: { grid: { display: false } } } }} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-gray-400">No transaction data this month.</div>
            )}
          </div>
        </div>

        {/* Machine Learning Forecasting Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700 flex flex-col justify-between min-h-[300px]">
          <div>
            <h4 className="text-sm font-bold border-b border-gray-100 pb-2 mb-3 dark:border-gray-700">AI Spending Forecast</h4>
            {data.prediction ? (
              <div className="space-y-3 mt-4">
                <div className="p-3 bg-blue-50 rounded-xl dark:bg-blue-900/20 text-center">
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Next Month Expense Estimate</span>
                  <h3 className="text-2xl font-extrabold mt-1 text-blue-700 dark:text-blue-300">
                    ₹{data.prediction.predicted_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="text-[11px] text-gray-500 space-y-1 dark:text-gray-400">
                  <p><b>Model:</b> {data.prediction.model_used}</p>
                  <p><b>Mean Absolute Error:</b> ₹{data.prediction.mae.toFixed(2)}</p>
                  <p><b>Root Mean Squared Error:</b> ₹{data.prediction.rmse.toFixed(2)}</p>
                  <p><b>R&sup2; Variance Score:</b> {data.prediction.r2_score.toFixed(4)}</p>
                  {data.prediction.explanation && (
                    <div className="mt-3 p-2.5 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg border border-blue-100/50 dark:border-blue-900/30 text-[10px] italic leading-relaxed text-gray-600 dark:text-gray-300">
                      <b>AI Explanation:</b> {data.prediction.explanation}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-xs text-gray-400 mb-2">No forecasting model generated yet.</p>
                <p className="text-[10px] text-gray-500">ML models require at least 4 months of transactions history to build features.</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700 space-y-2">
            <button
              onClick={runPrediction}
              disabled={predicting}
              className="w-full flex justify-center py-2 border border-transparent rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {predicting ? "Running regressors..." : "📈 Train & Predict Next Month"}
            </button>
            <button
              onClick={scanAnomalies}
              disabled={scanningAnomalies}
              className="w-full flex justify-center py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {scanningAnomalies ? "Fitting Isolation Forest..." : "⚠️ Scan For Anomalies"}
            </button>
          </div>
        </div>

      </div>

      {/* Row 4: Recent Transactions, AI Insights, & Detected Subscriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Transactions List */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold border-b border-gray-100 pb-2 mb-3 dark:border-gray-700">Recent Activity</h4>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {data.recent_transactions.length > 0 ? (
                data.recent_transactions.map((tx) => (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                     <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{tx.description}</p>
                      <p className="text-[10px] text-gray-500">{tx.date} &bull; {tx.category}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${tx.type === 'income' ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                        {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                      </p>
                      {tx.is_anomaly && (
                        <span 
                          title={tx.anomaly_explanation || "Suspicious Outlier"}
                          className="inline-block text-[9px] bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 font-semibold px-1 rounded animate-pulse cursor-help"
                        >
                          ⚠️ Anomaly
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 py-6 text-center">No transaction records logged.</p>
              )}
            </div>
          </div>
        </div>

        {/* AI Quick Insights */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold border-b border-gray-100 pb-2 mb-3 dark:border-gray-700">AI Financial Observations</h4>
            <div className="space-y-3 mt-2">
              {data.insights.length > 0 ? (
                data.insights.map((ins, idx) => (
                  <div key={idx} className="flex gap-2 text-xs">
                    <span className="text-blue-500 text-sm">&#9670;</span>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{ins}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 py-6 text-center">No AI insights generated yet. Please import transactions.</p>
              )}
            </div>
          </div>
        </div>

        {/* Detected Recurring Subscriptions */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold border-b border-gray-100 pb-2 mb-3 dark:border-gray-700">Detected Subscriptions & Bills</h4>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recurringBills.length > 0 ? (
                recurringBills.map((bill, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{bill.description}</p>
                      <p className="text-[10px] text-gray-500">
                        {bill.frequency} &bull; {bill.category} &bull; Paid {bill.occurrences}x
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">
                        ₹{bill.average_amount.toFixed(2)}
                      </p>
                      <p className="text-[9px] text-gray-400">Last: {bill.last_date}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400 py-6 text-center">No recurring subscriptions or monthly bills detected yet.</p>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
