import { useState, useEffect } from "react";
import "./plans.css";

const API_URL = import.meta.env.VITE_API_URL || "http://192.168.1.7:5001";

export default function Plans({ user, onPlanPurchased }) {
  console.log("PLANS_COMPONENT_LOADED");

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [userPlans, setUserPlans] = useState([]);
  const [dailyEarnings, setDailyEarnings] = useState([]);
  const [message, setMessage] = useState({
    type: "",
    text: "",
  });
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [totalPoints, setTotalPoints] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [activePlanCount, setActivePlanCount] = useState(0);

  // ==========================================
  // LOAD DATA
  // ==========================================

  useEffect(() => {
    fetchPlans();

    if (user?.id) {
      fetchUserPlans();
      fetchDailyEarnings();
      fetchUserPoints();
      fetchActivePlanCount();
    }
  }, [user]);

  // ==========================================
  // FETCH PLANS
  // ==========================================

  const fetchPlans = async () => {
    console.log("PLANS_START");
    setPlansLoading(true);

    try {
      const url = `${API_URL}/api/plans`;
      console.log("PLANS_URL:", url);

      const response = await fetch(url);
      console.log("PLANS_STATUS:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("PLANS_DATA:", JSON.stringify(data));

      if (data.success && Array.isArray(data.plans)) {
        setPlans(data.plans);
        console.log("PLANS_COUNT:", data.plans.length);
      } else {
        setPlans([]);
        console.log("PLANS_INVALID");
      }
    } catch (error) {
      console.error("PLANS_ERROR:", error);
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  };

  // ==========================================
  // FETCH USER PLANS
  // ==========================================

  const fetchUserPlans = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(
        `${API_URL}/api/user/plans/${user.id}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      console.log("User plans:", data);

      if (data.success) {
        setUserPlans(data.plans || []);
      }
    } catch (error) {
      console.error("Error fetching user plans:", error);
    }
  };

  // ==========================================
  // FETCH ACTIVE PLAN COUNT
  // ==========================================

  const fetchActivePlanCount = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(
        `${API_URL}/api/user/active-plans/${user.id}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      console.log("Active plans count:", data);

      if (data.success) {
        const count = data.activeCount || 0;
        setActivePlanCount(count);
        if (onPlanPurchased) {
          onPlanPurchased(count);
        }
      }
    } catch (error) {
      console.error("Error fetching active plans:", error);
    }
  };

  // ==========================================
  // FETCH DAILY EARNINGS
  // ==========================================

  const fetchDailyEarnings = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(
        `${API_URL}/api/user/earnings/${user.id}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      console.log("Daily earnings:", data);

      if (data.success) {
        setDailyEarnings(data.earnings || []);
      }
    } catch (error) {
      console.error("Error fetching earnings:", error);
    }
  };

  // ==========================================
  // FETCH USER POINTS
  // ==========================================

  const fetchUserPoints = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(
        `${API_URL}/api/user/points/${user.id}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      console.log("User points:", data);

      if (data.success) {
        setTotalPoints(data.data?.total_points || 0);
        setWalletBalance(data.data?.balance || 0);
      }
    } catch (error) {
      console.error("Error fetching points:", error);
    }
  };

  // ==========================================
  // REFRESH ALL DATA
  // ==========================================

  const refreshAllData = async () => {
    await Promise.all([
      fetchUserPlans(),
      fetchDailyEarnings(),
      fetchUserPoints(),
      fetchActivePlanCount(),
      fetchPlans()
    ]);
  };

  // ==========================================
  // PURCHASE
  // ==========================================

  const handlePurchase = (planId) => {
    if (!user) {
      setMessage({
        type: "error",
        text: "Please login first",
      });
      return;
    }

    const plan = plans.find((p) => p.id === planId);

    if (!plan) {
      setMessage({
        type: "error",
        text: "Plan not found",
      });
      return;
    }

    setSelectedPlan(plan);
    setShowPaymentModal(true);
    setMessage({
      type: "",
      text: "",
    });

    setReferenceId("");
    setAccountNumber("");
    setAccountName("");
  };

  // ==========================================
  // PAYMENT REQUEST
  // ==========================================

  const processPayment = async (e) => {
    e.preventDefault();

    if (!selectedPlan || !user?.id) {
      setMessage({
        type: "error",
        text: "Invalid user or plan",
      });
      return;
    }

    setLoading(true);

    setMessage({
      type: "",
      text: "",
    });

    const cleanAccountNumber = accountNumber.replace(/\D/g, "");

    if (
      !cleanAccountNumber ||
      cleanAccountNumber.length < 10 ||
      cleanAccountNumber.length > 11
    ) {
      setMessage({
        type: "error",
        text: "Please enter a valid 10-11 digit EasyPaisa number",
      });

      setLoading(false);
      return;
    }

    if (!accountName || !/^[a-zA-Z\s]+$/.test(accountName)) {
      setMessage({
        type: "error",
        text: "Please enter your name",
      });

      setLoading(false);
      return;
    }

    try {
      const paymentData = {
        userId: user.id,
        planId: selectedPlan.id,
        paymentMethod: "EasyPaisa",
        accountNumber: cleanAccountNumber,
        accountName: accountName,
      };

      console.log("Payment request:", paymentData);

      const response = await fetch(
        `${API_URL}/api/payment/request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(paymentData),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      console.log("Payment response:", data);

      if (data.success) {
        setReferenceId(data.referenceId || "");

        setMessage({
          type: "success",
          text: `Payment request created successfully. Amount: Rs ${data.amount}`,
        });

        setAccountNumber("");
        setAccountName("");

        // Refresh after payment
        setTimeout(() => {
          refreshAllData();
        }, 1000);
      } else {
        setMessage({
          type: "error",
          text: data.message || "Payment request failed",
        });
      }
    } catch (error) {
      console.error("Payment error:", error);

      setMessage({
        type: "error",
        text: "Unable to connect to server",
      });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // CLAIM EARNING (DISABLED - Auto)
  // ==========================================

  const claimDailyEarning = async (earningId) => {
    try {
      const response = await fetch(
        `${API_URL}/api/user/claim-earning`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            earningId: earningId,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setMessage({
          type: "success",
          text: `Claimed successfully. +Rs ${data.amount} +${data.points} points`,
        });

        await refreshAllData();

        setTimeout(() => {
          setMessage({
            type: "",
            text: "",
          });
        }, 3000);
      } else {
        setMessage({
          type: "info",
          text: data.message || "Earnings are credited automatically every 24 hours.",
        });
      }
    } catch (error) {
      console.error("Claim earning error:", error);
    }
  };

  // ==========================================
  // PLAN FEATURES
  // ==========================================

  const getPlanFeatures = (plan) => {
    const dailyEarning = parseFloat(plan.daily_earning) || 0;
    const duration = parseInt(plan.duration_days) || 7;
    const totalEarning = parseFloat(plan.total_earning) || dailyEarning * duration;

    return [
      `Daily Earning: Rs ${dailyEarning.toFixed(2)}`,
      `${duration} Days Duration`,
      `Total Return: Rs ${totalEarning.toFixed(2)}`,
      "Plan Access",
    ];
  };

  // ==========================================
  // PLAN EMOJI
  // ==========================================

  const getPlanEmoji = (price) => {
    const amount = parseFloat(price) || 0;

    if (amount >= 25000) return "👑";
    if (amount >= 10000) return "💎";
    if (amount >= 5000) return "⭐";
    if (amount >= 2500) return "🌟";
    if (amount >= 1000) return "💫";

    return "✨";
  };

  // ==========================================
  // BADGE
  // ==========================================

  const getBadgeText = (price) => {
    const amount = parseFloat(price) || 0;

    if (amount >= 25000) return "PREMIUM";
    if (amount >= 10000) return "GOLD";
    if (amount >= 5000) return "SILVER";
    if (amount >= 2500) return "BRONZE";

    return null;
  };

  // ==========================================
  // DATE
  // ==========================================

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return "N/A";
    }

    return date.toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // ==========================================
  // DAYS REMAINING
  // ==========================================

  const getDaysRemaining = (endDate) => {
    if (!endDate) return 0;

    const now = new Date();
    const end = new Date(endDate);

    const diff = Math.ceil(
      (end - now) / (1000 * 60 * 60 * 24)
    );

    return Math.max(0, diff);
  };

  // ==========================================
  // COPY
  // ==========================================

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);

      setMessage({
        type: "success",
        text: "Reference ID copied!",
      });

      setTimeout(() => {
        setMessage({
          type: "",
          text: "",
        });
      }, 2000);
    } catch (error) {
      console.error("Copy error:", error);
    }
  };

  // ==========================================
  // CLOSE MODAL
  // ==========================================

  const closeModal = () => {
    setShowPaymentModal(false);
    setSelectedPlan(null);
    setReferenceId("");
    setAccountNumber("");
    setAccountName("");

    setMessage({
      type: "",
      text: "",
    });

    refreshAllData();
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="plans-container">

      {/* USER STATS */}
      {user && (
        <div className="user-stats">
          <div className="stat-card">
            <span>WALLET BALANCE</span>
            <strong>
              Rs {parseFloat(walletBalance || 0).toFixed(2)}
            </strong>
          </div>

          <div className="stat-card">
            <span>TOTAL POINTS</span>
            <strong>{totalPoints}</strong>
          </div>

          <div className="stat-card">
            <span>ACTIVE PLANS</span>
            <strong>{activePlanCount}</strong>
          </div>
        </div>
      )}

      {/* MESSAGE */}
      {message.text && (
        <div className={`plans-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* ======================================
          AVAILABLE PLANS
      ====================================== */}

      <div className="plans-section">
        <div className="plans-header">
          <h2>Available Plans</h2>
          <button
            type="button"
            onClick={fetchPlans}
            disabled={plansLoading}
            className="refresh-plans-btn"
          >
            {plansLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {plansLoading ? (
          <div className="loading-plans">
            <div>Loading plans...</div>
            <small>
              Please wait while we connect to the server.
            </small>
          </div>
        ) : plans.length === 0 ? (
          <div className="loading-plans">
            <h3>No plans available</h3>
            <p>Server did not return any plans.</p>
            <button
              type="button"
              onClick={fetchPlans}
              className="purchase-btn"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="plans-grid">
            {plans.map((plan) => {
              const price = parseFloat(plan.price) || 0;
              const dailyEarning = parseFloat(plan.daily_earning) || 0;
              const duration = parseInt(plan.duration_days) || 7;
              const totalEarning = parseFloat(plan.total_earning) || dailyEarning * duration;
              const badge = getBadgeText(price);

              return (
                <div className="plan-card" key={plan.id}>
                  {badge && (
                    <div className="plan-badge">
                      {badge}
                    </div>
                  )}

                  <div className="plan-icon">
                    {getPlanEmoji(price)}
                  </div>

                  <h3>
                    {plan.name || `Plan ${plan.id}`}
                  </h3>

                  <div className="plan-price">
                    Rs {price.toFixed(2)}
                  </div>

                  <div className="plan-earning">
                    Daily Earning:
                    <strong>
                      {" "}Rs {dailyEarning.toFixed(2)}
                    </strong>
                  </div>

                  <div className="plan-duration">
                    Duration: {duration} Days
                  </div>

                  <div className="plan-total">
                    Total Return:
                    <strong>
                      {" "}Rs {totalEarning.toFixed(2)}
                    </strong>
                  </div>

                  <ul className="plan-features">
                    {getPlanFeatures(plan).map(
                      (feature, index) => (
                        <li key={index}>
                          {feature}
                        </li>
                      )
                    )}
                  </ul>

                  <button
                    type="button"
                    className="purchase-btn"
                    onClick={() => handlePurchase(plan.id)}
                    disabled={loading}
                  >
                    Purchase Now
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================
          PAYMENT MODAL
      ====================================== */}

      {showPaymentModal && selectedPlan && (
        <div className="payment-modal-overlay">
          <div className="payment-modal">
            <button
              type="button"
              className="modal-close"
              onClick={closeModal}
            >
              ✕
            </button>

            <h2>Complete Payment</h2>

            <div className="payment-summary">
              <p>
                <strong>Plan:</strong>{" "}
                {selectedPlan.name}
              </p>
              <p>
                <strong>Price:</strong>{" "}
                Rs{" "}
                {parseFloat(
                  selectedPlan.price || 0
                ).toFixed(2)}
              </p>
              <p>
                <strong>Daily Earning:</strong>{" "}
                Rs{" "}
                {parseFloat(
                  selectedPlan.daily_earning || 0
                ).toFixed(2)}
              </p>
              <p>
                <strong>Duration:</strong>{" "}
                {selectedPlan.duration_days || 7} Days
              </p>
            </div>

            {message.text && (
              <div className={`payment-message ${message.type}`}>
                {message.text}
              </div>
            )}

            {/* PAYMENT REFERENCE */}
            {referenceId ? (
              <div className="payment-reference">
                <p>
                  <strong>Payment Request Created</strong>
                </p>

                <div className="account-details">
                  <div className="account-detail-item">
                    <span>Method:</span>
                    <strong>EasyPaisa</strong>
                  </div>

                  <div className="account-detail-item">
                    <span>Reference:</span>
                    <strong style={{ wordBreak: "break-all" }}>
                      {referenceId}
                    </strong>
                  </div>

                  <div className="account-detail-item">
                    <span>Amount:</span>
                    <strong>
                      Rs{" "}
                      {parseFloat(
                        selectedPlan.price || 0
                      ).toFixed(2)}
                    </strong>
                  </div>
                </div>

                <div className="copy-reference">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(referenceId)}
                    className="copy-btn"
                  >
                    Copy Reference ID
                  </button>
                </div>

                <p className="instruction-note">
                  Keep your reference ID for payment verification.
                </p>

                <button
                  type="button"
                  onClick={closeModal}
                  className="pay-now-btn"
                >
                  Done
                </button>
              </div>
            ) : (
              /* PAYMENT FORM */
              <form onSubmit={processPayment}>
                <div className="payment-method-select">
                  <button type="button" className="method-btn active">
                    EasyPaisa
                  </button>
                </div>

                <div className="payment-info-box">
                  <p>
                    <strong>Payment Method</strong>
                  </p>
                  <p>
                    Send the exact plan amount using
                    EasyPaisa to:
                  </p>
                  <div className="bank-details">
                    <div>Account: <strong>03439540534</strong></div>
                    <div>Name: <strong>RIZWAN ISHAQ</strong></div>
                  </div>
                </div>

                <div className="input-group">
                  <label>Your EasyPaisa Account Number</label>
                  <input
                    type="text"
                    placeholder="03XXXXXXXXX"
                    value={accountNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 11) {
                        setAccountNumber(value);
                      }
                    }}
                    required
                  />
                  <small>Enter 10-11 digits.</small>
                </div>

                <div className="input-group">
                  <label>Account Holder Name</label>
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={accountName}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                      setAccountName(value);
                    }}
                    required
                  />
                  <small>Letters and spaces only.</small>
                </div>

                <button
                  type="submit"
                  className="pay-now-btn"
                  disabled={loading}
                >
                  {loading
                    ? "Processing..."
                    : `Submit Rs ${parseFloat(
                        selectedPlan.price || 0
                      ).toFixed(2)} Payment Request`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ======================================
          ACTIVE PLANS
      ====================================== */}

      {userPlans.length > 0 && (
        <div className="active-plans">
          <h3>Your Active Plans ({userPlans.length})</h3>

          {userPlans.map((plan) => {
            const daysRemaining = getDaysRemaining(plan.end_date);

            return (
              <div key={plan.id} className="active-plan">
                <div className="plan-info">
                  <h4>{plan.plan_name}</h4>
                  <p>
                    Active: {formatDate(plan.start_date)}
                    {" - "}
                    {formatDate(plan.end_date)}
                  </p>
                  <p>
                    Days Remaining:{" "}
                    <strong>{daysRemaining} days</strong>
                  </p>
                  <p>
                    Total Earned:{" "}
                    Rs{" "}
                    {parseFloat(plan.total_earned || 0).toFixed(2)}
                  </p>

                  {daysRemaining === 0 && (
                    <p className="expired-text">Plan Expired</p>
                  )}
                </div>

                <div className="plan-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          ((7 - daysRemaining) / 7) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <span>{daysRemaining} days left</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================
          DAILY EARNINGS
      ====================================== */}

      {dailyEarnings.length > 0 && (
        <div className="daily-earnings">
          <h3>Daily Earnings</h3>

          {dailyEarnings.slice(0, 10).map((earning) => (
            <div key={earning.id} className="earning-item">
              <div>
                <strong>{earning.plan_name}</strong>
                <small>{formatDate(earning.earning_date)}</small>
              </div>

              <div className="earning-right">
                <span>
                  +Rs{" "}
                  {parseFloat(earning.amount || 0).toFixed(2)}
                </span>
                <span className="points-badge">
                  {earning.points || Math.floor(parseFloat(earning.amount || 0))} pts
                </span>

                {earning.is_claimed ? (
                  <span className="claimed-badge">✓ Claimed</span>
                ) : (
                  <span className="pending-badge">⏳ Pending</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
