import { useState } from "react";

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    appName: "ADS WATCHING",
    minWithdraw: 100,
    minDeposit: 100,
    maintenanceMode: false,
    supportEmail: "support@adswatching.com",
    supportPhone: "+92 300 1234567",
  });

  const [message, setMessage] = useState({ type: "", text: "" });

  const handleSave = (e) => {
    e.preventDefault();
    // Save settings to backend
    setMessage({ type: "success", text: "✅ Settings saved successfully!" });
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  return (
    <div className="admin-settings">
      <h2>⚙️ Settings</h2>

      {message.text && (
        <div className={`admin-message ${message.type}`}>{message.text}</div>
      )}

      <form onSubmit={handleSave} className="settings-form">
        <div className="settings-section">
          <h3>General Settings</h3>
          <div className="input-group">
            <label>App Name</label>
            <input
              type="text"
              value={settings.appName}
              onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
            />
          </div>
          <div className="input-group">
            <label>Support Email</label>
            <input
              type="email"
              value={settings.supportEmail}
              onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
            />
          </div>
          <div className="input-group">
            <label>Support Phone</label>
            <input
              type="text"
              value={settings.supportPhone}
              onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
            />
          </div>
        </div>

        <div className="settings-section">
          <h3>Financial Settings</h3>
          <div className="input-group">
            <label>Minimum Withdrawal (Rs)</label>
            <input
              type="number"
              value={settings.minWithdraw}
              onChange={(e) => setSettings({ ...settings, minWithdraw: parseInt(e.target.value) })}
            />
          </div>
          <div className="input-group">
            <label>Minimum Deposit (Rs)</label>
            <input
              type="number"
              value={settings.minDeposit}
              onChange={(e) => setSettings({ ...settings, minDeposit: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div className="settings-section">
          <h3>System Status</h3>
          <div className="input-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
              />
              Maintenance Mode
            </label>
            <small>When enabled, only admins can access the app</small>
          </div>
        </div>

        <button type="submit" className="save-btn">💾 Save Settings</button>
      </form>
    </div>
  );
}




