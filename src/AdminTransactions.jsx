import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://192.168.1.7:5001";

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
  try {
    const token = localStorage.getItem("adminToken");

    const response = await fetch(
      `${API_URL}/api/admin/transactions`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (data.success) {
      setTransactions(data.transactions);
    } else {
      console.error("Transactions error:", data.message);
    }
  } catch (error) {
    console.error("Error fetching transactions:", error);
  } finally {
    setLoading(false);
  }
};
  const filteredTransactions = transactions.filter(tx =>
    tx.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    tx.reference?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading transactions...</p>
      </div>
    );
  }

  return (
    <div className="admin-transactions">
      <div className="admin-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by user or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span>🔍</span>
        </div>
        <div className="admin-toolbar-actions">
          <span>Total: {filteredTransactions.length} transactions</span>
        </div>
      </div>

      <div className="transactions-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((tx) => (
              <tr key={tx.id}>
                <td>#{tx.id}</td>
                <td>{tx.user_name}</td>
                <td>
                  <span className={`transaction-type ${tx.type}`}>
                    {tx.type === "deposit" && "💰 Deposit"}
                    {tx.type === "withdrawal" && "💳 Withdrawal"}
                    {tx.type === "earning" && "📈 Earning"}
                    {tx.type === "plan_purchase" && "📋 Plan Purchase"}
                  </span>
                </td>
                <td className={tx.type === "deposit" || tx.type === "earning" ? "positive" : "negative"}>
                  {tx.type === "deposit" || tx.type === "earning" ? "+" : "-"}
                  Rs {parseFloat(tx.amount).toFixed(2)}
                </td>
                <td>{tx.method || "N/A"}</td>
                <td>{tx.reference || tx.payment_reference || "N/A"}</td>
                <td>
                  <span className={`status-badge ${tx.status}`}>
                    {tx.status === "pending" && "⏳ Pending"}
                    {tx.status === "completed" && "✅ Completed"}
                    {tx.status === "rejected" && "❌ Rejected"}
                  </span>
                </td>
                <td>{new Date(tx.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}



