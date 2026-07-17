# WealthWise AI - AI-Powered Personal Finance Assistant

An academic, final-semester project that leverages Machine Learning (NLP, Regression, and Isolation Forests) to help users analyze transaction histories, forecast next month's spending, flag unusual expenses, configure monthly budgets, and download comprehensive financial PDF reports.

---

## 📂 Project Structure

```
second project/
├── backend/
│   ├── app/
│   │   ├── api/             # REST Endpoint routers (Auth, Transactions, Budgets, ML, Insights, PDF Reports)
│   │   ├── core/            # App settings, security functions, database session mappings
│   │   ├── models/          # SQLite database schema models
│   │   ├── schemas/         # Pydantic input/output schemas
│   │   ├── services/        # Business logic services (ML forecasting, PDF generation, AI Insights)
│   │   └── main.py          # FastAPI application entrypoint
│   └── requirements.txt     # Python requirements
├── frontend/
│   ├── src/
│   │   ├── components/      # Shared elements
│   │   ├── context/         # Auth session contexts
│   │   ├── pages/           # Landing, Auth, Dashboard, Transactions, and Profile pages
│   │   ├── services/        # Axios API configurations
│   │   ├── App.jsx          # React app routes, theme management, notification banners
│   │   └── index.css        # Tailwind CSS styles and dark mode layer
│   ├── package.json         # Frontend configuration
│   ├── tailwind.config.js   # Tailwind custom theme setup
│   └── vite.config.js       # Vite bundler configs
├── model/                   # Trained Scikit-learn model binaries (.pkl files)
├── database/                # SQLite local DB, uploaded photos, and persistent PDF reports
├── datasets/                # Synthetic transactions CSV and data generator script
└── README.md                # Project documentation
```

---

## 🚀 Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js v18+ & npm

### 1. Backend Setup & Startup
1. Open a terminal in the root directory:
   ```bash
   # Create a virtual environment
   python -m venv .venv
   
   # Activate virtual environment
   # On Windows (PowerShell):
   .venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source .venv/bin/activate
   
   # Install dependencies
   pip install -r requirements.txt
   ```
2. Generate the training dataset and train the ML models:
   ```bash
   python datasets/sample_data_generator.py
   python train_models.py
   ```
3. Start the FastAPI server:
   ```bash
   python -m uvicorn backend.app.main:app --port 8000 --reload
   ```
   *The backend will run on `http://localhost:8000`. Access Swagger docs at `http://localhost:8000/docs`.*

### 2. Frontend Setup & Startup
1. Open a new terminal in the `frontend/` directory:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   *The web application will launch on `http://localhost:5173`.*

---

## 🤖 Machine Learning Modules Explained

### 1. Expense Category Classification
- **Core Task**: Predict the category (`Food`, `Travel`, `Shopping`, `Bills`, `Medical`, `Entertainment`, `Education`, `Others`) for manual entries or bank statement descriptions (e.g. "Starbucks Coffee" -> "Food").
- **Featurizer**: **TF-IDF Vectorizer** (Term Frequency-Inverse Document Frequency). Converts words into numerical vectors by scoring relevance based on frequency in a row versus frequency across all records.
- **Model Comparison**: Combines **Random Forest Classifier** (ensemble of multiple decision trees using bootstrap aggregating to output majority classification vote) and **Logistic Regression**. The pipeline automatically compares accuracy and exports the model displaying the highest evaluation metrics.

### 2. Spending Prediction (Regression)
- **Core Task**: Forecast total expense amount for the upcoming month.
- **Features**: Lag-1 (previous month's expenses), Rolling-3 Average (mean spending of the last 3 months), and sequential Time Index.
- **Model Comparison**: Matches **Linear Regression** (fits a linear equation $Y = mX + C$ mapping trend vectors) against the **Random Forest Regressor** (ensemble of decision regression trees). The system evaluates both model metrics (Mean Absolute Error (MAE), Root Mean Squared Error (RMSE), and $R^2$ Variance Score) and adopts the superior one. Handles small datasets gracefully with a historical average fallback.

### 3. Anomaly Detection
- **Core Task**: Highlight outlier expense entries (unusually high amounts or mismatched spending patterns).
- **Model**: **Isolation Forest**. An unsupervised learning algorithm that isolates anomalies by recursively partitioning random numerical splits. Since outliers require fewer splits to isolate, they appear closer to the root of the decision trees, receiving negative anomaly scores. Flagged transactions display a "Suspicious Outlier" warning badge on the dashboard.

---

## 🔗 Key REST API Documentation

### Authentication
- `POST /api/auth/signup`: Create a user account.
- `POST /api/auth/login`: Verify credentials and issue JWT.
- `POST /api/auth/forgot-password`: Mock password update for demonstration.

### Profile & Budgets
- `GET /api/users/me`: Fetch profile.
- `POST /api/users/me/profile-picture`: Multipart upload of profile photo.
- `POST /api/budgets`: Configure monthly category thresholds.
- `GET /api/budgets`: Fetch active category budgets.

### Transactions & Uploads
- `GET /api/transactions`: Search, filter, and sort user transactions.
- `POST /api/transactions`: Create transaction. Predicts category automatically.
- `POST /api/transactions/upload`: Upload bank statements in CSV format.
- `GET /api/transactions/export`: Export database transactions as a CSV download.

### Machine Learning & Reports
- `POST /api/predictions/predict`: Train regression models and predict next month's spending.
- `POST /api/predictions/anomalies`: Fit Isolation Forest and flag outliers.
- `GET /api/insights`: Return category observances and saving recommendations.
- `POST /api/reports/generate`: Compile financial statistics, matplotlib trend charts, and anomalies into a PDF.
- `GET /api/reports/download/{id}`: Download generated PDF file response.

---

## 🔮 Future Scope
1. **Live Bank API Integrations**: Secure OAuth linking to real bank accounts (e.g., Plaid API) for real-time syncing.
2. **Investment Recommendations**: Add AI-based portfolio advisory modules.
3. **Multi-currency support**: Support currency conversions and foreign transaction auditing.
