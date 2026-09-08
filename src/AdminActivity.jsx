import { useEffect, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "https://ads-watching-api.onrender.com";

export default function AdminActivity() {
  const [activities, setActivities] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  const [loading, setLoading] = useState(true);
  const [announcementLoading, setAnnouncementLoading] = useState(false);

  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchActivities();
    fetchAnnouncements();
  }, []);

  // ============================================================
  // ACTIVITY
  // ============================================================

  const fetchActivities = async () => {
    try {
     const response = await fetch(
  `${API_URL}/api/admin/activity`,
  {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
    },
  }
);

      const data = await response.json();

      if (data.success) {
        setActivities(data.activity || []);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ANNOUNCEMENTS
  // ============================================================

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/admin/announcements`
      );

      const data = await response.json();

      if (data.success) {
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error(
        "Error fetching announcements:",
        error
      );
    }
  };

  // ============================================================
  // CREATE ANNOUNCEMENT
  // ============================================================

  const publishAnnouncement = async (e) => {
    e.preventDefault();

    if (!title.trim() || !message.trim()) {
      alert("Please enter both title and message.");
      return;
    }

    try {
      setAnnouncementLoading(true);

      const response = await fetch(
        `${API_URL}/api/admin/announcements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
             Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            message: message.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to publish announcement"
        );
      }

      alert("📢 Announcement published successfully!");

      setTitle("");
      setMessage("");
      setShowAnnouncementForm(false);

      await fetchAnnouncements();

    } catch (error) {
      console.error(
        "Publish announcement error:",
        error
      );

      alert(error.message);
    } finally {
      setAnnouncementLoading(false);
    }
  };

  // ============================================================
  // DEACTIVATE
  // ============================================================

  const deactivateAnnouncement = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to deactivate this announcement?"
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_URL}/api/admin/announcements/${id}/deactivate`,
        {
          method: "PUT",
          headers: {
  Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
}
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to deactivate announcement"
        );
      }

      await fetchAnnouncements();

    } catch (error) {
      console.error(
        "Deactivate announcement error:",
        error
      );

      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading activities...</p>
      </div>
    );
  }

  return (
    <div className="admin-activity">

      {/* ======================================================
          ANNOUNCEMENT SECTION
      ====================================================== */}

      <div className="announcement-admin-card">

        <div className="announcement-admin-header">
          <div>
            <span className="announcement-admin-label">
              USER COMMUNICATION
            </span>

            <h2>📢 Announcements</h2>

            <p>
              Publish an announcement that will appear
              as a popup on the user dashboard.
            </p>
          </div>

          <button
            type="button"
            className="create-announcement-btn"
            onClick={() =>
              setShowAnnouncementForm(
                !showAnnouncementForm
              )
            }
          >
            {showAnnouncementForm
              ? "✕ Close"
              : "＋ Create Announcement"}
          </button>
        </div>

        {/* ====================================================
            CREATE FORM
        ==================================================== */}

        {showAnnouncementForm && (
          <form
            className="announcement-form"
            onSubmit={publishAnnouncement}
          >
            <div className="announcement-field">
              <label>Announcement Title</label>

              <input
                type="text"
                placeholder="e.g. Important Update"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                maxLength={255}
              />
            </div>

            <div className="announcement-field">
              <label>Announcement Message</label>

              <textarea
                placeholder="Write your announcement here..."
                value={message}
                onChange={(e) =>
                  setMessage(e.target.value)
                }
                rows={6}
              />
            </div>

            <div className="announcement-form-footer">
              <span>
                This will appear as a popup to users.
              </span>

              <button
                type="submit"
                disabled={announcementLoading}
                className="publish-announcement-btn"
              >
                {announcementLoading
                  ? "Publishing..."
                  : "📢 Publish Announcement"}
              </button>
            </div>
          </form>
        )}

        {/* ====================================================
            ANNOUNCEMENT HISTORY
        ==================================================== */}

        <div className="announcement-history">

          <div className="announcement-history-title">
            <strong>Announcement History</strong>
            <span>
              {announcements.length} total
            </span>
          </div>

          {announcements.length === 0 ? (
            <div className="no-announcements">
              <div>📭</div>
              <p>No announcements published yet.</p>
            </div>
          ) : (
            announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`announcement-history-item ${
                  announcement.is_active
                    ? "active"
                    : "inactive"
                }`}
              >
                <div className="announcement-history-icon">
                  📢
                </div>

                <div className="announcement-history-content">
                  <div className="announcement-history-top">
                    <strong>
                      {announcement.title}
                    </strong>

                    <span
                      className={
                        announcement.is_active
                          ? "announcement-status active"
                          : "announcement-status inactive"
                      }
                    >
                      {announcement.is_active
                        ? "ACTIVE"
                        : "INACTIVE"}
                    </span>
                  </div>

                  <p>
                    {announcement.message}
                  </p>

                  <div className="announcement-history-bottom">
                    <small>
                      {new Date(
                        announcement.created_at
                      ).toLocaleString()}
                    </small>

                    {announcement.is_active && (
                      <button
                        type="button"
                        onClick={() =>
                          deactivateAnnouncement(
                            announcement.id
                          )
                        }
                      >
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ======================================================
          EXISTING ADMIN ACTIVITY
      ====================================================== */}

      <div className="admin-toolbar">
        <h2>📝 Admin Activity Log</h2>
        <span>
          Total: {activities.length} activities
        </span>
      </div>

      <div className="activity-log">
        {activities.length === 0 ? (
          <div className="no-activities">
            No admin activities yet.
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={`${activity.type}-${activity.id}`}
              className="activity-item"
            >
              <div className="activity-icon">
                {activity.type === "deposit" && "💰"}
                {activity.type === "withdrawal" && "💸"}
                {!["deposit", "withdrawal"].includes(
                  activity.type
                ) && "📋"}
              </div>

              <div className="activity-details">
                <div className="activity-header">
                  <strong>
                    {activity.type === "deposit"
                      ? "Plan Purchase"
                      : "Withdrawal"}
                  </strong>

                  <span className="activity-action">
                    {activity.status}
                  </span>
                </div>

                <p className="activity-description">
                  User ID: {activity.user_id}
                  {" • "}
                  Amount: Rs{" "}
                  {Number(
                    activity.amount || 0
                  ).toFixed(2)}
                </p>

                <div className="activity-meta">
                  <small>
                    {new Date(
                      activity.created_at
                    ).toLocaleString()}
                  </small>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

