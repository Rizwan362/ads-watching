import { useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "https://ads-watching-api.onrender.com";

export default function PaymentConfirmation({
  user,
  selectedPlan,
  onClose,
  onSuccess,
}) {
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  if (!selectedPlan) return null;

  const amount = parseFloat(selectedPlan.price || 0).toFixed(2);

  const handleScreenshot = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({
        type: "error",
        text: "Please upload a valid image screenshot.",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({
        type: "error",
        text: "Screenshot must be less than 5MB.",
      });
      return;
    }

    setScreenshot(file);
    setPreview(URL.createObjectURL(file));

    setMessage({
      type: "",
      text: "",
    });
  };

  const handleConfirmPayment = async () => {
    if (!user?.id || !selectedPlan?.id) {
      setMessage({
        type: "error",
        text: "Invalid user or plan.",
      });
      return;
    }

    if (!screenshot) {
      setMessage({
        type: "error",
        text: "Please upload payment screenshot first.",
      });
      return;
    }

    const cleanAccountNumber = accountNumber.replace(/\D/g, "");

    if (
      !cleanAccountNumber ||
      cleanAccountNumber.length < 10 ||
      cleanAccountNumber.length > 11
    ) {
      setMessage({
        type: "error",
        text: "Please enter a valid 10-11 digit EasyPaisa number.",
      });
      return;
    }

    if (!accountName || !/^[a-zA-Z\s]+$/.test(accountName)) {
      setMessage({
        type: "error",
        text: "Please enter your account holder name.",
      });
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append("userId", user.id);
      formData.append("planId", selectedPlan.id);
      formData.append("paymentMethod", "EasyPaisa");
      formData.append("accountNumber", cleanAccountNumber);
      formData.append("accountName", accountName);
      formData.append("screenshot", screenshot);

      const response = await fetch(
        `${API_URL}/api/payment/confirm-with-screenshot`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Payment confirmation failed.");
      }

      setMessage({
        type: "success",
        text:
          data.message ||
          "Payment submitted successfully. Waiting for admin verification.",
      });

      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error) {
      console.error("CONFIRM PAYMENT ERROR:", error);

      setMessage({
        type: "error",
        text: error.message || "Unable to submit payment.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-confirmation-overlay">
      <div className="payment-confirmation-card">
        <button
          type="button"
          className="payment-confirmation-close"
          onClick={onClose}
          disabled={loading}
        >
          ✕
        </button>

        <h2>ادائیگی کی تصدیق</h2>

        <div className="payment-plan-summary">
          <p>
            <strong>Plan:</strong> {selectedPlan.name}
          </p>

          <p>
            <strong>Amount:</strong> Rs {amount}
          </p>
        </div>

        <div className="urdu-payment-instructions">
          <h3>ادائیگی کیسے کریں؟</h3>

          <p>
            براہ کرم نیچے دیے گئے EasyPaisa نمبر پر پلان کی مکمل رقم بھیجیں۔
          </p>

          <div className="payment-account-box">
            <p>
              <strong>EasyPaisa نمبر:</strong> 03439540534
            </p>

            <p>
              <strong>نام:</strong> RIZWAN ISHAQ
            </p>

            <p>
              <strong>رقم:</strong> Rs {amount}
            </p>
          </div>

          <p>
            رقم بھیجنے کے بعد اپنی payment کا screenshot یہاں upload کریں۔
            Screenshot کے بغیر payment confirm نہیں ہوگی۔
          </p>
        </div>

        <div className="payment-input-group">
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
          />

          <small>Enter 10-11 digits.</small>
        </div>

        <div className="payment-input-group">
          <label>Account Holder Name</label>

          <input
            type="text"
            placeholder="Your full name"
            value={accountName}
            onChange={(e) => {
              const value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
              setAccountName(value);
            }}
          />
        </div>

        <div className="screenshot-upload-section">
          <label>Payment Screenshot *</label>

          <input
            type="file"
            accept="image/*"
            onChange={handleScreenshot}
          />

          {!screenshot && (
            <small>
              Payment screenshot is required before confirmation.
            </small>
          )}

          {preview && (
            <div className="screenshot-preview">
              <img src={preview} alt="Payment screenshot preview" />

              <button
                type="button"
                onClick={() => {
                  setScreenshot(null);
                  setPreview("");
                }}
                disabled={loading}
              >
                Remove Screenshot
              </button>
            </div>
          )}
        </div>

        {message.text && (
          <div className={`payment-confirmation-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <button
          type="button"
          className="confirm-payment-btn"
          onClick={handleConfirmPayment}
          disabled={loading || !screenshot}
        >
          {loading ? "Submitting..." : "Confirm Payment"}
        </button>

        {!screenshot && (
          <p className="screenshot-required-note">
            Please upload payment screenshot to enable confirmation.
          </p>
        )}
      </div>
    </div>
  );
}