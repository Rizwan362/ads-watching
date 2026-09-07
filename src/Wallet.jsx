
import { useState, useEffect } from "react";
import "./wallet.css";

const API_URL = "http://192.168.170.65:5001";

export default function Wallet({ user }) {
  const [balance, setBalance] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [withdrawHistory, setWithdrawHistory] = useState([]);
  const [withdrawPassword, setWithdrawPassword] = useState("");

  useEffect(() => {
    if (user) {
      fetchBalance();
      fetchWithdrawHistory();
    }
  }, [user]);

  // Fetch user balance
  const fetchBalance = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/user/points/${user.id}`
      );

      const data = await response.json();

      if (data.success) {
        setBalance(data.data.balance || 0);
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  // Fetch withdraw history
  const fetchWithdrawHistory = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/withdraw/history/${user.id}`
      );

      const data = await response.json();

      if (data.success) {
        setWithdrawHistory(data.requests || []);
      }
    } catch (error) {
      console.error("Error fetching withdraw history:", error);
    }
  };

  // Handle withdraw request
  const handleWithdraw = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage({ type: "", text: "" });

    const amount = parseFloat(withdrawAmount);

    if (!amount || amount < 100) {
      setMessage({
        type: "error",
        text: "Minimum withdrawal is Rs 100",
      });

      setLoading(false);
      return;
    }

    if (amount > balance) {
      setMessage({
        type: "error",
        text: "Insufficient balance",
      });

      setLoading(false);
      return;
    }

    if (!accountNumber.trim()) {
      setMessage({
        type: "error",
        text: "Payment account is not configured.",
      });

      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/withdraw/request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            amount: amount,
            accountNumber: accountNumber.trim(),
            accountName: accountName.trim() || user.name,
            method: user?.payment_method,
            password: withdrawPassword,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: "Withdrawal request submitted! Admin will process within 24 hours.",
        });

        setWithdrawAmount("");
        setWithdrawPassword("");

        await fetchBalance();
        await fetchWithdrawHistory();
      } else {
        setMessage({
          type: "error",
          text: data.message || "Withdrawal failed",
        });
      }
    } catch (error) {
      console.error("Withdraw error:", error);

      setMessage({
        type: "error",
        text: "Server error. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollToWithdraw = () => {
    document
      .getElementById("withdraw-section")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  const scrollToHistory = () => {
    document
      .getElementById("history-section")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  return (
    <div className="wallet-page">

      {/* PAGE HEADER */}
      <div className="wallet-header">
        <div className="wallet-header-icon">💼</div>

        <div>
          <h1>My Wallet</h1>

          <p>
            Manage your balance, withdraw funds and track your transactions.
          </p>
        </div>
      </div>

      {/* TOP SECTION */}
      <div className="wallet-top-grid">

        {/* BALANCE CARD */}
        <div className="wallet-balance-card">

          <div className="balance-content">

            <div className="balance-icon">
              💳
            </div>

            <div>

              <span className="balance-title">
                AVAILABLE BALANCE
              </span>

              <div className="balance-amount">

                <span className="currency">
                  Rs
                </span>

                <span className="amount">
                  {balance.toFixed(2)}
                </span>

              </div>

              <p className="balance-label">
                Your current wallet balance
              </p>

            </div>

          </div>

          <div className="balance-decoration">
            💰
          </div>

        </div>

        {/* ACTION BUTTONS */}
        <div className="wallet-action-panel">

          <button
            className="wallet-action-btn withdraw-action"
            type="button"
            onClick={scrollToWithdraw}
          >

            <span className="action-icon">
              ↗
            </span>

            <span>
              <strong>
                Withdraw
              </strong>

              <small>
                Request withdrawal
              </small>
            </span>

            <b>
              ›
            </b>

          </button>

          <button
            className="wallet-action-btn transaction-action"
            type="button"
            onClick={scrollToHistory}
          >

            <span className="action-icon">
              ◷
            </span>

            <span>
              <strong>
                Transactions
              </strong>

              <small>
                View all activity
              </small>
            </span>

            <b>
              ›
            </b>

          </button>

        </div>

      </div>

      {/* MESSAGE */}
      {message.text && (
        <div className={`wallet-message ${message.type}`}>

          <span>
            {message.type === "success" ? "✓" : "!"}
          </span>

          {message.text}

        </div>
      )}

      {/* WITHDRAW SECTION */}
      <div
        className="wallet-withdraw-card"
        id="withdraw-section"
      >

        <div className="withdraw-header">

          <div>

            <h2>
              Withdraw Funds
            </h2>

            <p>
              Submit your withdrawal request securely.
            </p>

          </div>

          <div className="minimum-badge">
            Min Rs 100
          </div>

        </div>

        <form onSubmit={handleWithdraw}>

          {/* BOUND PAYMENT METHOD */}
          <div className="selected-method-info">

            <span>
              Bound Payment Account
            </span>

            <strong>
              {user?.payment_method || "Not configured"}
            </strong>

          </div>

          {/* ACCOUNT NUMBER */}
          <div className="input-group">

            <label>
              Account Number
            </label>

            <input
              type="text"
              placeholder="Your saved account number"
              value={accountNumber}
              onChange={(e) =>
                setAccountNumber(
                  e.target.value.replace(/\D/g, "")
                )
              }
              required
            />

          </div>

          {/* WITHDRAW PASSWORD */}
          <div className="input-group">

            <label>
              Withdraw Password
            </label>

            <input
              type="password"
              placeholder="Enter your withdraw password"
              value={withdrawPassword}
              onChange={(e) =>
                setWithdrawPassword(e.target.value)
              }
              required
            />

          </div>

          {/* ACCOUNT NAME */}
          <div className="input-group">

            <label>
              Account Holder Name
            </label>

            <input
              type="text"
              placeholder="Your full name"
              value={accountName}
              onChange={(e) =>
                setAccountName(e.target.value)
              }
            />

          </div>

          {/* AMOUNT */}
          <div className="input-group">

            <label>
              Withdrawal Amount (Rs)
            </label>

            <input
              type="number"
              placeholder="Enter amount"
              value={withdrawAmount}
              onChange={(e) =>
                setWithdrawAmount(e.target.value)
              }
              min="100"
              max={balance}
              required
            />

            <small className="max-amount">
              Available: Rs {balance.toFixed(2)}
            </small>

          </div>

          <button
            type="submit"
            className="withdraw-btn"
            disabled={loading}
          >

            <span>
              ↗
            </span>

            {loading
              ? "Processing..."
              : "Submit Withdraw Request"}

          </button>

        </form>

      </div>

      {/* SECURITY CARD */}
      <div className="wallet-security">

        <div className="security-icon">
          🛡
        </div>

        <div>

          <h3>
            100% Secure
          </h3>

          <p>
            Your withdrawal requests and transactions are protected.
          </p>

        </div>

      </div>

      {/* WITHDRAW HISTORY */}
      <div
        className="withdraw-history"
        id="history-section"
      >

        <div className="history-heading">

          <div className="section-heading">

            <div className="section-icon">
              ◷
            </div>

            <div>

              <h2>
                Recent Wallet Activity
              </h2>

              <p>
                Your latest withdrawal transactions
              </p>

            </div>

          </div>

          <button
            type="button"
            className="refresh-history"
            onClick={fetchWithdrawHistory}
          >
            ↻ Refresh
          </button>

        </div>

        {withdrawHistory.length > 0 ? (

          <div className="history-list">

            {withdrawHistory.map((request) => (

              <div
                key={request.id}
                className="history-item"
              >

                <div className="history-left">

                  <div className="transaction-icon">
                    ↗
                  </div>

                  <div>

                    <strong>
                      Rs{" "}
                      {parseFloat(
                        request.amount
                      ).toFixed(2)}
                    </strong>

                    <small>

                      {request.method} •{" "}

                      {new Date(
                        request.created_at
                      ).toLocaleDateString()}

                    </small>

                  </div>

                </div>

                <span
                  className={`status-badge status-${request.status}`}
                >

                  {request.status === "pending" &&
                    "Pending"}

                  {request.status === "approved" &&
                    "Approved"}

                  {request.status === "rejected" &&
                    "Rejected"}

                </span>

              </div>

            ))}

          </div>

        ) : (

          <div className="wallet-empty">

            <div className="empty-icon">
              ▤
            </div>

            <h3>
              No wallet transactions yet.
            </h3>

            <p>
              Your activity will appear here once you make a withdrawal.
            </p>

          </div>

        )}

      </div>

    </div>
  );
}

