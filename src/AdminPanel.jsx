import { useState, useEffect } from "react";
import "./admin.css";

const API_URL = import.meta.env.VITE_API_URL || "https://ads-watching-api.onrender.com";

// Components
import AdminDashboard from "./AdminDashboard";
import AdminUsers from "./AdminUsers";
import AdminDeposits from "./AdminDeposits";
import AdminWithdrawals from "./AdminWithdrawals";
import AdminTransactions from "./AdminTransactions";
import AdminPlans from "./AdminPlans";
import AdminSettings from "./AdminSettings";
import AdminActivity from "./AdminActivity";

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Admin login check
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("admin_logged_in") === "true";
  });

  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState("");

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAdminError("");

    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: adminEmail,
          password: adminPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("admin_logged_in", "true");
        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("admin_data", JSON.stringify(data.admin));
        setIsLoggedIn(true);
        setAdminError("");
      } else {
        setAdminError(data.message || "Invalid admin credentials");
      }
    } catch (error) {
      console.error("Admin login error:", error);
      setAdminError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem("admin_logged_in");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("admin_data");
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-container">
          <div className="admin-login-header">
            <h1>🛠️ Admin Panel</h1>
            <p>ADS WATCHING - Admin Login</p>
          </div>
          <form onSubmit={handleAdminLogin} className="admin-login-form">
            {adminError && (
              <div className="admin-login-error">{adminError}</div>
            )}
            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="admin@adswatching.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="admin-login-btn" disabled={loading}>
              {loading ? "Logging in..." : "Login to Admin Panel"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel-container">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <span>🛠️</span>
          <h2>Admin Panel</h2>
        </div>

        <nav className="admin-sidebar-nav">
          <button
            className={activeTab === "dashboard" ? "active" : ""}
            onClick={() => setActiveTab("dashboard")}
          >
            <span>📊</span> Dashboard
          </button>

          <button
            className={activeTab === "users" ? "active" : ""}
            onClick={() => setActiveTab("users")}
          >
            <span>👥</span> Users
          </button>

          <button
            className={activeTab === "deposits" ? "active" : ""}
            onClick={() => setActiveTab("deposits")}
          >
            <span>💰</span> Deposits
          </button>

          <button
            className={activeTab === "withdrawals" ? "active" : ""}
            onClick={() => setActiveTab("withdrawals")}
          >
            <span>💳</span> Withdrawals
          </button>

          <button
            className={activeTab === "transactions" ? "active" : ""}
            onClick={() => setActiveTab("transactions")}
          >
            <span>📋</span> Transactions
          </button>

          <button
            className={activeTab === "plans" ? "active" : ""}
            onClick={() => setActiveTab("plans")}
          >
            <span>📈</span> Plans
          </button>

          <button
            className={activeTab === "activity" ? "active" : ""}
            onClick={() => setActiveTab("activity")}
          >
            <span>📝</span> Admin Activity
          </button>

          <button
            className={activeTab === "settings" ? "active" : ""}
            onClick={() => setActiveTab("settings")}
          >
            <span>⚙️</span> Settings
          </button>

          <button className="logout-btn" onClick={handleAdminLogout}>
            <span>🚪</span> Logout
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-header-title">
            <h1>
              {activeTab === "dashboard" && "📊 Dashboard"}
              {activeTab === "users" && "👥 Users Management"}
              {activeTab === "deposits" && "💰 Deposits"}
              {activeTab === "withdrawals" && "💳 Withdrawals"}
              {activeTab === "transactions" && "📋 Transactions"}
              {activeTab === "plans" && "📈 Plans"}
              {activeTab === "activity" && "📝 Admin Activity"}
              {activeTab === "settings" && "⚙️ Settings"}
            </h1>
            <span className="admin-date">{new Date().toLocaleString()}</span>
          </div>
        </header>

        {message.text && (
          <div className={`admin-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="admin-content">
          {activeTab === "dashboard" && <AdminDashboard />}
          {activeTab === "users" && <AdminUsers />}
          {activeTab === "deposits" && <AdminDeposits />}
          {activeTab === "withdrawals" && <AdminWithdrawals />}
          {activeTab === "transactions" && <AdminTransactions />}
          {activeTab === "plans" && <AdminPlans />}
          {activeTab === "activity" && <AdminActivity />}
          {activeTab === "settings" && <AdminSettings />}
        </div>
      </main>
    </div>
  );
}

