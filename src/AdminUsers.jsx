import { useState, useEffect } from "react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://192.168.1.7:5001";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  useEffect(() => {
    fetchUsers();

    const interval = setInterval(() => {
      fetchUsers();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // ==========================================================
  // FETCH USERS
  // ==========================================================

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(
        `${API_URL}/api/admin/users`
      );

      const data = await response.json();

      if (data.success) {
        setUsers(data.users || []);
      } else {
        console.error(
          "Users API error:",
          data.message
        );
      }
    } catch (error) {
      console.error(
        "Error fetching users:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // BLOCK / UNBLOCK
  // ==========================================================

  const handleBlockUser = async (
    userId,
    currentStatus
  ) => {
    const action = currentStatus
      ? "unblock"
      : "block";

    if (
      !window.confirm(
        `Are you sure you want to ${action} this user?`
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(
        `${API_URL}/api/admin/user/block`,
        {
          method: "POST",
         

headers: {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
},
          body: JSON.stringify({
            userId,
            block: !currentStatus,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        await fetchUsers();

        if (
          selectedUser &&
          selectedUser.id === userId
        ) {
          setShowUserModal(false);
          setSelectedUser(null);
        }
      } else {
        alert(
          data.message ||
            "Failed to update user status"
        );
      }
    } catch (error) {
      console.error(
        "Error blocking user:",
        error
      );

      alert("Server error");
    }
  };

  // ==========================================================
  // SEARCH
  // ==========================================================

  const filteredUsers = users.filter((user) => {
    const searchText =
      search.toLowerCase().trim();

    return (
      user.name
        ?.toLowerCase()
        .includes(searchText) ||
      user.email
        ?.toLowerCase()
        .includes(searchText) ||
      user.phone
        ?.toLowerCase()
        .includes(searchText)
    );
  });

  // ==========================================================
  // HELPERS
  // ==========================================================

  const money = (value) =>
    `Rs ${parseFloat(value || 0).toFixed(2)}`;

  const formatDate = (value) => {
    if (!value) return "N/A";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "N/A";
    }

    return date.toLocaleString();
  };

  const openUser = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="admin-users">

      {/* =====================================================
          TOOLBAR
          ===================================================== */}

      <div className="admin-toolbar">

        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

          <span>🔍</span>
        </div>

        <div className="admin-toolbar-actions">
          <span>
            Total: {filteredUsers.length} users
          </span>

          <button
            className="quick-action-btn"
            onClick={fetchUsers}
          >
            🔄 Refresh
          </button>
        </div>

      </div>

      {/* =====================================================
          USERS TABLE
          ===================================================== */}

      <div className="users-table-container">

        <table className="admin-table">

          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Balance</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Withdrawal Setup</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            {filteredUsers.length === 0 ? (

              <tr>
                <td
                  colSpan="9"
                  style={{
                    textAlign: "center",
                    padding: "30px",
                  }}
                >
                  No users found
                </td>
              </tr>

            ) : (

              filteredUsers.map((user) => (

                <tr key={user.id}>

                  <td>
                    #{user.id}
                  </td>

                  {/* USER */}

                  <td>
                    <div className="user-cell">

                      <div className="user-avatar">
                        {user.name
                          ?.charAt(0)
                          ?.toUpperCase() || "U"}
                      </div>

                      <div>
                        <strong>
                          {user.name || "Unknown"}
                        </strong>

                        <small>
                          {user.email_verified
                            ? "✅ Email Verified"
                            : "⚠️ Email Not Verified"}
                        </small>
                      </div>

                    </div>
                  </td>

                  {/* EMAIL */}

                  <td>
                    {user.email}
                  </td>

                  {/* PHONE */}

                  <td>
                    {user.phone || "N/A"}
                  </td>

                  {/* BALANCE */}

                  <td>
                    <strong>
                      {money(user.balance)}
                    </strong>
                  </td>

                  {/* PLAN */}

                  <td>

                    {user.active_plan_count > 0 ? (

                      <span className="status-badge verified">
                        📋{" "}
                        {user.active_plan_count}
                        {" "}
                        Active
                      </span>

                    ) : (

                      <span className="status-badge pending">
                        No Active Plan
                      </span>

                    )}

                  </td>

                  {/* STATUS */}

                  <td>

                    <span
                      className={`status-badge ${
                        user.is_blocked
                          ? "blocked"
                          : "active"
                      }`}
                    >
                      {user.is_blocked
                        ? "🔴 Blocked"
                        : "🟢 Active"}
                    </span>

                  </td>

                  {/* WITHDRAWAL SETUP */}

                  <td>

                    {user.is_account_setup ? (

                      <span className="status-badge verified">
                        ✅ Setup
                      </span>

                    ) : (

                      <span className="status-badge pending">
                        ⏳ Pending
                      </span>

                    )}

                  </td>

                  {/* ACTIONS */}

                  <td>

                    <div className="action-buttons">

                      <button
                        className="action-btn view"
                        onClick={() =>
                          openUser(user)
                        }
                        title="View Complete User"
                      >
                        👁️
                      </button>

                      <button
                        className={`action-btn ${
                          user.is_blocked
                            ? "unblock"
                            : "block"
                        }`}
                        onClick={() =>
                          handleBlockUser(
                            user.id,
                            user.is_blocked
                          )
                        }
                        title={
                          user.is_blocked
                            ? "Unblock"
                            : "Block"
                        }
                      >
                        {user.is_blocked
                          ? "🔓"
                          : "🔒"}
                      </button>

                    </div>

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

      {/* =====================================================
          COMPLETE USER MODAL
          ===================================================== */}

      {showUserModal &&
        selectedUser && (

          <div
            className="admin-modal-overlay"
            onClick={() =>
              setShowUserModal(false)
            }
          >

            <div
              className="admin-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              <button
                className="modal-close"
                onClick={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                }}
              >
                ✕
              </button>

              <h2>
                👤 User Complete Details
              </h2>

              {/* =================================================
                  ACCOUNT
                  ================================================= */}

              <div className="user-detail-section">

                <h3>👤 Account Information</h3>

                <div className="user-details">

                  <Detail
                    label="User ID"
                    value={`#${selectedUser.id}`}
                  />

                  <Detail
                    label="Name"
                    value={
                      selectedUser.name ||
                      "N/A"
                    }
                  />

                  <Detail
                    label="Email"
                    value={
                      selectedUser.email ||
                      "N/A"
                    }
                  />

                  <Detail
                    label="Phone"
                    value={
                      selectedUser.phone ||
                      "N/A"
                    }
                  />

                  <Detail
                    label="CNIC"
                    value={
                      selectedUser.cnic ||
                      "N/A"
                    }
                  />

                  <Detail
                    label="Email Verification"
                    value={
                      selectedUser.email_verified
                        ? "✅ Verified"
                        : "❌ Not Verified"
                    }
                  />

                  <Detail
                    label="Account Status"
                    value={
                      selectedUser.is_blocked
                        ? "🔴 Blocked"
                        : "🟢 Active"
                    }
                  />

                  <Detail
                    label="Account Created"
                    value={formatDate(
                      selectedUser.created_at
                    )}
                  />

                  <Detail
                    label="Last Updated"
                    value={formatDate(
                      selectedUser.updated_at
                    )}
                  />

                </div>

              </div>

              {/* =================================================
                  WALLET
                  ================================================= */}

              <div className="user-detail-section">

                <h3>💰 Financial Information</h3>

                <div className="user-details">

                  <Detail
                    label="Current Balance"
                    value={money(
                      selectedUser.balance
                    )}
                  />

                  <Detail
                    label="Total Points"
                    value={
                      selectedUser.total_points ||
                      0
                    }
                  />

                  <Detail
                    label="Claimed Points"
                    value={
                      selectedUser.claimed_points ||
                      0
                    }
                  />

                  <Detail
                    label="Total Earnings"
                    value={money(
                      selectedUser.total_earnings
                    )}
                  />

                  <Detail
                    label="Total Plan Payments"
                    value={money(
                      selectedUser.total_plan_payments
                    )}
                  />

                  <Detail
                    label="Total Withdrawals"
                    value={money(
                      selectedUser.total_withdrawals
                    )}
                  />

                </div>

              </div>

              {/* =================================================
                  ACCOUNT SETUP
                  ================================================= */}

              <div className="user-detail-section">

                <h3>💳 Withdrawal Setup</h3>

                <div className="user-details">

                  <Detail
                    label="Setup Status"
                    value={
                      selectedUser.is_account_setup
                        ? "✅ Completed"
                        : "⏳ Pending"
                    }
                  />

                  <Detail
                    label="Setup Date"
                    value={formatDate(
                      selectedUser.account_setup_date
                    )}
                  />

                </div>

                {selectedUser
                  .payment_accounts
                  ?.length > 0 ? (

                  <div className="history-list">

                    {selectedUser.payment_accounts.map(
                      (account) => (

                        <div
                          className="history-card"
                          key={account.id}
                        >

                          <strong>
                            💳 {account.method}
                          </strong>

                          <div>
                            Account Name:{" "}
                            {account.account_name}
                          </div>

                          <div>
                            Account Number:{" "}
                            {account.account_number}
                          </div>

                        </div>

                      )
                    )}

                  </div>

                ) : (

                  <p>
                    No withdrawal account configured.
                  </p>

                )}

              </div>

              {/* =================================================
                  PLANS
                  ================================================= */}

              <div className="user-detail-section">

                <h3>
                  📋 Plans
                </h3>

                {selectedUser.plans?.length > 0 ? (

                  <div className="history-list">

                    {selectedUser.plans.map(
                      (plan) => (

                        <div
                          className="history-card"
                          key={plan.id}
                        >

                          <strong>
                            {plan.plan_name}
                          </strong>

                          <div>
                            Price:{" "}
                            {money(plan.price)}
                          </div>

                          <div>
                            Daily Earning:{" "}
                            {money(
                              plan.daily_earning
                            )}
                          </div>

                          <div>
                            Status:{" "}
                            {plan.status}
                          </div>

                          <div>
                            Start:{" "}
                            {formatDate(
                              plan.start_date
                            )}
                          </div>

                          <div>
                            End:{" "}
                            {formatDate(
                              plan.end_date
                            )}
                          </div>

                          <div>
                            Days Remaining:{" "}
                            {plan.days_remaining ||
                              0}
                          </div>

                          <div>
                            Total Earned:{" "}
                            {money(
                              plan.total_earned
                            )}
                          </div>

                          <div>
                            Payment ID:{" "}
                            {plan.payment_id ||
                              "N/A"}
                          </div>

                        </div>

                      )
                    )}

                  </div>

                ) : (

                  <p>
                    No plan purchased.
                  </p>

                )}

              </div>

              {/* =================================================
                  PAYMENT HISTORY
                  ================================================= */}

              <div className="user-detail-section">

                <h3>
                  💰 Plan Payment History
                </h3>

                {selectedUser.payment_history
                  ?.length > 0 ? (

                  <div className="history-list">

                    {selectedUser.payment_history.map(
                      (payment) => (

                        <div
                          className="history-card"
                          key={payment.id}
                        >

                          <strong>
                            {money(
                              payment.amount
                            )}
                          </strong>

                          <div>
                            Method:{" "}
                            {payment.payment_method}
                          </div>

                          <div>
                            Plan ID:{" "}
                            {payment.plan_id ||
                              "N/A"}
                          </div>

                          <div>
                            Reference:{" "}
                            {payment.reference_id ||
                              "N/A"}
                          </div>

                          <div>
                            Status:{" "}
                            {payment.status}
                          </div>

                          <div>
                            Date:{" "}
                            {formatDate(
                              payment.created_at
                            )}
                          </div>

                        </div>

                      )
                    )}

                  </div>

                ) : (

                  <p>
                    No payment history.
                  </p>

                )}

              </div>

              {/* =================================================
                  WITHDRAWAL HISTORY
                  ================================================= */}

              <div className="user-detail-section">

                <h3>
                  💸 Withdrawal History
                </h3>

                {selectedUser.withdrawal_history
                  ?.length > 0 ? (

                  <div className="history-list">

                    {selectedUser.withdrawal_history.map(
                      (withdrawal) => (

                        <div
                          className="history-card"
                          key={withdrawal.id}
                        >

                          <strong>
                            {money(
                              withdrawal.amount
                            )}
                          </strong>

                          <div>
                            Method:{" "}
                            {withdrawal.method}
                          </div>

                          <div>
                            Account Name:{" "}
                            {withdrawal.account_name ||
                              "N/A"}
                          </div>

                          <div>
                            Account Number:{" "}
                            {withdrawal.account_number ||
                              "N/A"}
                          </div>

                          <div>
                            Status:{" "}
                            {withdrawal.status}
                          </div>

                          <div>
                            Date:{" "}
                            {formatDate(
                              withdrawal.created_at
                            )}
                          </div>

                        </div>

                      )
                    )}

                  </div>

                ) : (

                  <p>
                    No withdrawal history.
                  </p>

                )}

              </div>

              {/* =================================================
                  EARNINGS HISTORY
                  ================================================= */}

              <div className="user-detail-section">

                <h3>
                  📈 Earnings History
                </h3>

                {selectedUser.earnings_history
                  ?.length > 0 ? (

                  <div className="history-list">

                    {selectedUser.earnings_history.map(
                      (earning) => (

                        <div
                          className="history-card"
                          key={earning.id}
                        >

                          <strong>
                            +{" "}
                            {money(
                              earning.amount
                            )}
                          </strong>

                          <div>
                            {earning.description ||
                              "Daily earning"}
                          </div>

                          <div>
                            Status:{" "}
                            {earning.status}
                          </div>

                          <div>
                            Reference:{" "}
                            {earning.reference ||
                              "N/A"}
                          </div>

                          <div>
                            Date:{" "}
                            {formatDate(
                              earning.created_at
                            )}
                          </div>

                        </div>

                      )
                    )}

                  </div>

                ) : (

                  <p>
                    No earnings yet.
                  </p>

                )}

              </div>

              {/* =================================================
                  REFERRAL
                  ================================================= */}

              <div className="user-detail-section">

                <h3>
                  👥 Referral Information
                </h3>

                <div className="user-details">

                  <Detail
                    label="Referral Code"
                    value={
                      selectedUser.referral_code ||
                      "N/A"
                    }
                  />

                  <Detail
                    label="Referred By User ID"
                    value={
                      selectedUser.referred_by ||
                      "None"
                    }
                  />

                  <Detail
                    label="Total Referrals"
                    value={
                      selectedUser.total_referrals ||
                      0
                    }
                  />

                  <Detail
                    label="Referral Points"
                    value={
                      selectedUser.referral_points ||
                      0
                    }
                  />

                </div>

              </div>

            </div>

          </div>

        )}

    </div>
  );
}

// ============================================================
// DETAIL COMPONENT
// ============================================================

function Detail({ label, value }) {
  return (
    <div className="user-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}