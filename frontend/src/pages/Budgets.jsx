import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../App';

export default function Budgets() {
  const { showToast } = useToast();

  // Categories list
  const categories = ["Food", "Travel", "Shopping", "Bills", "Medical", "Entertainment", "Education", "Others"];

  // Category Budgets State
  const [budgets, setBudgets] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Food');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [budgetMonth, setBudgetMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [updatingBudget, setUpdatingBudget] = useState(false);
  const [spendingStats, setSpendingStats] = useState({});

  // Savings Goals State
  const [goals, setGoals] = useState([]);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [addingFundsMap, setAddingFundsMap] = useState({}); // goalId -> amount

  // Fetch functions
  const fetchActiveBudgets = async () => {
    try {
      const res = await api.get(`/budgets?month=${budgetMonth}`);
      setBudgets(res.data);
    } catch (err) {
      console.error("Failed to load budgets", err);
    }
  };

  const fetchSpendingStats = async () => {
    try {
      const res = await api.get('/transactions', { params: { limit: 1000 } });
      const txs = res.data.transactions;
      const statsMap = {};
      txs.forEach(tx => {
        if (tx.date.substring(0, 7) === budgetMonth && tx.type === 'expense') {
          statsMap[tx.category] = (statsMap[tx.category] || 0) + tx.amount;
        }
      });
      setSpendingStats(statsMap);
    } catch (err) {
      console.error("Failed to load spending stats", err);
    }
  };

  const fetchSavingsGoals = async () => {
    try {
      const res = await api.get('/savings');
      setGoals(res.data);
    } catch (err) {
      console.error("Failed to load savings goals", err);
    }
  };

  useEffect(() => {
    fetchActiveBudgets();
    fetchSpendingStats();
  }, [budgetMonth]);

  useEffect(() => {
    fetchSavingsGoals();
  }, []);

  // Budget Handlers
  const handleSetBudget = async (e) => {
    e.preventDefault();
    if (!budgetLimit || parseFloat(budgetLimit) <= 0) {
      showToast("Please enter a valid positive budget limit.", "error");
      return;
    }

    setUpdatingBudget(true);
    try {
      await api.post('/budgets', {
        category: activeCategory,
        limit_amount: parseFloat(budgetLimit),
        month: budgetMonth
      });
      showToast(`Budget for ${activeCategory} configured successfully!`);
      setBudgetLimit('');
      fetchActiveBudgets();
      fetchSpendingStats();
    } catch (err) {
      showToast("Failed to set budget configuration.", "error");
    } finally {
      setUpdatingBudget(false);
    }
  };

  const handleDeleteBudget = async (id) => {
    if (!window.confirm("Delete this budget limit?")) return;
    try {
      await api.delete(`/budgets/${id}`);
      showToast("Budget limit removed.");
      fetchActiveBudgets();
      fetchSpendingStats();
    } catch (err) {
      showToast("Failed to delete budget.", "error");
    }
  };

  // Savings Goals Handlers
  const handleCreateGoal = async (e) => {
    e.preventDefault();
    if (!goalName || !goalTarget || parseFloat(goalTarget) <= 0) {
      showToast("Please enter a valid goal name and positive target amount.", "error");
      return;
    }

    setCreatingGoal(true);
    try {
      await api.post('/savings', {
        name: goalName,
        target_amount: parseFloat(goalTarget),
        current_amount: parseFloat(goalCurrent || 0),
        target_date: goalDate || null
      });
      showToast(`Savings goal "${goalName}" created successfully!`);
      setGoalName('');
      setGoalTarget('');
      setGoalCurrent('');
      setGoalDate('');
      fetchSavingsGoals();
    } catch (err) {
      showToast("Failed to create savings goal.", "error");
    } finally {
      setCreatingGoal(false);
    }
  };

  const handleAddFunds = async (goal, amountToAdd) => {
    const val = parseFloat(amountToAdd);
    if (isNaN(val) || val <= 0) {
      showToast("Please enter a valid positive amount.", "error");
      return;
    }

    try {
      await api.put(`/savings/${goal.id}`, {
        current_amount: goal.current_amount + val
      });
      showToast(`Added ₹${val.toFixed(2)} to ${goal.name}!`);
      // Clear specific input
      setAddingFundsMap(prev => ({ ...prev, [goal.id]: '' }));
      fetchSavingsGoals();
    } catch (err) {
      showToast("Failed to update savings progress.", "error");
    }
  };

  const handleDeleteGoal = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the goal "${name}"?`)) return;
    try {
      await api.delete(`/savings/${id}`);
      showToast(`Savings goal deleted.`);
      fetchSavingsGoals();
    } catch (err) {
      showToast("Failed to delete savings goal.", "error");
    }
  };

  // Summary Metrics
  const totalBudgetLimit = budgets.reduce((acc, curr) => acc + curr.limit_amount, 0);
  const totalCategorySpent = Object.values(spendingStats).reduce((acc, curr) => acc + curr, 0);
  const budgetUtilizationPercent = totalBudgetLimit > 0 ? Math.min((totalCategorySpent / totalBudgetLimit) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Budgets & Savings Planner</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Track and manage category-wise monthly limits and long-term saving goals.</p>
        </div>
      </div>

      {/* Row 1: Unified Overview Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Month Budget Limit</span>
          <h3 className="text-xl font-bold mt-1 text-gray-900 dark:text-white">
            ₹{totalBudgetLimit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-gray-400 mt-1">Sum of all active category limits for {budgetMonth}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Month Spent</span>
          <h3 className="text-xl font-bold mt-1 text-red-600 dark:text-red-400">
            ₹{totalCategorySpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-[10px] text-gray-400 mt-1">Total expenses tracked this month</p>
        </div>
        <div className="flex flex-col justify-center">
          <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 mb-1">
            <span>BUDGET UTILIZATION</span>
            <span>{Math.round(budgetUtilizationPercent)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${totalCategorySpent > totalBudgetLimit && totalBudgetLimit > 0 ? 'bg-red-500' : 'bg-blue-600'}`}
              style={{ width: `${budgetUtilizationPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Grid: Budgets vs Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category Budgets Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold border-b border-gray-100 pb-2 mb-4 dark:border-gray-700">Category Budgets Planner</h4>
            
            <div className="space-y-6 text-xs">
              {/* Add/Config form */}
              <form onSubmit={handleSetBudget} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block font-bold text-gray-500 mb-1 dark:text-gray-400">Month</label>
                  <input
                    type="month"
                    required
                    className="w-full rounded border border-gray-300 dark:border-gray-700 p-1.5 bg-transparent dark:text-white dark:bg-gray-900"
                    value={budgetMonth}
                    onChange={(e) => setBudgetMonth(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-500 mb-1 dark:text-gray-400">Category</label>
                  <select
                    className="w-full rounded border border-gray-300 dark:border-gray-700 p-1.5 bg-white dark:bg-gray-900 dark:text-white"
                    value={activeCategory}
                    onChange={(e) => setActiveCategory(e.target.value)}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-500 mb-1 dark:text-gray-400">Limit (₹)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      placeholder="e.g. 5000"
                      className="w-full rounded border border-gray-300 dark:border-gray-700 p-1.5 bg-transparent dark:text-white"
                      value={budgetLimit}
                      onChange={(e) => setBudgetLimit(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={updatingBudget}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      {updatingBudget ? "..." : "Set"}
                    </button>
                  </div>
                </div>
              </form>

              {/* Active list */}
              <div>
                <span className="block font-bold text-gray-400 uppercase tracking-wider mb-2.5">Configured Limits</span>
                <div className="border rounded-xl divide-y divide-gray-100 dark:border-gray-700 dark:divide-gray-700 max-h-80 overflow-y-auto">
                  {budgets.length > 0 ? (
                    budgets.map(b => {
                      const spent = spendingStats[b.category] || 0;
                      const percent = Math.min((spent / b.limit_amount) * 100, 100);
                      const isExceeded = spent > b.limit_amount;
                      return (
                        <div key={b.id} className="p-3 flex flex-col gap-2 hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-gray-800 dark:text-gray-250 flex items-center gap-1.5">
                                {b.category}
                                {isExceeded && (
                                  <span className="px-1.5 py-0.5 text-[8px] font-extrabold bg-red-100 text-red-700 rounded dark:bg-red-950/80 dark:text-red-300">
                                    ⚠️ Exceeded
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                Spent: <span className="font-semibold text-gray-700 dark:text-gray-300">₹{spent.toFixed(2)}</span> / ₹{b.limit_amount.toFixed(2)} ({Math.round((spent / b.limit_amount) * 100)}%)
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteBudget(b.id)}
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-semibold text-[10px]"
                            >
                              Remove
                            </button>
                          </div>
                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-500 ${isExceeded ? 'bg-red-500' : 'bg-blue-600'}`}
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-gray-400 py-10">No budgets set for this month.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Savings Goal Tracker Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold border-b border-gray-100 pb-2 mb-4 dark:border-gray-700">Savings Goal Tracker</h4>
            
            <div className="space-y-6 text-xs">
              {/* Create goal form */}
              <form onSubmit={handleCreateGoal} className="space-y-3 p-3.5 bg-gray-50 rounded-xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                <span className="block font-bold text-gray-700 dark:text-gray-300">Create New Savings Target</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 font-semibold mb-1">Goal Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Macbook Pro, Hawaii Trip"
                      className="w-full rounded border border-gray-300 dark:border-gray-700 p-1.5 bg-transparent dark:text-white"
                      value={goalName}
                      onChange={(e) => setGoalName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-semibold mb-1">Target Amount (₹)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 50000"
                      className="w-full rounded border border-gray-300 dark:border-gray-700 p-1.5 bg-transparent dark:text-white"
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 font-semibold mb-1">Initial Savings (₹, Optional)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 5000"
                      className="w-full rounded border border-gray-300 dark:border-gray-700 p-1.5 bg-transparent dark:text-white"
                      value={goalCurrent}
                      onChange={(e) => setGoalCurrent(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 font-semibold mb-1">Target Date (Optional)</label>
                    <input
                      type="date"
                      className="w-full rounded border border-gray-300 dark:border-gray-700 p-1.5 bg-transparent dark:text-white"
                      value={goalDate}
                      onChange={(e) => setGoalDate(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={creatingGoal}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded disabled:opacity-50 transition-colors mt-2"
                >
                  {creatingGoal ? "Creating Goal..." : "🏆 Establish Savings Goal"}
                </button>
              </form>

              {/* Goals list */}
              <div>
                <span className="block font-bold text-gray-400 uppercase tracking-wider mb-2.5">Active Savings Goals</span>
                <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                  {goals.length > 0 ? (
                    goals.map(g => {
                      const percent = Math.min((g.current_amount / g.target_amount) * 100, 100);
                      const remains = Math.max(0, g.target_amount - g.current_amount);
                      const isCompleted = g.current_amount >= g.target_amount;
                      
                      return (
                        <div key={g.id} className="p-3.5 bg-white border border-gray-100 rounded-xl dark:bg-gray-800/40 dark:border-gray-750 flex flex-col gap-2.5 relative group shadow-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-gray-800 dark:text-gray-200 text-xs flex items-center gap-1.5">
                                {g.name}
                                {isCompleted && (
                                  <span className="px-1.5 py-0.5 text-[8px] font-bold bg-green-100 text-green-700 rounded dark:bg-green-950/80 dark:text-green-300">
                                    ✓ Completed
                                  </span>
                                )}
                              </span>
                              <span className="text-[10px] text-gray-400 block mt-0.5">
                                Target Date: {g.target_date ? new Date(g.target_date).toLocaleDateString() : 'No Target Date'}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteGoal(g.id, g.name)}
                              className="text-gray-400 hover:text-red-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              🗑️
                            </button>
                          </div>

                          {/* Progress Details */}
                          <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400">
                            <span>₹{g.current_amount.toFixed(2)} saved</span>
                            <span>Target: ₹{g.target_amount.toFixed(2)}</span>
                          </div>

                          {/* Meter bar */}
                          <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-blue-600'}`}
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>

                          {/* Inline Add Money quick form */}
                          {!isCompleted && (
                            <div className="flex items-center gap-2 mt-1 justify-end">
                              <span className="text-[9px] text-gray-400 font-semibold uppercase">Add Savings:</span>
                              <input
                                type="number"
                                placeholder="₹ Amount"
                                className="w-20 rounded border border-gray-300 dark:border-gray-700 p-1 text-[10px] bg-transparent dark:text-white"
                                value={addingFundsMap[g.id] || ''}
                                onChange={(e) => setAddingFundsMap(prev => ({ ...prev, [g.id]: e.target.value }))}
                              />
                              <button
                                onClick={() => handleAddFunds(g, addingFundsMap[g.id])}
                                className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded text-[10px]"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-center text-gray-400 py-10">No active savings goals configured.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
