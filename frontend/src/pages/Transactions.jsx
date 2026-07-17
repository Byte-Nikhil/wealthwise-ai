import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../App';

export default function Transactions() {
  const { showToast } = useToast();
  
  // Data State
  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter/Pagination Params
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [isAnomaly, setIsAnomaly] = useState('');
  const [sortBy, setSortBy] = useState('amount');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals & In-flight CRUD State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeTx, setActiveTx] = useState(null);
  
  // Add/Edit fields
  const [txDate, setTxDate] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState('expense');
  const [txCategory, setTxCategory] = useState('Others');
  const [crudLoading, setCrudLoading] = useState(false);

  // Statement Ingestion State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const categories = ["Food", "Travel", "Shopping", "Bills", "Medical", "Entertainment", "Education", "Others"];

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const anomalyParam = isAnomaly === 'true' ? true : isAnomaly === 'false' ? false : undefined;
      const response = await api.get('/transactions', {
        params: {
          page,
          limit,
          search: search || undefined,
          category: category || undefined,
          type: type || undefined,
          is_anomaly: anomalyParam,
          sort_by: sortBy,
          sort_order: sortOrder
        }
      });
      setTransactions(response.data.transactions);
      setTotalCount(response.data.total_count);
    } catch (err) {
      console.error(err);
      setError('Could not load transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, search, category, type, isAnomaly, sortBy, sortOrder]);

  const handleOpenAdd = () => {
    setTxDate(new Date().toISOString().substring(0, 10));
    setTxDesc('');
    setTxAmount('');
    setTxType('expense');
    setTxCategory('Others');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (tx) => {
    setActiveTx(tx);
    setTxDate(tx.date);
    setTxDesc(tx.description);
    setTxAmount(tx.amount.toString());
    setTxType(tx.type);
    setTxCategory(tx.category);
    setIsEditOpen(true);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!txDate || !txDesc || !txAmount) {
      showToast("Please fill in all required fields.", "error");
      return;
    }
    
    setCrudLoading(true);
    try {
      await api.post('/transactions', {
        date: txDate,
        description: txDesc,
        amount: parseFloat(txAmount),
        type: txType,
        category: txCategory
      });
      showToast("Transaction added successfully!");
      setIsAddOpen(false);
      fetchTransactions();
    } catch (err) {
      showToast("Failed to add transaction.", "error");
    } finally {
      setCrudLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!txDate || !txDesc || !txAmount) {
      showToast("Please fill in all required fields.", "error");
      return;
    }
    
    setCrudLoading(true);
    try {
      await api.put(`/transactions/${activeTx.id}`, {
        date: txDate,
        description: txDesc,
        amount: parseFloat(txAmount),
        type: txType,
        category: txCategory
      });
      showToast("Transaction updated successfully!");
      setIsEditOpen(false);
      fetchTransactions();
    } catch (err) {
      showToast("Failed to update transaction.", "error");
    } finally {
      setCrudLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;
    
    try {
      await api.delete(`/transactions/${id}`);
      showToast("Transaction deleted.");
      fetchTransactions();
    } catch (err) {
      showToast("Failed to delete transaction.", "error");
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      showToast("Please select a CSV statement file first.", "error");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", uploadFile);

    try {
      const response = await api.post('/transactions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast(response.data.message);
      setUploadFile(null);
      // Reset input element
      document.getElementById("statement-file-input").value = "";
      fetchTransactions();
    } catch (err) {
      showToast(err.response?.data?.detail || "Bank statement ingestion failed.", "error");
    } finally {
      setUploading(false);
    }
  };

  const triggerExport = async () => {
    try {
      const response = await api.get('/transactions/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transactions_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showToast('CSV report exported successfully!', 'success');
    } catch (err) {
      console.error('Error exporting CSV:', err);
      showToast('Failed to export CSV report.', 'error');
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-6">
      
      {/* Title Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Transactions Directory</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Add, edit, search, or upload your bank statements.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            ➕ Manual Entry
          </button>
          <button
            onClick={triggerExport}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg shadow-sm dark:bg-gray-850 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            📤 Export CSV
          </button>
        </div>
      </div>

      {/* Row 1: Statement Upload Widget & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CSV Import Widget */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700 lg:col-span-1">
          <h4 className="text-sm font-bold border-b border-gray-100 pb-2 mb-3 dark:border-gray-700">Import Bank Statement</h4>
          <form onSubmit={handleUploadSubmit} className="space-y-3">
            <div>
              <p className="text-[10px] text-gray-500 mb-2 leading-normal dark:text-gray-400">
                Upload a standard CSV file with headers: <code className="bg-gray-100 px-1 dark:bg-gray-900 rounded font-mono">Date, Description, Amount, Transaction Type</code>. The AI model automatically cleans dates and categorizes costs.
              </p>
              <input
                id="statement-file-input"
                type="file"
                accept=".csv"
                onChange={(e) => setUploadFile(e.target.files[0])}
                className="block w-full text-xs text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/40 dark:file:text-blue-300 border border-gray-200 rounded-md p-1 dark:border-gray-700"
              />
            </div>
            <button
              type="submit"
              disabled={uploading}
              className="w-full flex justify-center py-2 border border-transparent rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {uploading ? "Ingesting data..." : "📥 Ingest Statement"}
            </button>
          </form>
        </div>

        {/* Filters Panel */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700 lg:col-span-2">
          <h4 className="text-sm font-bold border-b border-gray-100 pb-2 mb-3 dark:border-gray-700">Filter and Search</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* Search Input */}
            <div className="md:col-span-2 flex flex-col justify-end">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Search description</label>
              <input
                type="text"
                className="rounded-lg px-3 py-1.5 border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Walmart, salary, gas..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-col justify-end">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category</label>
              <select
                className="rounded-lg px-2 py-1.5 border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-gray-900 focus:outline-none"
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex flex-col justify-end">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Type</label>
              <select
                className="rounded-lg px-2 py-1.5 border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-gray-900 focus:outline-none"
                value={type}
                onChange={(e) => { setType(e.target.value); setPage(1); }}
              >
                <option value="">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            {/* Anomaly Filter */}
            <div className="flex flex-col justify-end">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Anomaly status</label>
              <select
                className="rounded-lg px-2 py-1.5 border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-gray-900 focus:outline-none"
                value={isAnomaly}
                onChange={(e) => { setIsAnomaly(e.target.value); setPage(1); }}
              >
                <option value="">All Transactions</option>
                <option value="true">Suspicious Only</option>
                <option value="false">Normal Only</option>
              </select>
            </div>

            {/* Sort Field */}
            <div className="flex flex-col justify-end">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sort By</label>
              <select
                className="rounded-lg px-2 py-1.5 border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-gray-900 focus:outline-none"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="flex flex-col justify-end">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Order</label>
              <select
                className="rounded-lg px-2 py-1.5 border border-gray-300 dark:border-gray-700 text-xs bg-white dark:bg-gray-900 focus:outline-none"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>

          </div>
        </div>

      </div>

      {/* Row 2: Transactions Table Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
        
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
          </div>
        ) : transactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700 text-xs text-left">
              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5 text-right">Amount</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{tx.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-800 dark:text-gray-200">{tx.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 font-medium">
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap capitalize font-medium">{tx.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-900 dark:text-white">
                      ₹{tx.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {tx.is_anomaly ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 rounded font-semibold animate-pulse">
                          Suspicious Outlier
                        </span>
                      ) : (
                        <span className="text-gray-400 font-semibold">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center space-x-3">
                      <button onClick={() => handleOpenEdit(tx)} className="text-blue-600 hover:text-blue-800 font-semibold">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(tx.id)} className="text-red-600 hover:text-red-800 font-semibold">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-4xl mb-2">📁</div>
            <p className="text-sm font-bold">No transactions found</p>
            <p className="text-xs text-gray-400 mt-1">Try resetting your filters or manually add a new transaction.</p>
          </div>
        )}

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div className="bg-gray-50 border-t border-gray-100 px-6 py-3.5 flex items-center justify-between dark:bg-gray-900 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing page <b>{page}</b> of <b>{totalPages}</b> (Total: {totalCount} records)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded text-xs hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 transition-colors font-semibold"
              >
                &larr; Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded text-xs hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 transition-colors font-semibold"
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}

      </div>

      {/* --- ADD TRANSACTION MODAL --- */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl space-y-4">
            <h3 className="text-base font-bold border-b pb-2">Add Transaction Record</h3>
            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              
              <div>
                <label className="block font-bold text-gray-500 mb-1">Date</label>
                <input
                  type="date"
                  required
                  className="w-full rounded border p-2 bg-transparent focus:ring-2 focus:ring-blue-500"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 mb-1">Description</label>
                <input
                  type="text"
                  required
                  className="w-full rounded border p-2 bg-transparent placeholder-gray-400"
                  placeholder="E.g., Starbucks Coffee"
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-500 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    className="w-full rounded border p-2 bg-transparent"
                    placeholder="25.50"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-500 mb-1">Type</label>
                  <select
                    className="w-full rounded border p-2 bg-white dark:bg-gray-900"
                    value={txType}
                    onChange={(e) => setTxType(e.target.value)}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>

              {txType === 'expense' && (
                <div>
                  <label className="block font-bold text-gray-500 mb-1">Category</label>
                  <select
                    className="w-full rounded border p-2 bg-white dark:bg-gray-900"
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                  >
                    <option value="Auto">✨ Auto-Classify (AI)</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={crudLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-semibold"
                >
                  {crudLoading ? "Saving..." : "Save Record"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- EDIT TRANSACTION MODAL --- */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl space-y-4">
            <h3 className="text-base font-bold border-b pb-2">Edit Transaction Record</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              
              <div>
                <label className="block font-bold text-gray-500 mb-1">Date</label>
                <input
                  type="date"
                  required
                  className="w-full rounded border p-2 bg-transparent focus:ring-2 focus:ring-blue-500"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-bold text-gray-500 mb-1">Description</label>
                <input
                  type="text"
                  required
                  className="w-full rounded border p-2 bg-transparent"
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-500 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    className="w-full rounded border p-2 bg-transparent"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-500 mb-1">Type</label>
                  <select
                    className="w-full rounded border p-2 bg-white dark:bg-gray-900"
                    value={txType}
                    onChange={(e) => setTxType(e.target.value)}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-500 mb-1">Category</label>
                <select
                  className="w-full rounded border p-2 bg-white dark:bg-gray-900"
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                >
                  {txType === 'income' ? (
                    <option value="Income">Income</option>
                  ) : (
                    <>
                      <option value="Auto">✨ Auto-Classify (AI)</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </>
                  )}
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={crudLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-semibold"
                >
                  {crudLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
