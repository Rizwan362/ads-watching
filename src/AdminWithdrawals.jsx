import { useState, useEffect, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://192.168.1.7:5001";

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  // ============================================================
  // FETCH ALL WITHDRAWALS
  // ============================================================

  const fetchWithdrawals = useCallback(async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch(
        `${API_URL}/api/admin/withdrawals`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      console.log("ADMIN WITHDRAWALS RESPONSE:", data);

      if (!data.success) {
        throw new Error(data.message || "Failed to load withdrawals");
      }

      setWithdrawals(
  Array.isArray(data.withdrawals)
    ? data.withdrawals.filter((withdrawal) => withdrawal.status === "pending")
    : []
);
    } catch (err) {
      console.error("Error fetching withdrawals:", err);
      setError(err.message || "Unable to connect to withdrawal server");
      setWithdrawals([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  // ============================================================
  // APPROVE WITHDRAWAL
  // ============================================================

  const handleApprove = async (withdrawId) => {
    if (!withdrawId) {
      alert("Invalid withdrawal ID");
      return;
    }

    if (!window.confirm("Approve this withdrawal?")) {
      return;
    }

    try {
      setProcessingId(withdrawId);
      setError("");

      const response = await fetch(
        `${API_URL}/api/admin/withdraw/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
             Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
          body: JSON.stringify({
            withdrawId,
          }),
        }
      );

      const data = await response.json();

      console.log("APPROVE WITHDRAWAL RESPONSE:", data);

      if (!response.ok || !data.success) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

     alert(data.message || "Withdrawal approved successfully.");

setWithdrawals((current) =>
  current.filter((withdrawal) => String(withdrawal.id) !== String(withdrawId))
);

await fetchWithdrawals(true);
    } catch (err) {
      console.error("Error approving withdrawal:", err);
      alert(err.message || "Failed to approve withdrawal.");
    } finally {
      setProcessingId(null);
    }
  };

  // ============================================================
  // REJECT WITHDRAWAL
  // ============================================================

  const handleReject = async (withdrawId) => {
    if (!withdrawId) {
      alert("Invalid withdrawal ID");
      return;
    }

    const reason = window.prompt("Enter rejection reason:");

    if (!reason || !reason.trim()) {
      return;
    }

    try {
      setProcessingId(withdrawId);
      setError("");

      const response = await fetch(
        `${API_URL}/api/admin/withdraw/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            withdrawId,
            reason: reason.trim(),
          }),
        }
      );

      const data = await response.json();

      console.log("REJECT WITHDRAWAL RESPONSE:", data);

      if (!response.ok || !data.success) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      alert(data.message || "Withdrawal rejected successfully.");

      await fetchWithdrawals(true);
    } catch (err) {
      console.error("Error rejecting withdrawal:", err);
      alert(err.message || "Failed to reject withdrawal.");
    } finally {
      setProcessingId(null);
    }
  };

  // ============================================================
  // FILTERS
  // ============================================================

  const filteredWithdrawals = withdrawals.filter((withdraw) => {
    if (filter === "all") {
      return true;
    }

    return withdraw.status === filter;
  });

  const pendingCount = withdrawals.filter(
    (withdraw) => withdraw.status === "pending"
  ).length;

  const approvedCount = withdrawals.filter(
    (withdraw) => withdraw.status === "approved"
  ).length;

  const rejectedCount = withdrawals.filter(
    (withdraw) => withdraw.status === "rejected"
  ).length;

  // ============================================================
  // HELPERS
  // ============================================================

  const formatDate = (value) => {
    if (!value) {
      return "N/A";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "N/A";
    }

    return date.toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusLabel = (status) => {
    if (status === "pending") {
      return "⏳ Pending";
    }

    if (status === "approved") {
      return "✅ Approved";
    }

    if (status === "rejected") {
      return "❌ Rejected";
    }

    return status || "Unknown";
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading withdrawals...</p>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="admin-withdrawals">
      <div className="admin-toolbar">
        <div className="filter-buttons">
          <button
            type="button"
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All ({withdrawals.length})
          </button>

          <button
            type="button"
            className={filter === "pending" ? "active" : ""}
            onClick={() => setFilter("pending")}
          >
            Pending ({pendingCount})
          </button>

          <button
            type="button"
            className={filter === "approved" ? "active" : ""}
            onClick={() => setFilter("approved")}
          >
            Approved ({approvedCount})
          </button>

          <button
            type="button"
            className={filter === "rejected" ? "active" : ""}
            onClick={() => setFilter("rejected")}
          >
            Rejected ({rejectedCount})
          </button>
        </div>

        <button
          type="button"
          onClick={() => fetchWithdrawals(true)}
          disabled={refreshing}
          className="refresh-btn"
        >
          {refreshing ? "Refreshing..." : "🔄 Refresh"}
        </button>
      </div>

      {error && (
        <div className="admin-error">
          <strong>Error:</strong> {error}

          <button
            type="button"
            onClick={() => fetchWithdrawals(true)}
          >
            Try Again
          </button>
        </div>
      )}

      {!error && filteredWithdrawals.length === 0 && (
        <div className="admin-empty">
          <div className="empty-icon">💸</div>

          <h3>No withdrawals found</h3>

          <p>
            There are currently no withdrawals in this category.
          </p>

          <button
            type="button"
            onClick={() => fetchWithdrawals(true)}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      )}

      {filteredWithdrawals.length > 0 && (
        <div className="withdrawals-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Account</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredWithdrawals.map((withdraw) => {
                const isProcessing = processingId === withdraw.id;

                return (
                  <tr key={withdraw.id}>
                    <td>#{withdraw.id}</td>

                    <td>
                      <div className="withdraw-user">
                        <strong>
                          {withdraw.user_name ||
                            withdraw.name ||
                            "Unknown User"}
                        </strong>

                        {withdraw.user_email && (
                          <small>{withdraw.user_email}</small>
                        )}
                      </div>
                    </td>

                    <td>
                      <strong>
                        Rs{" "}
                        {parseFloat(withdraw.amount || 0).toFixed(2)}
                      </strong>
                    </td>

                    <td>{withdraw.method || "N/A"}</td>

                    <td>
                      <span className="account-number">
                        {withdraw.account_number || "N/A"}
                      </span>
                    </td>

                    <td>{formatDate(withdraw.created_at)}</td>

                    <td>
                      <span
                        className={`status-badge ${
                          withdraw.status || "unknown"
                        }`}
                      >
                        {getStatusLabel(withdraw.status)}
                      </span>
                    </td>

                    <td>
                      {withdraw.status === "pending" ? (
                        <div className="action-buttons">
                          <button
                            type="button"
                            className="action-btn approve"
                            onClick={() =>
                              handleApprove(withdraw.id)
                            }
                            disabled={isProcessing}
                            title="Approve withdrawal"
                          >
                            {isProcessing ? "..." : "✅"}
                          </button>

                          <button
                            type="button"
                            className="action-btn reject"
                            onClick={() =>
                              handleReject(withdraw.id)
                            }
                            disabled={isProcessing}
                            title="Reject withdrawal"
                          >
                            {isProcessing ? "..." : "❌"}
                          </button>
                        </div>
                      ) : (
                        <span className="action-completed">
                          Completed
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


