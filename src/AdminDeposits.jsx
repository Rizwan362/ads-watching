import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://192.168.1.7:5001";

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`${API_URL}/api/admin/deposits`);
      const data = await response.json();
      if (data.success) {
        setDeposits(data.deposits);
      }
    } catch (error) {
      console.error("Error fetching deposits:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (depositId) => {
    if (!confirm("Approve this deposit? This will activate the plan and start daily earnings.")) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/deposit/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositId }),
      });
      const data = await response.json();
      if (data.success) {
        alert("✅ Deposit approved! Plan activated. Earnings will start in 24 hours.");
        fetchDeposits();
      } else {
        alert("❌ " + (data.message || "Failed to approve"));
      }
    } catch (error) {
      console.error("Error approving deposit:", error);
      alert("❌ Server error");
    }
  };

  const handleReject = async (depositId) => {
    const reason = prompt("Enter rejection reason:");
    if (reason === null) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/deposit/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depositId, reason: reason || "No reason provided" }),
      });
      const data = await response.json();
      if (data.success) {
        alert("❌ Deposit rejected");
        fetchDeposits();
      }
    } catch (error) {
      console.error("Error rejecting deposit:", error);
    }
  };

  const filteredDeposits = deposits.filter(deposit =>
    filter === "all" ? true : deposit.status === filter
  );

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading deposits...</p>
      </div>
    );
  }

  return (
    <div className="admin-deposits">
      <div className="admin-toolbar">
        <div className="filter-buttons">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All ({deposits.length})
          </button>
          <button
            className={filter === "pending" ? "active" : ""}
            onClick={() => setFilter("pending")}
          >
            ⏳ Pending ({deposits.filter(d => d.status === "pending").length})
          </button>
          <button
            className={filter === "verified" ? "active" : ""}
            onClick={() => setFilter("verified")}
          >
            ✅ Verified ({deposits.filter(d => d.status === "verified").length})
          </button>
          <button
            className={filter === "rejected" ? "active" : ""}
            onClick={() => setFilter("rejected")}
          >
            ❌ Rejected ({deposits.filter(d => d.status === "rejected").length})
          </button>
        </div>
        <button className="refresh-btn" onClick={fetchDeposits}>
          🔄 Refresh
        </button>
      </div>

      <div className="deposits-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Account</th>
              <th>Reference</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeposits.length === 0 ? (
              <tr>
                <td colSpan="10" className="no-data">No deposits found</td>
              </tr>
            ) : (
              filteredDeposits.map((deposit) => (
                <tr key={deposit.id}>
                  <td>#{deposit.id}</td>
                  <td>
                    <strong>{deposit.user_name || "Unknown"}</strong>
                    <br />
                    <small>{deposit.user_email}</small>
                  </td>
                  <td>{deposit.plan_name || "N/A"}</td>
                  <td><strong>Rs {parseFloat(deposit.amount).toFixed(2)}</strong></td>
                  <td>{deposit.payment_method}</td>
                  <td>{deposit.account_number || "N/A"}</td>
                  <td><small>{deposit.reference_id || "N/A"}</small></td>
                  <td><small>{new Date(deposit.created_at).toLocaleDateString()}</small></td>
                  <td>
                    <span className={`status-badge ${deposit.status}`}>
                      {deposit.status === "pending" && "⏳ Pending"}
                      {deposit.status === "verified" && "✅ Verified"}
                      {deposit.status === "rejected" && "❌ Rejected"}
                    </span>
                  </td>
                  <td>
                    {deposit.status === "pending" && (
                      <div className="action-buttons">
                        <button
                          className="action-btn approve"
                          onClick={() => handleApprove(deposit.id)}
                          title="Approve and activate plan"
                        >
                          ✅ Approve
                        </button>
                        <button
                          className="action-btn reject"
                          onClick={() => handleReject(deposit.id)}
                          title="Reject this deposit"
                        >
                          ❌ Reject
                        </button>
                      </div>
                    )}
                    {deposit.status === "verified" && (
                      <span className="status-done">✓ Done</span>
                    )}
                    {deposit.status === "rejected" && (
                      <span className="status-done">✗ Rejected</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
