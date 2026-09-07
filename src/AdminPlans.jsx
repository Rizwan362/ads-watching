import { useState, useEffect } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://192.168.1.7:5001";

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    daily_earning: "",
    duration_days: 20,
    is_active: true,
  });

  // ------------------------------------------------------------
  // FETCH PLANS
  // ------------------------------------------------------------

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/admin/plans`);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch plans");
      }

      setPlans(data.plans || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------
  // RESET FORM
  // ------------------------------------------------------------

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      daily_earning: "",
      duration_days: 20,
      is_active: true,
    });
  };

  // ------------------------------------------------------------
  // EDIT PLAN
  // ------------------------------------------------------------

  const handleEdit = (plan) => {
    setEditingPlan(plan);

    setFormData({
      name: plan.name || "",
      price: plan.price ?? "",
      daily_earning: plan.daily_earning ?? "",
      duration_days: plan.duration_days ?? 20,
      is_active: plan.is_active ?? true,
    });

    setShowForm(true);
  };

  // ------------------------------------------------------------
  // CREATE / UPDATE PLAN
  // ------------------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = editingPlan
        ? `${API_URL}/api/admin/plans/${editingPlan.id}`
        : `${API_URL}/api/admin/plans/create`;

      const method = editingPlan ? "PUT" : "POST";

      const dailyEarning = Number(formData.daily_earning);
      const durationDays = Number(formData.duration_days);

      const totalEarning = dailyEarning * durationDays;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          price: Number(formData.price),
          daily_earning: dailyEarning,
          duration_days: durationDays,
          total_earning: totalEarning,
          is_active: formData.is_active,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save plan");
      }

      alert(
        editingPlan
          ? "Plan updated successfully"
          : "Plan created successfully"
      );

      setShowForm(false);
      setEditingPlan(null);
      resetForm();

      await fetchPlans();
    } catch (error) {
      console.error("Error saving plan:", error);
      alert(error.message || "Failed to save plan");
    }
  };

  // ------------------------------------------------------------
  // DELETE / DEACTIVATE PLAN
  // ------------------------------------------------------------

  const handleDelete = async (planId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete/deactivate this plan?"
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/admin/plans/${planId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete plan");
      }

      alert(data.message || "Plan deleted successfully");

      await fetchPlans();
    } catch (error) {
      console.error("Error deleting plan:", error);
      alert(error.message || "Failed to delete plan");
    }
  };

  // ------------------------------------------------------------
  // TOGGLE PLAN ACTIVE / INACTIVE
  // ------------------------------------------------------------

  const handleToggle = async (planId, currentStatus) => {
    try {
      const response = await fetch(
        `${API_URL}/api/admin/plans/toggle`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planId: planId,
            active: !currentStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to toggle plan");
      }

      alert(
        currentStatus
          ? "Plan deactivated successfully"
          : "Plan activated successfully"
      );

      await fetchPlans();
    } catch (error) {
      console.error("Toggle plan error:", error);
      alert(error.message || "Failed to toggle plan");
    }
  };

  // ------------------------------------------------------------
  // CLOSE FORM
  // ------------------------------------------------------------

  const closeForm = () => {
    setShowForm(false);
    setEditingPlan(null);
    resetForm();
  };

  // ------------------------------------------------------------
  // LOADING
  // ------------------------------------------------------------

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading plans...</p>
      </div>
    );
  }

  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

  return (
    <div className="admin-plans">

      {/* TOOLBAR */}
      <div className="admin-toolbar">
        <button
          className="add-btn"
          onClick={() => {
            setEditingPlan(null);
            resetForm();
            setShowForm(true);
          }}
        >
          ➕ Add New Plan
        </button>
      </div>

      {/* --------------------------------------------------------
          CREATE / EDIT MODAL
      --------------------------------------------------------- */}

      {showForm && (
        <div className="admin-modal-overlay">
          <div className="admin-modal plan-form-modal">

            <button
              className="modal-close"
              onClick={closeForm}
              type="button"
            >
              ✕
            </button>

            <h2>
              {editingPlan
                ? "✏️ Edit Plan"
                : "📋 Create New Plan"}
            </h2>

            <form onSubmit={handleSubmit}>

              {/* PLAN NAME */}
              <div className="input-group">
                <label>Plan Name</label>

                <input
                  type="text"
                  placeholder="e.g., Plan 1"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                    })
                  }
                  required
                />
              </div>

              {/* PRICE */}
              <div className="input-group">
                <label>Price (Rs)</label>

                <input
                  type="number"
                  min="1"
                  placeholder="e.g., 100"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: e.target.value,
                    })
                  }
                  required
                />
              </div>

              {/* DAILY EARNING */}
              <div className="input-group">
                <label>Daily Earning (Rs)</label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g., 15"
                  value={formData.daily_earning}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      daily_earning: e.target.value,
                    })
                  }
                  required
                />
              </div>

              {/* DURATION */}
              <div className="input-group">
                <label>Duration (Days)</label>

                <input
                  type="number"
                  min="1"
                  placeholder="e.g., 20"
                  value={formData.duration_days}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration_days: e.target.value,
                    })
                  }
                  required
                />
              </div>

              {/* ACTIVE */}
              <div className="input-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_active: e.target.checked,
                      })
                    }
                  />

                  Active
                </label>
              </div>

              {/* SAVE */}
              <button
                type="submit"
                className="save-btn"
              >
                {editingPlan
                  ? "Update Plan"
                  : "Create Plan"}
              </button>

            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------
          PLANS TABLE
      --------------------------------------------------------- */}

      <div className="plans-table-container">

        <table className="admin-table">

          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Price</th>
              <th>Daily Earning</th>
              <th>Duration</th>
              <th>Total Return</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            {plans.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: "center" }}>
                  No plans found
                </td>
              </tr>
            ) : (
              plans.map((plan) => {

                const dailyEarning =
                  parseFloat(plan.daily_earning) || 0;

                const duration =
                  Number(plan.duration_days) || 0;

                const totalReturn =
                  dailyEarning * duration;

                const isActive =
                  Boolean(plan.is_active);

                return (
                  <tr key={plan.id}>

                    {/* ID */}
                    <td>
                      #{plan.id}
                    </td>

                    {/* NAME */}
                    <td>
                      {plan.name}
                    </td>

                    {/* PRICE */}
                    <td>
                      Rs{" "}
                      {(parseFloat(plan.price) || 0).toFixed(2)}
                    </td>

                    {/* DAILY EARNING */}
                    <td>
                      Rs{" "}
                      {dailyEarning.toFixed(2)}
                    </td>

                    {/* DURATION */}
                    <td>
                      {duration} days
                    </td>

                    {/* TOTAL RETURN */}
                    <td>
                      Rs{" "}
                      {totalReturn.toFixed(2)}
                    </td>

                    {/* STATUS */}
                    <td>
                      <span
                        className={`status-badge ${
                          isActive
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {isActive
                          ? "🟢 Active"
                          : "🔴 Inactive"}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td>
                      <div className="action-buttons">

                        {/* EDIT */}
                        <button
                          type="button"
                          className="action-btn edit"
                          onClick={() =>
                            handleEdit(plan)
                          }
                          title="Edit Plan"
                        >
                          ✏️
                        </button>

                        {/* TOGGLE */}
                        <button
                          type="button"
                          className="action-btn toggle"
                          onClick={() =>
                            handleToggle(
                              plan.id,
                              isActive
                            )
                          }
                          title={
                            isActive
                              ? "Deactivate Plan"
                              : "Activate Plan"
                          }
                        >
                          {isActive
                            ? "⏸️"
                            : "▶️"}
                        </button>

                        {/* DELETE / DEACTIVATE */}
                        <button
                          type="button"
                          className="action-btn delete"
                          onClick={() =>
                            handleDelete(plan.id)
                          }
                          title="Delete / Deactivate Plan"
                        >
                          🗑️
                        </button>

                      </div>
                    </td>

                  </tr>
                );
              })
            )}

          </tbody>

        </table>

      </div>
    </div>
  );
}
