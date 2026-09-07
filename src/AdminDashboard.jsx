import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://192.168.1.7:5001";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    totalDeposits: 0,
    pendingDeposits: 0,
    approvedDeposits: 0,
    totalWithdrawals: 0,
    pendingWithdrawals: 0,
    totalBalance: 0,
    todayEarnings: 0,
    totalPlans: 0,
    activePlans: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`${API_URL}/api/admin/dashboard-stats`);
      const data = await response.json();
      if (data.success) {
        
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon, label, value, color }) => (
    <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-info">
        <span className="stat-card-label">{label}</span>
        <strong className="stat-card-value">{value}</strong>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="stats-grid">
        <StatCard icon="👥" label="Total Users" value={stats.totalUsers} color="#3498db" />
        <StatCard icon="🟢" label="Active Users" value={stats.activeUsers} color="#2ecc71" />
        <StatCard icon="🆕" label="New Users Today" value={stats.newUsersToday} color="#f39c12" />
        <StatCard icon="💰" label="Total Deposits" value={`Rs ${stats.totalDeposits.toFixed(2)}`} color="#27ae60" />
        <StatCard icon="⏳" label="Pending Deposits" value={stats.pendingDeposits} color="#f39c12" />
        <StatCard icon="✅" label="Approved Deposits" value={stats.approvedDeposits} color="#2ecc71" />
        <StatCard icon="💳" label="Total Withdrawals" value={`Rs ${stats.totalWithdrawals.toFixed(2)}`} color="#e74c3c" />
        <StatCard icon="⏳" label="Pending Withdrawals" value={stats.pendingWithdrawals} color="#e67e22" />
        <StatCard icon="🏦" label="Platform Balance" value={`Rs ${stats.totalBalance.toFixed(2)}`} color="#8e44ad" />
        <StatCard icon="📈" label="Today's Earnings" value={`Rs ${stats.todayEarnings.toFixed(2)}`} color="#1abc9c" />
        <StatCard icon="📋" label="Total Plans" value={stats.totalPlans} color="#3498db" />
        <StatCard icon="✅" label="Active Plans" value={stats.activePlans} color="#2ecc71" />
      </div>

      <div className="dashboard-charts">
        <div className="chart-card">
          <h3>📊 Quick Actions</h3>
          <div className="quick-actions">
            <button className="quick-action-btn" onClick={() => window.location.hash = "deposits"}>
              💰 Pending Deposits ({stats.pendingDeposits})
            </button>
            <button className="quick-action-btn" onClick={() => window.location.hash = "withdrawals"}>
              💳 Pending Withdrawals ({stats.pendingWithdrawals})
            </button>
            <button className="quick-action-btn" onClick={() => window.location.hash = "users"}>
              👥 View All Users
            </button>
            <button className="quick-action-btn" onClick={() => window.location.hash = "plans"}>
              📋 Add New Plan
            </button>
          </div>
        </div>

        <div className="chart-card">
          <h3>📈 Platform Summary</h3>
          <div className="summary-items">
            <div className="summary-item">
              <span>Total Users</span>
              <strong>{stats.totalUsers}</strong>
            </div>
            <div className="summary-item">
              <span>Active Plans</span>
              <strong>{stats.activePlans}</strong>
            </div>
            <div className="summary-item">
              <span>Total Balance</span>
              <strong>Rs {stats.totalBalance.toFixed(2)}</strong>
            </div>
            <div className="summary-item">
              <span>Today's Earnings</span>
              <strong>Rs {stats.todayEarnings.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
