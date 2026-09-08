
import { useEffect, useState, useRef } from "react";
import "./App.css";
import "./wallet.css";
import Plans from "./Plans";
import AdminPanel from "./AdminPanel";

import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://ads-watching-api.onrender.com";
async function apiRequest(path, options = {}) {
  const url = `${API_URL}${path}`;

  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.request({
      url,
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      data: options.body ? JSON.parse(options.body) : undefined,
    });

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: async () => response.data,
    };
  }

  return fetch(url, options);
}

function AnnouncementPopup({
  announcement,
  onClose,
}) {
  if (!announcement) return null;

  return (
    <div className="announcement-overlay">
      <div className="announcement-popup">

        <button
          type="button"
          className="announcement-close"
          onClick={onClose}
        >
          ×
        </button>

        <div className="announcement-icon">
          📢
        </div>

        <h2>{announcement.title}</h2>

        <p>{announcement.message}</p>

        <button
          type="button"
          className="announcement-ok"
          onClick={onClose}
        >
          OK
        </button>

      </div>
    </div>
  );
}
function App() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [walletScreen, setWalletScreen] = useState("dashboard");
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [profileScreen, setProfileScreen] = useState(false);
  const [pointsScreen, setPointsScreen] = useState(false);
  const [depositInfo, setDepositInfo] = useState({});
  const [depositMethod, setDepositMethod] = useState("EasyPaisa");
  const [depositAmount, setDepositAmount] = useState("");
  const [payerAccount, setPayerAccount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPassword, setWithdrawPassword] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState("EasyPaisa");
  
  const [showNotification, setShowNotification] = useState(false);
  const [historyScreen, setHistoryScreen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [announcement, setAnnouncement] = useState(null);
const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [screen, setScreen] = useState("login");
  const [showSetup, setShowSetup] = useState(false);
  const [setupName, setSetupName] = useState("");
  const [setupPaymentMethod, setSetupPaymentMethod] = useState("");
  const [withdrawAccountName, setWithdrawAccountName] = useState("");
const [withdrawAccountNumber, setWithdrawAccountNumber] = useState("");
  const [setupCnic, setSetupCnic] = useState("");
  const [setupPhone, setSetupPhone] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirmPassword, setSetupConfirmPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(() => Boolean(localStorage.getItem("ads_watching_user")));
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("ads_watching_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");

  if (ref) {
    setReferralCode(ref.trim());
  }
}, []);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationOtp, setVerificationOtp] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activePlanCount, setActivePlanCount] = useState(0);
  const [referralData, setReferralData] = useState(null);
const [referralLoading, setReferralLoading] = useState(false);
const [referralCopied, setReferralCopied] = useState(false);
// ============================================================
// ANDROID BACK BUTTON STATE REFS
// ============================================================

const screenRef = useRef(screen);
const walletScreenRef = useRef(walletScreen);
const profileScreenRef = useRef(profileScreen);
const pointsScreenRef = useRef(pointsScreen);
const historyScreenRef = useRef(historyScreen);

// Always keep latest state
screenRef.current = screen;
walletScreenRef.current = walletScreen;
profileScreenRef.current = profileScreen;
pointsScreenRef.current = pointsScreen;
historyScreenRef.current = historyScreen;

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  // ============================================================
  // FETCH ACTIVE PLAN COUNT
  // ============================================================

  const fetchActivePlanCount = async (userId) => {
    if (!userId) return;
    try {
      const response = await fetch(`${API_URL}/api/user/active-plans/${userId}`);
      const data = await response.json();
      if (data.success) {
        setActivePlanCount(data.activeCount || 0);
      }
    } catch (error) {
      console.error("Active plans error:", error);
    }
  };

  // ============================================================
  // REFRESH WALLET
  // ============================================================

  async function refreshWallet(userId = user?.id) {
    if (!userId) return;
    try {
      const [walletResponse, txResponse] = await Promise.all([
        fetch(`${API_URL}/api/wallet/${userId}`),
        fetch(`${API_URL}/api/wallet/transactions/${userId}`),
      ]);
      const walletData = await walletResponse.json();
      const txData = await txResponse.json();
      if (walletResponse.ok && walletData.success) {
        setBalance(Number(walletData.wallet?.balance || 0));
      }
      if (txResponse.ok && txData.success) {
        setTransactions(Array.isArray(txData.transactions) ? txData.transactions : []);
      }
    } catch (err) {
      console.error("WALLET REFRESH ERROR:", err);
    }
  }
  async function loadPaymentAccounts(userId = user?.id) {
  if (!userId) return;

  try {
    const response = await apiRequest(
      `/api/user/payment-accounts/${userId}`
    );

    const data = await response.json();

    if (response.ok && data.success) {
      const accounts = Array.isArray(data.accounts)
        ? data.accounts
        : [];

      setUser((prevUser) => {
        if (!prevUser) return prevUser;

        const updatedUser = {
          ...prevUser,
          payment_accounts: accounts,
        };

        localStorage.setItem(
          "ads_watching_user",
          JSON.stringify(updatedUser)
        );

        return updatedUser;
      });

      const selectedAccount = accounts.find(
        (item) =>
          String(item.method).trim().toLowerCase() ===
          String(withdrawMethod).trim().toLowerCase()
      );

      if (selectedAccount) {
        setWithdrawAccountName(
          selectedAccount.account_name || ""
        );

        setWithdrawAccountNumber(
          selectedAccount.account_number || ""
        );
      } else {
        setWithdrawAccountName("");
        setWithdrawAccountNumber("");
      }
    }
  } catch (err) {
    console.error("PAYMENT ACCOUNTS ERROR:", err);
  }
}
async function loadNotifications(userId = user?.id) {
  if (!userId) return;

  try {
    const response = await apiRequest(
      `/api/notifications/${userId}`
    );

    const data = await response.json();

    if (response.ok && data.success) {
      setNotifications(
        Array.isArray(data.notifications)
          ? data.notifications
          : []
      );
    } else {
      setNotifications([]);
    }
  } catch (error) {
    console.error("LOAD NOTIFICATIONS ERROR:", error);
    setNotifications([]);
  }
}

  const loadLatestAnnouncement = async () => {
  try {
    const response = await apiRequest(
      "/api/announcements/latest"
    );

    const data = await response.json();

    if (
      response.ok &&
      data.success &&
      data.announcement
    ) {
      setAnnouncement(data.announcement);
      setShowAnnouncement(true);
    } else {
      setAnnouncement(null);
      setShowAnnouncement(false);
    }
  } catch (error) {
    console.error(
      "Announcement loading error:",
      error
    );
  }
};
const closeAnnouncement = () => {
  setShowAnnouncement(false);
};
async function loadReferralData(userId = user?.id) {
  if (!userId) return;

  try {
    const response = await apiRequest(
      `/api/referral/${userId}`
    );

    const data = await response.json();

    if (response.ok && data.success) {
      // Agar referral state maujood hai to yahan set karo
      // setReferralData(data);
    }
  } catch (error) {
    console.error("LOAD REFERRAL DATA ERROR:", error);
  }
}
const copyReferralLink = async () => {
  try {
    const referralLink =
      `${window.location.origin}/register?ref=${user?.referral_code || user?.referralCode || user?.id}`;

    await navigator.clipboard.writeText(referralLink);

    alert("Referral link copied!");
  } catch (error) {
    console.error("COPY REFERRAL LINK ERROR:", error);
    alert("Failed to copy referral link");
  }
};
const shareReferralLink = async () => {
  try {
    const referralLink =
      `${window.location.origin}/register?ref=${user?.referral_code || user?.referralCode || user?.id}`;

    if (navigator.share) {
      await navigator.share({
        title: "Join Ads Watching",
        text: "Join using my referral link!",
        url: referralLink,
      });
    } else {
      await navigator.clipboard.writeText(referralLink);
      alert("Referral link copied!");
    }
  } catch (error) {
    console.error("SHARE REFERRAL LINK ERROR:", error);
  }
};
  // ============================================================
  // LOAD DEPOSIT INFO
  // ============================================================

  async function loadDepositInfo() {
    try {
      const response = await fetch(`${API_URL}/api/wallet/deposit-info`);
      const data = await response.json();
      if (response.ok && data.success) {
        setDepositInfo(data.paymentAccounts || {});
      }
    } catch (err) {
      console.error("DEPOSIT INFO ERROR:", err);
    }
  }

  // ============================================================
  // HANDLE PLAN PURCHASED
  // ============================================================

  const handlePlanPurchased = (count) => {
    setActivePlanCount(count || 0);
    refreshWallet(user?.id);
  };

 // ============================================================
// ANDROID BACK BUTTON
// ============================================================
useEffect(() => {
  const setupBackButton = async () => {
    const listener = await CapacitorApp.addListener(
      "backButton",
      () => {
        console.log("BACK BUTTON DETECTED");
        alert("Back button detected!");
      }
    );

    return listener;
  };

  let listener;

  setupBackButton().then((result) => {
    listener = result;
  });

  return () => {
    if (listener) {
      listener.remove();
    }
  };
}, []);
// ============================================================
// MOBILE PULL TO REFRESH
// ============================================================

useEffect(() => {
  if (!loggedIn || !user?.id) return;

  let startY = 0;
  let currentY = 0;
  let pulling = false;

  const handleTouchStart = (e) => {
    if (window.scrollY <= 5) {
      startY = e.touches[0].clientY;
      pulling = true;
    }
  };

  const handleTouchMove = (e) => {
    if (!pulling) return;

    currentY = e.touches[0].clientY;

    const distance = currentY - startY;

    // Sirf downward pull
    if (distance > 10 && window.scrollY <= 5) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = async () => {
    if (!pulling) return;

    const distance = currentY - startY;

    pulling = false;
    startY = 0;
    currentY = 0;

    // 80px se zyada pull ho to refresh
    if (distance >= 80 && window.scrollY <= 5) {
      try {
        setIsRefreshing(true);

        await Promise.all([
          refreshWallet(user.id),
          loadNotifications(user.id),
          loadLatestAnnouncement(),
          loadReferralData(user.id),
          fetchActivePlanCount(user.id),
          loadPaymentAccounts(user.id),
        ]);

        console.log("MOBILE PULL REFRESH COMPLETE");
      } catch (error) {
        console.error("MOBILE PULL REFRESH ERROR:", error);
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  document.addEventListener("touchstart", handleTouchStart, {
    passive: true,
  });

  document.addEventListener("touchmove", handleTouchMove, {
    passive: false,
  });

  document.addEventListener("touchend", handleTouchEnd, {
    passive: true,
  });

  return () => {
    document.removeEventListener("touchstart", handleTouchStart);
    document.removeEventListener("touchmove", handleTouchMove);
    document.removeEventListener("touchend", handleTouchEnd);
  };
}, [loggedIn, user?.id]);
  useEffect(() => {
  if (loggedIn && user?.id) {
    refreshWallet(user.id);
    loadNotifications(user.id);
    loadLatestAnnouncement();
    loadReferralData();
    fetchActivePlanCount(user.id);
    loadPaymentAccounts(user.id);
  }
}, [loggedIn, user?.id]);
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");

  if (ref) {
    setReferralCode(ref.trim().toUpperCase());
    setScreen("register");
  }
}, []);
  // ============================================================
  // NAVIGATION
  // ============================================================

  function goToLogin() {
    clearMessages();
    setScreen("login");
  }

function goToRegister() {
  setError("");
  setSuccess("");

  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");

  if (ref) {
    setReferralCode(ref.trim().toUpperCase());
  } else {
    setReferralCode("");
  }

  setScreen("register");
}
  function goToForgotPassword() {
    clearMessages();
    setForgotEmail(email);
    setScreen("forgot-password");
  }

  function saveUser(userData) {
    localStorage.setItem("ads_watching_user", JSON.stringify(userData));
    setUser(userData);
    setLoggedIn(true);
    setWalletScreen("dashboard");
  }

  function openWallet() {
    clearMessages();
    closeExtraScreen();
    refreshWallet(user?.id);
    setWalletScreen("wallet");
  }

  function openDashboard() {
  clearMessages();
  closeExtraScreen();
  refreshWallet(user?.id);
  loadLatestAnnouncement();
  setWalletScreen("dashboard");
}

  function openDeposit() {
    clearMessages();
    setDepositMethod("EasyPaisa");
    setDepositAmount("");
    setPayerAccount("");
    setPaymentReference("");
    setPaymentNote("");
    loadDepositInfo();
    setWalletScreen("deposit");
  }

 
async function openWithdraw() {
  clearMessages();

  setWithdrawAmount("");
  setWithdrawPassword("");
  setWithdrawMethod("EasyPaisa");
  setWithdrawAccountName("");
  setWithdrawAccountNumber("");

  if (!user?.id) {
    setError("Your session has expired. Please sign in again.");
    return;
  }

  try {
    const response = await apiRequest(
      `/api/user/payment-accounts/${user.id}`
    );

    const data = await response.json();

    console.log("WITHDRAW PAYMENT ACCOUNTS:", data);

    if (!response.ok || !data.success) {
      setError(data.message || "Unable to load payment account.");
      setWalletScreen("withdraw");
      return;
    }

    const accounts = Array.isArray(data.accounts)
      ? data.accounts
      : [];

    const account = accounts.find(
      (item) =>
        String(item.method).trim().toLowerCase() === "easypaisa"
    );

    console.log("SELECTED WITHDRAW ACCOUNT:", account);

    if (account) {
      setWithdrawAccountName(account.account_name || "");
      setWithdrawAccountNumber(account.account_number || "");
    }

    setWalletScreen("withdraw");

  } catch (err) {
    console.error("OPEN WITHDRAW ERROR:", err);
    setError("Unable to load your payment account.");
    setWalletScreen("withdraw");
  }
}
  function openProfile() {
    clearMessages();
    setProfileScreen(true);
    setPointsScreen(false);
    setHistoryScreen(false);
  }

  function openPoints() {
    clearMessages();
    setPointsScreen(true);
    setProfileScreen(false);
    setHistoryScreen(false);
  }

 async function toggleNotification() {
  const willOpen = !showNotification;

  setShowNotification(willOpen);

  if (willOpen) {
    // Popup open hote hi sab notifications read
    setNotifications((prev) =>
      prev.map((notification) => ({
        ...notification,
        is_read: true,
      }))
    );

    // Database mein bhi read mark karo
    if (user?.id) {
      try {
        await apiRequest(`/api/notifications/${user.id}/read`, {
          method: "PUT",
        });
      } catch (error) {
        console.error("READ NOTIFICATION ERROR:", error);
      }
    }
  }
}
  function closeExtraScreen() {
    setProfileScreen(false);
    setPointsScreen(false);
    setHistoryScreen(false);
  }

  function openHistory() {
    clearMessages();
    refreshWallet(user?.id);
    setHistoryScreen(true);
    setProfileScreen(false);
    setPointsScreen(false);
  }

  function handleWithdrawClick() {
    clearMessages();
    if (!user?.id) {
      setError("Your session has expired. Please sign in again.");
      return;
    }
    if (!user.is_account_setup) {
      setSetupName(user?.name || "");
      setSetupCnic(user?.cnic || "");
      setSetupPhone(user?.phone || "");
      setSetupPassword("");
      setSetupConfirmPassword("");
      setShowSetup(true);
      setWalletScreen("setup");
      return;
    }
    openWithdraw();
  }

  // ============================================================
  // LOGIN
  // ============================================================
  const handleLogout = () => {
  localStorage.removeItem("ads_watching_user");
  setUser(null);
  setWalletScreen("dashboard");
  clearMessages();
};
async function handleLogin(e) {
  e.preventDefault();
  clearMessages();

  if (!email.trim() || !password) {
    setError("Please enter your email and password.");
    return;
  }

  setLoading(true);

  try {
    const response = await apiRequest("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim(),
        password: password,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      setError(data.message || "Invalid email or password.");
      return;
    }

    const userData = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      email_verified: data.user.email_verified,
      created_at: data.user.created_at,
      cnic: data.user.cnic || null,
      phone: data.user.phone || null,
      is_account_setup: data.user.is_account_setup || false,
      balance: parseFloat(data.user.balance || 0),

      // IMPORTANT
      payment_accounts: Array.isArray(data.user.payment_accounts)
        ? data.user.payment_accounts
        : [],
    };

    saveUser(userData);

    // Set default withdrawal account
    const defaultAccount = userData.payment_accounts.find(
      (account) =>
        String(account.method).trim().toLowerCase() ===
        "easypaisa"
    );

    if (defaultAccount) {
      setWithdrawAccountName(
        defaultAccount.account_name || ""
      );

      setWithdrawAccountNumber(
        defaultAccount.account_number || ""
      );
    } else {
      setWithdrawAccountName("");
      setWithdrawAccountNumber("");
    }

    setPassword("");

    fetchActivePlanCount(userData.id);

  } catch (err) {
    console.error("LOGIN ERROR:", err);

    setError(
      "Unable to connect to server. Please make sure the backend is running."
    );

  } finally {
    setLoading(false);
  }
}
  // ============================================================
  // REGISTER
  // ============================================================

  async function handleRegister(e) {
    e.preventDefault();
    clearMessages();
    if (!registerName.trim() || !registerEmail.trim() || !registerPassword || !registerConfirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (registerPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
   try {
  const response = await apiRequest("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: registerName.trim(),
      email: registerEmail.trim(),
      password: registerPassword,
      referralCode: referralCode || null,
    }),
  });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.message || "Registration failed.");
        return;
      }
      setVerificationEmail(registerEmail.trim().toLowerCase());
      setVerificationOtp("");
      setSuccess(data.message || "Registration successful. OTP sent to your email.");
      setScreen("verify-registration");
    } catch (err) {
      console.error("REGISTER ERROR:", err);
      setError("Unable to connect to server. Please make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyRegistration(e) {
    e.preventDefault();
    clearMessages();
    if (!verificationOtp.trim()) {
      setError("Please enter the OTP.");
      return;
    }
    if (!/^\d{6}$/.test(verificationOtp.trim())) {
      setError("OTP must be exactly 6 digits.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail, code: verificationOtp.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.message || "OTP verification failed.");
        return;
      }
      setSuccess("Email verified successfully. You can now sign in.");
      setEmail(verificationEmail);
      setRegisterName("");
      setRegisterEmail("");
      setRegisterPassword("");
      setRegisterConfirmPassword("");
      setVerificationOtp("");
      setTimeout(() => {
        setScreen("login");
        setSuccess("");
      }, 1200);
    } catch (err) {
      console.error("VERIFY REGISTRATION ERROR:", err);
      setError("Unable to connect to server. Please make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendRegistrationOtp() {
    clearMessages();
    if (!verificationEmail) {
      setError("Registration email is missing.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.message || "Failed to resend OTP.");
        return;
      }
      setSuccess(data.message || "OTP sent successfully.");
    } catch (err) {
      console.error("RESEND OTP ERROR:", err);
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    clearMessages();
    if (!forgotEmail.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.message || "Failed to send password reset OTP.");
        return;
      }
      setSuccess(data.message || "Password reset OTP sent successfully.");
      setResetOtp("");
      setNewPassword("");
      setConfirmNewPassword("");
      setScreen("reset-password");
    } catch (err) {
      console.error("FORGOT PASSWORD ERROR:", err);
      setError("Unable to connect to server. Please make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    clearMessages();
    if (!resetOtp.trim()) {
      setError("Please enter the OTP.");
      return;
    }
    if (!/^\d{6}$/.test(resetOtp.trim())) {
      setError("OTP must be exactly 6 digits.");
      return;
    }
    if (!newPassword) {
      setError("Please enter your new password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          code: resetOtp.trim(),
          newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.message || "Password reset failed.");
        return;
      }
      setSuccess("Password reset successfully. You can now sign in.");
      setEmail(forgotEmail.trim());
      setPassword("");
      setResetOtp("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => {
        setScreen("login");
        setSuccess("");
      }, 1500);
    } catch (err) {
      console.error("RESET PASSWORD ERROR:", err);
      setError("Unable to connect to server. Please make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // ACCOUNT SETUP
  // ============================================================
async function handleAccountSetup(e) {
  e.preventDefault();
  clearMessages();

  if (!setupName.trim()) {
    setError("Please enter your full name.");
    return;
  }

  if (setupCnic.length !== 13) {
    setError("CNIC must be exactly 13 digits.");
    return;
  }

  if (setupPhone.length < 10 || setupPhone.length > 11) {
    setError("Please enter a valid phone number.");
    return;
  }

  if (!setupPaymentMethod) {
    setError("Please select a payment account.");
    return;
  }

  if (setupPassword.length < 6) {
    setError("Password must be at least 6 characters.");
    return;
  }

  if (setupPassword !== setupConfirmPassword) {
    setError("Passwords do not match.");
    return;
  }

  if (!user?.id) {
    setError("Your session has expired. Please sign in again.");
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(
      `${API_URL}/api/user/setup-account`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          name: setupName.trim(),
          cnic: setupCnic,
          phone: setupPhone,
          paymentMethod: setupPaymentMethod,
          password: setupPassword,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      setError(data.message || "Account setup failed.");
      return;
    }

    // Get latest saved payment accounts from backend
    const accountsResponse = await fetch(
      `${API_URL}/api/user/payment-accounts/${user.id}`
    );

    const accountsData = await accountsResponse.json();

    const paymentAccounts =
      accountsResponse.ok && accountsData.success
        ? accountsData.accounts || []
        : [];

    // Update current logged-in user
    const updatedUser = {
      ...user,
      name: setupName.trim(),
      cnic: setupCnic,
      phone: setupPhone,
      payment_method: setupPaymentMethod,
      is_account_setup: true,
      payment_accounts: paymentAccounts,
    };

    localStorage.setItem(
      "ads_watching_user",
      JSON.stringify(updatedUser)
    );

    setUser(updatedUser);

    // Immediately show selected account on withdraw screen
    const selectedAccount = paymentAccounts.find(
      (item) =>
        String(item.method).trim().toLowerCase() ===
        String(setupPaymentMethod).trim().toLowerCase()
    );

    if (selectedAccount) {
      setWithdrawAccountName(
        selectedAccount.account_name || ""
      );

      setWithdrawAccountNumber(
        selectedAccount.account_number || ""
      );
    } else {
      setWithdrawAccountName("");
      setWithdrawAccountNumber("");
    }

    setSuccess(
      `${setupPaymentMethod} account saved successfully!`
    );

    setSetupPassword("");
    setSetupConfirmPassword("");

    setTimeout(() => {
      setSuccess("");
      setWalletScreen("withdraw");
    }, 1200);

  } catch (err) {
    console.error("SETUP ERROR:", err);

    setError(
      "Unable to connect to server. Please make sure the backend is running."
    );
  } finally {
    setLoading(false);
  }
}
  // ============================================================
// WITHDRAW
// ============================================================
const handleWithdrawMethodChange = (method) => {
  setWithdrawMethod(method);

  const account = user?.payment_accounts?.find(
    (item) =>
      String(item.method).trim().toLowerCase() ===
      String(method).trim().toLowerCase()
  );

  if (account) {
    setWithdrawAccountName(
      account.account_name || ""
    );

    setWithdrawAccountNumber(
      account.account_number || ""
    );
  } else {
    setWithdrawAccountName("");
    setWithdrawAccountNumber("");
  }
};
async function handleWithdraw(e) {

  e.preventDefault();

  clearMessages();

  if (!user?.id) {
    setError("Your session has expired. Please sign in again.");
    return;
  }

  if (!user.is_account_setup) {
    setError("Please complete your account setup before withdrawing.");
    setWalletScreen("setup");
    return;
  }

  const amount = Number(withdrawAmount);

  if (!withdrawMethod) {
    setError("Please select a payment method.");
    return;
  }

  // Saved payment account check
  if (!user?.phone) {
    setError(
      "Your payment account is not configured. Please complete account setup."
    );

    setWalletScreen("setup");
    return;
  }

  if (!amount || amount < 100) {
    setError("Minimum withdrawal is Rs 100.");
    return;
  }

  if (amount > balance) {
    setError("Insufficient balance.");
    return;
  }

  if (!withdrawPassword) {
    setError("Please enter your withdraw password.");
    return;
  }

  setLoading(true);

  try {

   const response = await fetch(`${API_URL}/api/withdraw/request`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    
    userId: user.id,
    amount: amount,
    method: withdrawMethod,
    withdrawPassword: withdrawPassword,
  }),
});

const data = await response.json();

console.log("WITHDRAW RESPONSE:", data);

if (!response.ok || !data.success) {
  setError(data.message || "Withdrawal request failed.");
  return;
}

setSuccess(
  data.message || "Withdrawal request submitted successfully."
);

await refreshWallet(user.id);

setWithdrawAmount("");
setWithdrawPassword("");

setTimeout(() => {
  setWalletScreen("dashboard");
  setSuccess("");
}, 2500);
  } catch (err) {

    console.error("WITHDRAW ERROR:", err);

    setError(
      "Unable to connect to server. Please make sure the backend is running."
    );

  } finally {

    setLoading(false);

  }

}
  // ============================================================
  // DEPOSIT
  // ============================================================

  async function handleDepositContinue(e) {
    e.preventDefault();
    clearMessages();
    const amount = Number(depositAmount);
    if (!depositMethod) {
      setError("Please select a payment method.");
      return;
    }
    if (!amount || amount < 100 || amount > 1000000) {
      setError("Deposit amount must be between Rs 100 and Rs 1,000,000.");
      return;
    }
    if (!payerAccount.trim()) {
      setError("Enter the account number you used to send the payment.");
      return;
    }
    if (!paymentReference.trim()) {
      setError("Enter the real payment transaction/reference ID.");
      return;
    }
    if (!user?.id) {
      setError("Your session has expired. Please sign in again.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/wallet/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          method: depositMethod,
          amount,
          payerAccount: payerAccount.trim(),
          paymentReference: paymentReference.trim(),
          paymentNote: paymentNote.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setError(data.message || "Deposit request failed.");
        return;
      }
      setSuccess(data.message || "Deposit submitted for verification.");
      await refreshWallet(user.id);
      setDepositAmount("");
      setPayerAccount("");
      setPaymentReference("");
      setPaymentNote("");
      setTimeout(() => {
         setWalletScreen("dashboard");
        setSuccess("");
      }, 1200);
    } catch (err) {
      console.error("DEPOSIT ERROR:", err);
      setError("Unable to connect to server. Please make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }
   if (window.location.hash === "#/admin") {
    return <AdminPanel />;
  }

  // ============================================================
  // LOGGED-IN APP
  // ============================================================

  if (loggedIn && user) {
    
    
    if (profileScreen) {
      return (
        <div className="dashboard-app">
          
          {showNotification && (
            <div className="global-notification">
              <div className="notification-header">
                <strong>🔔 Notifications</strong>
                <button type="button" onClick={() => setShowNotification(false)}>
                  ×
                </button>
              </div>
              <div className="notification-content">
                {notifications.length === 0 ? (
                  <p>No notifications yet.</p>
                ) : (
                  notifications.map((notification) => (
                    <div
                      className={`notification-item ${notification.is_read ? "" : "unread"}`}
                      key={notification.id}
                    >
                      <strong>{notification.title}</strong>
                      <p>{notification.message}</p>
                      <small>{new Date(notification.created_at).toLocaleString()}</small>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          <header className="dashboard-header">
            <div className="header-left">
              <span className="dashboard-brand">ADS WATCHING</span>
              <h1>Profile</h1>
              {activePlanCount > 0 && (
                <div className="active-plans-badge">
                  <span>🎯</span>
                  Active Plans: <strong>{activePlanCount}</strong>
                </div>
              )}
            </div>
            <div className="header-actions">
              <button className="logout-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </header>
          <main className="dashboard-container">
            <section className="wallet-info-card profile-card">
              <div className="profile-avatar">{user?.name ? user.name.charAt(0).toUpperCase() : "U"}</div>
              <h2>{user?.name || "User"}</h2>
              <p className="profile-email">{user?.email || "No email"}</p>
              <div className="profile-details">
                <div className="profile-detail-row">
                  <span>Full Name</span>
                  <strong>{user?.name || "Not available"}</strong>
                </div>
                <div className="profile-detail-row">
                  <span>Email</span>
                  <strong>{user?.email || "Not available"}</strong>
                </div>
                <div className="profile-detail-row">
                  <span>Phone</span>
                  <strong>{user?.phone || "Not added"}</strong>
                </div>
                <div className="profile-detail-row">
                  <span>CNIC</span>
                  <strong>{user?.cnic || "Not added"}</strong>
                </div>
                <div className="profile-detail-row">
                  <span>Account Status</span>
                  <strong className="profile-status">
                    {user?.is_account_setup ? "✓ Completed" : "⚠ Setup Required"}
                  </strong>
                </div>
                <div className="profile-detail-row">
                  <span>Wallet Balance</span>
                  <strong>Rs {balance.toFixed(2)}</strong>
                </div>
                <div className="profile-detail-row">
                  <span>Active Plans</span>
                  <strong>{activePlanCount}</strong>
                </div>
              </div>
              <button className="wallet-submit-button" onClick={handleLogout}>
                Logout
              </button>
            </section>
          </main>
          <BottomNavigation
            active="profile"
            openDashboard={openDashboard}
            openPoints={openPoints}
            openWallet={openWallet}
            openProfile={openProfile}
            activePlanCount={activePlanCount}
          />
        </div>
      );
    }

    if (pointsScreen) {
      return (
        <div className="dashboard-app">
          {showNotification && (
            <div className="global-notification">
              <div className="notification-header">
                <strong>🔔 Notifications</strong>
                <button type="button" className="notification-close" onClick={() => setShowNotification(false)}>
                  ×
                </button>
              </div>
              <div className="notification-content">
                {transactions.length === 0 ? (
                  <p>No notifications yet.</p>
                ) : (
                  transactions.slice(0, 5).map((tx) => (
                    <div className="notification-item" key={tx.id}>
                      <div>
                        <strong>{tx.type === "deposit" ? "Deposit" : "Withdrawal"}</strong>
                        <small>{tx.method}</small>
                      </div>
                      <div className="notification-right">
                        <strong>Rs {Number(tx.amount).toFixed(2)}</strong>
                        <span className={`wallet-status status-${tx.status}`}>{tx.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          <header className="dashboard-header">
            <div className="header-left">
              <span className="dashboard-brand">ADS WATCHING</span>
              <h1>Points</h1>
              {activePlanCount > 0 && (
                <div className="active-plans-badge">
                  <span>🎯</span>
                  Active Plans: <strong>{activePlanCount}</strong>
                </div>
              )}
            </div>
            <div className="header-actions">
              <button
                type="button"
                className="notification-button"
                onClick={() => setShowNotification((prev) => !prev)}
                title="Notifications"
              >
                🔔
              </button>
              <button type="button" className="logout-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </header>
          <main className="dashboard-container">
            <section className="wallet-card points-main-card">
              <div className="wallet-top">
                <div>
                  <span className="small-label">AVAILABLE POINTS</span>
                  <h2>{user?.total_points || 0} Points</h2>
                  <p>Watch advertisements to earn reward points.</p>
                </div>
                <div className="wallet-icon">🎯</div>
              </div>
              <div className="points-claim-box">
                <span className="small-label">CLAIM REWARDS</span>
                <h3>Your points will appear here</h3>
                <p>Complete available tasks and watch advertisements to collect points.</p>
                <button type="button" className="wallet-submit-button">
                  Claim Points
                </button>
              </div>
            </section>
          </main>
          
        </div>
      );
    }

    if (historyScreen) {
      return (
        <div className="dashboard-app">
          {showNotification && (
            <div className="global-notification">
              <div className="notification-header">
                <strong>🔔 Notifications</strong>
                <button type="button" className="notification-close" onClick={() => setShowNotification(false)}>
                  ×
                </button>
              </div>
              <div className="notification-content">
                {transactions.length === 0 ? (
                  <p>No notifications yet.</p>
                ) : (
                  transactions.slice(0, 5).map((tx) => (
                    <div className="notification-item" key={tx.id}>
                      <div>
                        <strong>{tx.type === "deposit" ? "Deposit" : "Withdrawal"}</strong>
                        <small>{tx.method}</small>
                      </div>
                      <div className="notification-right">
                        <strong>{tx.type === "deposit" ? "+" : "-"} Rs {Number(tx.amount).toFixed(2)}</strong>
                        <span className={`wallet-status status-${tx.status}`}>{tx.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          <header className="dashboard-header">
            <div className="header-left">
              <span className="dashboard-brand">ADS WATCHING</span>
              <h1>History</h1>
              {activePlanCount > 0 && (
                <div className="active-plans-badge">
                  <span>🎯</span>
                  Active Plans: <strong>{activePlanCount}</strong>
                </div>
              )}
            </div>
            <div className="header-actions">
              <button
                type="button"
                className="notification-button"
                onClick={() => setShowNotification(!showNotification)}
                title="Notifications"
              >
                🔔
              </button>
              <button type="button" className="logout-button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </header>
          <main className="dashboard-container">
            <section className="wallet-info-card">
              <span className="small-label">NOTIFICATIONS</span>
              <h2>Transaction History</h2>
              {transactions.length === 0 ? (
                <p className="wallet-empty">No transaction history yet.</p>
              ) : (
                <div className="wallet-transactions">
                  {transactions.map((tx) => (
                    <div className="wallet-transaction" key={tx.id}>
                      <div>
                        <strong>{tx.type === "deposit" ? "Deposit" : "Withdrawal"} · {tx.method}</strong>
                        <small>{tx.payment_reference || tx.reference || ""}</small>
                      </div>
                      <div className="wallet-transaction-right">
                        <strong>{tx.type === "deposit" ? "+" : "-"} Rs {Number(tx.amount).toFixed(2)}</strong>
                        <span className={`wallet-status status-${tx.status}`}>{tx.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </main>
          <BottomNavigation
            active=""
            openDashboard={openDashboard}
            openPoints={openPoints}
            openWallet={openWallet}
            openProfile={openProfile}
            activePlanCount={activePlanCount}
          />
        </div>
      );
    }

    if (walletScreen === "setup") {
      return (
        <div className="dashboard-app">
          <header className="dashboard-header">
            <div className="header-left">
              <span className="dashboard-brand">ADS WATCHING</span>
              <h1>Account Setup</h1>
            </div>
            <button
              className="logout-button"
              onClick={() => {
                clearMessages();
                setWalletScreen("dashboard");
              }}
            >
              ← Dashboard
            </button>
          </header>
          <main className="dashboard-container">
            <section className="wallet-form-card">
              <div className="wallet-form-heading">
                <span className="small-label">COMPLETE YOUR PROFILE</span>
                <h2>Account Setup Required</h2>
                <p>Please complete your account details before withdrawing funds.</p>
              </div>
              {error && (
                <div className="alert alert-error">
                  <span className="alert-icon">!</span>
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="alert alert-success">
                  <span className="alert-icon">✓</span>
                  <span>{success}</span>
                </div>
              )}
              <form onSubmit={handleAccountSetup}>
                <div className="input-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={setupName}
                    onChange={(e) => setSetupName(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="input-group">
  <label>Select Account</label>

  <div className="payment-methods">

    <button
      type="button"
      className={
        setupPaymentMethod === "EasyPaisa"
          ? "payment-method active"
          : "payment-method"
      }
      onClick={() => setSetupPaymentMethod("EasyPaisa")}
      disabled={loading}
    >
      <strong>EP</strong>
      <span>EasyPaisa</span>
    </button>

    <button
      type="button"
      className={
        setupPaymentMethod === "JazzCash"
          ? "payment-method active"
          : "payment-method"
      }
      onClick={() => setSetupPaymentMethod("JazzCash")}
      disabled={loading}
    >
      <strong>JC</strong>
      <span>JazzCash</span>
    </button>

    <button
      type="button"
      className={
        setupPaymentMethod === "Bank Account"
          ? "payment-method active"
          : "payment-method"
      }
      onClick={() => setSetupPaymentMethod("Bank Account")}
      disabled={loading}
    >
      <strong>BK</strong>
      <span>Bank Account</span>
    </button>

  </div>

  <small>
    Select the account you want to use for withdrawals.
  </small>
</div>
                <div className="input-group">
                  <label>CNIC (Without dashes)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={13}
                    placeholder="1234567890123"
                    value={setupCnic}
                    onChange={(e) => setSetupCnic(e.target.value.replace(/\D/g, "").slice(0, 13))}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="input-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="03XXXXXXXXX"
                    value={setupPhone}
                    onChange={(e) => setSetupPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="input-group">
                  <label>Withdraw Password</label>
                  <input
                    type="password"
                    placeholder="Set a password for withdrawals"
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <small>This password will be required for withdrawals.</small>
                </div>
                <div className="input-group">
                  <label>Confirm Withdraw Password</label>
                  <input
                    type="password"
                    placeholder="Confirm your password"
                    value={setupConfirmPassword}
                    onChange={(e) => setSetupConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <button type="submit" className="wallet-submit-button" disabled={loading}>
                  {loading ? "Processing..." : "Complete Setup →"}
                </button>
              </form>
            </section>
          </main>
        </div>
      );
    }

    if (walletScreen === "withdraw") {

  return (

    <div className="dashboard-app withdraw-game-page">

      {/* HEADER */}

      <header className="dashboard-header">

        <div className="header-left">

          <span className="dashboard-brand">
            ADS WATCHING
          </span>

          <h1>Withdraw Funds</h1>

          {activePlanCount > 0 && (

            <div className="active-plans-badge">

              <span>🎯</span>

              Active Plans: <strong>{activePlanCount}</strong>

            </div>

          )}

        </div>

        <button
          className="logout-button"
          onClick={() => {

            clearMessages();

            setWalletScreen("dashboard");

          }}
        >
          ← Back
        </button>

      </header>


      <main className="withdraw-game-container">

        {/* TOP TITLE */}

        <div className="withdraw-title-banner">

          <span className="withdraw-crown">♛</span>

          <h1>WITHDRAW</h1>

          <span className="withdraw-crown">♛</span>

        </div>


        {/* MAIN WITHDRAW PANEL */}

        <section className="withdraw-game-card">


          {/* LEFT PAYMENT METHODS */}

          <div className="withdraw-sidebar">

            <button
  type="button"
  className={
    withdrawMethod === "EasyPaisa"
      ? "game-method active"
      : "game-method"
  }
  onClick={() => handleWithdrawMethodChange("EasyPaisa")}
  disabled={loading}
>
  <span>EASYPAISA</span>
  <b>›</b>
</button>

<button
  type="button"
  className={
    withdrawMethod === "JazzCash"
      ? "game-method active"
      : "game-method"
  }
  onClick={() => handleWithdrawMethodChange("JazzCash")}
  disabled={loading}
>
  <span>JAZZCASH</span>
  <b>›</b>
</button>

<button
  type="button"
  className={
    withdrawMethod === "Bank Account"
      ? "game-method active"
      : "game-method"
  }
  onClick={() => handleWithdrawMethodChange("Bank Account")}
  disabled={loading}
>
  <span>BANK ACCOUNT</span>
  <b>›</b>
</button>

          </div>


          {/* CENTER */}

          <div className="withdraw-game-content">


            {/* BALANCE BOXES */}

            <div className="game-balance-grid">

              <div className="game-balance-box total">

                <span>Total Balance</span>

                <strong>
                  Rs {balance.toFixed(2)}
                </strong>

              </div>


              <div className="game-balance-box withdrawable">

                <span>Withdrawable</span>

                <strong>
                  Rs {balance.toFixed(2)}
                </strong>

              </div>

            </div>


            {/* ERRORS */}

            {error && (

              <div className="alert alert-error">

                <span className="alert-icon">!</span>

                <span>{error}</span>

              </div>

            )}


            {success && (

              <div className="alert alert-success">

                <span className="alert-icon">✓</span>

                <span>{success}</span>

              </div>

            )}


            <form onSubmit={handleWithdraw}>


              {/* AMOUNT */}

              <div className="game-form-row">

                <label>Amount</label>

                <div className="game-input amount-input">

                  <span>Rs</span>

                  <input
                    type="number"
                    min="500"
                    max={balance}
                    step="0.01"
                    placeholder="0"
                    value={withdrawAmount}
                    onChange={(e) =>
                      setWithdrawAmount(e.target.value)
                    }
                    required
                    disabled={loading}
                  />

                </div>

              </div>


              {/* SAVED NAME */}

              <div className="game-form-row">

                <label>Withdrawal Name</label>

                <div className="saved-game-value">

                  👤 {withdrawAccountName || "Not Available"}

                </div>

              </div>


              {/* SAVED ACCOUNT NUMBER */}

              <div className="game-form-row">

                <label>Account Number</label>

                <div className="saved-game-value">

                  📱 {withdrawAccountNumber || "Not Available"}

                </div>

              </div>


              {/* PAYMENT METHOD */}

              <div className="game-form-row">

                <label>Method</label>

                <div className="saved-game-value method-value">

                  💳 {withdrawMethod}

                </div>

              </div>


              {/* WITHDRAW PASSWORD */}

              <div className="game-form-row">

                <label>Withdraw Password</label>

                <div className="game-input">

                  <input
                    type="password"
                    placeholder="Enter withdraw password"
                    value={withdrawPassword}
                    onChange={(e) =>
                      setWithdrawPassword(e.target.value)
                    }
                    required
                    disabled={loading}
                  />

                </div>

              </div>


              {/* WITHDRAW BUTTON */}

              <div className="game-withdraw-button-wrap">

                <button
                  type="submit"
                  className="game-withdraw-button"
                  disabled={loading}
                >

                  {loading
                    ? "PROCESSING..."
                    : "WITHDRAW"
                  }

                </button>

              </div>

            </form>

          </div>


          {/* RIGHT SIDE */}

          <div className="withdraw-right-panel">

            <button
  type="button"
  className="right-panel-item"
  onClick={() => {
    clearMessages();
    setWalletScreen("setup");
  }}
>
  <span className="right-icon">👛</span>
  <span>Wallet</span>
</button>


            <button
              type="button"
              className="right-panel-item"
              onClick={() => alert("Minimum withdrawal: Rs 500")}
            >

              <span className="right-icon">❓</span>

              <span>Rules</span>

            </button>

          </div>


        </section>

      </main>

    </div>

  );

}
    if (walletScreen === "deposit") {
      const info = depositInfo[depositMethod] || {};
      return (
        <div className="dashboard-app">
          <header className="dashboard-header">
            <div className="header-left">
              <span className="dashboard-brand">ADS WATCHING</span>
              <h1>Deposit</h1>
              {activePlanCount > 0 && (
                <div className="active-plans-badge">
                  <span>🎯</span>
                  Active Plans: <strong>{activePlanCount}</strong>
                </div>
              )}
            </div>
            <button
              className="logout-button"
              onClick={() => {
                clearMessages();
                setWalletScreen("wallet");
              }}
            >
              ← Back
            </button>
          </header>
          <main className="dashboard-container">
            <section className="wallet-form-card">
              <div className="wallet-form-heading">
                <span className="small-label">ADD FUNDS</span>
                <h2>Deposit money</h2>
                <p>Send the exact amount to the selected account, then submit the transaction reference for verification.</p>
              </div>
              {error && (
                <div className="alert alert-error">
                  <span className="alert-icon">!</span>
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="alert alert-success">
                  <span className="alert-icon">✓</span>
                  <span>{success}</span>
                </div>
              )}
              <form onSubmit={handleDepositContinue}>
               <div className="input-group">

  <label>Select Payment Method</label>

  <div className="payment-methods">

    <button
      type="button"
      className={
        setupPaymentMethod === "EasyPaisa"
          ? "payment-method active"
          : "payment-method"
      }
      onClick={() => setSetupPaymentMethod("EasyPaisa")}
      disabled={loading}
    >
      <strong>EP</strong>
      <span>EasyPaisa</span>
    </button>


    <button
      type="button"
      className={
        setupPaymentMethod === "JazzCash"
          ? "payment-method active"
          : "payment-method"
      }
      onClick={() => setSetupPaymentMethod("JazzCash")}
      disabled={loading}
    >
      <strong>JC</strong>
      <span>JazzCash</span>
    </button>


    <button
      type="button"
      className={
        setupPaymentMethod === "Bank Account"
          ? "payment-method active"
          : "payment-method"
      }
      onClick={() => setSetupPaymentMethod("Bank Account")}
      disabled={loading}
    >
      <strong>BK</strong>
      <span>Bank Account</span>
    </button>

  </div>

  <small>
    This payment method will be linked to your withdrawal account.
  </small>

</div>
                <div className="payment-account-info">
                  <div className="payment-account-title">Send payment to {depositMethod}</div>
                  <div className="payment-account-row">
                    <span>Account Number</span>
                    <strong>{info.accountNumber || "03439540534"}</strong>
                  </div>
                  <div className="payment-account-row">
                    <span>Account Name</span>
                    <strong>{info.accountName || "RIZWAN ISHAQ"}</strong>
                  </div>
                </div>
                <div className="input-group">
                  <label htmlFor="deposit-amount">Deposit amount</label>
                  <div className="money-input">
                    <span>Rs</span>
                    <input
                      id="deposit-amount"
                      type="number"
                      min="100"
                      max="1000000"
                      step="0.01"
                      placeholder="Enter amount"
                      value={depositAmount}
                      disabled={loading}
                      onChange={(e) => setDepositAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label htmlFor="payer-account">Your payment account</label>
                  <input
                    id="payer-account"
                    className="wallet-normal-input"
                    type="text"
                    placeholder="03XXXXXXXXX / bank account"
                    value={payerAccount}
                    disabled={loading}
                    onChange={(e) => setPayerAccount(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="payment-reference">Transaction / reference ID</label>
                  <input
                    id="payment-reference"
                    className="wallet-normal-input"
                    type="text"
                    placeholder="Enter the real transaction ID"
                    value={paymentReference}
                    disabled={loading}
                    onChange={(e) => setPaymentReference(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="payment-note">Payment note (optional)</label>
                  <textarea
                    id="payment-note"
                    className="wallet-textarea"
                    rows="3"
                    placeholder="Optional note for admin"
                    value={paymentNote}
                    disabled={loading}
                    onChange={(e) => setPaymentNote(e.target.value)}
                  />
                </div>
                <button type="submit" className="wallet-submit-button" disabled={loading}>
                  {loading ? "Submitting..." : "Submit Deposit"}
                  <span>→</span>
                </button>
              </form>
            </section>
          </main>
        </div>
      );
    }

   
// MAIN DASHBOARD
return (
  <div className="dashboard-app">
    {isRefreshing && (
  <div className="mobile-refresh-indicator">
    <span className="refresh-spinner">↻</span>
    <span>Refres</span>
  </div>
)}
 {/* ============================================================
        ANNOUNCEMENT POPUP
    ============================================================ */}

    {showAnnouncement && announcement && (

      <div
        className="announcement-overlay"
        onClick={closeAnnouncement}
      >

        <div
          className="announcement-modal"
          onClick={(e) => e.stopPropagation()}
        >

          <button
            type="button"
            className="announcement-close"
            onClick={closeAnnouncement}
          >
            ×
          </button>

          <div className="announcement-popup-icon">
            📢
          </div>

          <span className="announcement-popup-label">
            OFFICIAL ANNOUNCEMENT
          </span>

          <h2 className="announcement-popup-title">
            {announcement.title}
          </h2>

          <div className="announcement-popup-message">
            {announcement.message}
          </div>

          <div className="announcement-popup-date">
            {announcement.created_at
              ? new Date(announcement.created_at).toLocaleString()
              : ""}
          </div>

          <button
            type="button"
            className="announcement-popup-button"
            onClick={closeAnnouncement}
          >
            Got it
          </button>

        </div>

      </div>

    )}
    {/* NOTIFICATIONS POPUP */}
    {showNotification && (
      <div className="global-notification">
        <div className="notification-header">
          <strong>🔔 Notifications</strong>

          <button
            type="button"
            className="notification-close"
            onClick={() => setShowNotification(false)}
          >
            ×
          </button>
        </div>

        <div className="notification-content">
          {notifications.length === 0 ? (
            <p>No notifications yet.</p>
          ) : (
            notifications.map((notification) => (
              <div
                className={`notification-item ${
                  notification.is_read ? "" : "unread"
                }`}
                key={notification.id}
              >
                <strong>{notification.title}</strong>

                <p>{notification.message}</p>

                <small>
                  {new Date(notification.created_at).toLocaleString()}
                </small>
              </div>
            ))
          )}
        </div>
      </div>
    )}

    {/* DASHBOARD HEADER */}
    <header className="dashboard-header">

      <div className="header-left">

        
      </div>

      {/* HEADER ACTIONS */}
      <div className="header-actions">

        {/* NOTIFICATION BUTTON */}
        <button
          type="button"
          className="notification-button"
          onClick={toggleNotification}
          title="Notifications"
        >
          🔔

          {notifications.filter(
            (notification) => !notification.is_read
          ).length > 0 && (
            <span className="notification-badge">
              {notifications.filter(
                (notification) => !notification.is_read
              ).length}
            </span>
          )}
        </button>

        {/* LOGOUT BUTTON */}
        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>

      </div>
    </header>

    {/* DASHBOARD CONTENT */}
    <main className="dashboard-container">

      {/* WELCOME CARD */}
      <section className="welcome-card">
        <div>
          <span className="small-label">WELCOME BACK</span>

          <h2>
            {user?.name
              ? `Hello, ${user.name}`
              : "Start Watching & Earn"}
          </h2>

          <p>
            Watch available advertisements and collect virtual reward points.
          </p>
        </div>

        <div className="welcome-icon">▶</div>
      </section>
{/* ============================================================
    REFERRAL CARD
============================================================ */}
<section className="referral-card">
  <div className="referral-header">
    <div>
      <span className="small-label">🎁 REFER & EARN</span>
      <h3>Invite Friends • Earn Rewards</h3>
      <p>
        Share your referral link and earn 30% from every qualifying
        plan purchased through your link.
      </p>
    </div>

    <div className="referral-icon">🎁</div>
  </div>

  {/* Referral Reward Examples */}
  <div className="referral-rewards">
    <div className="referral-reward-item">
      <span className="reward-emoji">🚀</span>
      <div>
        <strong>1 Friend</strong>
        <span>Rs. 300 Plan</span>
      </div>
      <b>+ Rs. 90</b>
    </div>

    <div className="referral-reward-item">
      <span className="reward-emoji">🔥</span>
      <div>
        <strong>2 Friends</strong>
        <span>Rs. 500 Plan</span>
      </div>
      <b>+ Rs. 150</b>
    </div>

    <div className="referral-reward-item">
      <span className="reward-emoji">💎</span>
      <div>
        <strong>3 Friends</strong>
        <span>Rs. 1,000 Plan</span>
      </div>
      <b>+ Rs. 300</b>
    </div>
  </div>

  <div className="referral-earning-banner">
    <strong>🎁 Earn 30% on Every Referral</strong>
    <p>
      The more friends you invite, the more you can earn.
      Every qualifying plan purchased through your referral
      link gives you a 30% referral reward based on the plan amount.
    </p>
  </div>

  <div className="referral-link-section">
    <span className="referral-label">
      Your Referral Link
    </span>

    <div className="referral-link-box">
      <span>
        {referralLoading
          ? "Loading referral link..."
          : referralData?.link || "Referral link unavailable"}
      </span>
    </div>

    <div className="referral-actions">
      <button
        type="button"
        onClick={copyReferralLink}
        disabled={!referralData?.link}
      >
        {referralCopied ? "✓ Copied" : "📋 Copy Link"}
      </button>

      <button
        type="button"
        onClick={shareReferralLink}
        disabled={!referralData?.link}
      >
        ↗ Share
      </button>
    </div>
  </div>

  <div className="referral-stats">
    <div>
      <strong>
        {referralData?.totalReferrals || 0}
      </strong>
      <span>Total Referrals</span>
    </div>

    <div>
      <strong>
        {referralData?.totalReferralPoints || 0}
      </strong>
      <span>Referral Rewards</span>
    </div>
  </div>
</section>
      {/* WALLET */}
      <section className="dashboard-stats">

        <section className="wallet-card">

          <div className="wallet-top">
            <div>
              <span className="small-label">MY WALLET</span>

              <h2>Rs {balance.toFixed(2)}</h2>

              <p>Available balance</p>
            </div>

            
          </div>

          <div className="wallet-actions">

            <button
              type="button"
              className="wallet-button wallet-withdraw"
              onClick={handleWithdrawClick}
            >
              <span>↗</span>
              Withdraw
            </button>

          </div>
        </section>

      </section>

      {/* PLANS */}
      <section className="plans-section">

        <div className="section-title">

          <div>
            <span className="small-label">
              MEMBERSHIP PLANS
            </span>

            <h2>Choose Your Plan</h2>
          </div>

          <span className="virtual-badge">
            🎯 Plans
          </span>

        </div>

        <Plans
          user={user}
          onPlanPurchased={handlePlanPurchased}
        />

      </section>

    </main>


  </div>
);
              }

  // ============================================================
  // LOGIN SCREENS
  // ============================================================

  if (screen === "verify-registration") {
    return (
      <div className="login-page">
        <div className="background-glow glow-one"></div>
        <div className="background-glow glow-two"></div>
        <main className="login-wrapper">
          <div className="brand">
            <div className="brand-icon">▶</div>
            <div>
              <h1>Ads Watching</h1>
              <p>WATCH • EARN • REWARD</p>
            </div>
          </div>
          <section className="login-card">
            <div className="login-heading">
              <span className="welcome-label">EMAIL VERIFICATION</span>
              <h2>Verify your email</h2>
              <p>Enter the 6-digit verification code sent to:</p>
              <strong>{verificationEmail}</strong>
            </div>
            {error && (
              <div className="alert alert-error">
                <span className="alert-icon">!</span>
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="alert alert-success">
                <span className="alert-icon">✓</span>
                <span>{success}</span>
              </div>
            )}
            <form onSubmit={handleVerifyRegistration}>
              <div className="input-group">
                <label htmlFor="verification-otp">Verification code</label>
                <div className="input-wrapper">
                  <span className="input-icon">#</span>
                  <input
                    id="verification-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={verificationOtp}
                    onChange={(e) => setVerificationOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    autoComplete="one-time-code"
                    disabled={loading}
                  />
                </div>
              </div>
              <button type="submit" className="login-button" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify email
                    <span className="button-arrow">→</span>
                  </>
                )}
              </button>
            </form>
            <div className="register-area">
              <p>Didn't receive the code?</p>
              <button type="button" className="register-button" onClick={handleResendRegistrationOtp} disabled={loading}>
                Send OTP again
              </button>
              <button type="button" className="register-button" onClick={goToLogin} disabled={loading}>
                ← Back to sign in
              </button>
            </div>
          </section>
          <p className="login-footer">© 2026 Ads Watching • Virtual Rewards Platform</p>
        </main>
      </div>
    );
  }

  if (screen === "forgot-password") {
    return (
      <div className="login-page">
        <div className="background-glow glow-one"></div>
        <div className="background-glow glow-two"></div>
        <main className="login-wrapper">
          <div className="brand">
            <div className="brand-icon">▶</div>
            <div>
              <h1>Ads Watching</h1>
              <p>WATCH • EARN • REWARD</p>
            </div>
          </div>
          <section className="login-card">
            <div className="login-heading">
              <span className="welcome-label">ACCOUNT RECOVERY</span>
              <h2>Forgot your password?</h2>
              <p>Enter your registered email and we'll send you a password reset code.</p>
            </div>
            {error && (
              <div className="alert alert-error">
                <span className="alert-icon">!</span>
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="alert alert-success">
                <span className="alert-icon">✓</span>
                <span>{success}</span>
              </div>
            )}
            <form onSubmit={handleForgotPassword}>
              <div className="input-group">
                <label htmlFor="forgot-email">Email address</label>
                <div className="input-wrapper">
                  <span className="input-icon">@</span>
                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="Enter your registered email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
              </div>
              <button type="submit" className="login-button" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Sending OTP...
                  </>
                ) : (
                  <>
                    Send reset code
                    <span className="button-arrow">→</span>
                  </>
                )}
              </button>
            </form>
            <div className="register-area">
              <button type="button" className="register-button" onClick={goToLogin} disabled={loading}>
                ← Back to sign in
              </button>
            </div>
          </section>
          <p className="login-footer">© 2026 Ads Watching • Virtual Rewards Platform</p>
        </main>
      </div>
    );
  }

  if (screen === "reset-password") {
    return (
      <div className="login-page">
        <div className="background-glow glow-one"></div>
        <div className="background-glow glow-two"></div>
        <main className="login-wrapper">
          <div className="brand">
            <div className="brand-icon">▶</div>
            <div>
              <h1>Ads Watching</h1>
              <p>WATCH • EARN • REWARD</p>
            </div>
          </div>
          <section className="login-card">
            <div className="login-heading">
              <span className="welcome-label">RESET PASSWORD</span>
              <h2>Create new password</h2>
              <p>Enter the OTP sent to your email and choose a new password.</p>
            </div>
            {error && (
              <div className="alert alert-error">
                <span className="alert-icon">!</span>
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="alert alert-success">
                <span className="alert-icon">✓</span>
                <span>{success}</span>
              </div>
            )}
            <form onSubmit={handleResetPassword}>
              <div className="input-group">
                <label htmlFor="reset-otp">Verification code</label>
                <div className="input-wrapper">
                  <span className="input-icon">#</span>
                  <input
                    id="reset-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit OTP"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    autoComplete="one-time-code"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="new-password">New password</label>
                <div className="input-wrapper">
                  <span className="input-icon">•••</span>
                  <input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Minimum 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="show-password"
                    onClick={() => setShowNewPassword((current) => !current)}
                    disabled={loading}
                  >
                    {showNewPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="confirm-new-password">Confirm new password</label>
                <div className="input-wrapper">
                  <span className="input-icon">•••</span>
                  <input
                    id="confirm-new-password"
                    type="password"
                    placeholder="Repeat your new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </div>
              </div>
              <button type="submit" className="login-button" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Resetting password...
                  </>
                ) : (
                  <>
                    Reset password
                    <span className="button-arrow">→</span>
                  </>
                )}
              </button>
            </form>
            <div className="register-area">
              <button type="button" className="register-button" onClick={goToLogin} disabled={loading}>
                ← Back to sign in
              </button>
            </div>
          </section>
          <p className="login-footer">© 2026 Ads Watching • Virtual Rewards Platform</p>
        </main>
      </div>
    );
  }

  if (screen === "register") {
    return (
      <div className="login-page">
        <div className="background-glow glow-one"></div>
        <div className="background-glow glow-two"></div>
        <main className="login-wrapper">
          <div className="brand">
            <div className="brand-icon">▶</div>
            <div>
              <h1>Ads Watching</h1>
              <p>WATCH • EARN • REWARD</p>
            </div>
          </div>
          <section className="login-card">
            <div className="login-heading">
              <span className="welcome-label">GET STARTED</span>
              <h2>Create your account</h2>
              <p>Register now and start earning virtual rewards.</p>
            </div>
            {error && (
              <div className="alert alert-error">
                <span className="alert-icon">!</span>
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="alert alert-success">
                <span className="alert-icon">✓</span>
                <span>{success}</span>
              </div>
            )}
            <form onSubmit={handleRegister}>
              <div className="input-group">
                <label htmlFor="register-name">Full name</label>
                <div className="input-wrapper">
                  <span className="input-icon">●</span>
                  <input
                    id="register-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    autoComplete="name"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="register-email">Email address</label>
                <div className="input-wrapper">
                  <span className="input-icon">@</span>
                  <input
                    id="register-email"
                    type="email"
                    placeholder="Enter your email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="register-password">Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">•••</span>
                  <input
                    id="register-password"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="register-confirm-password">Confirm password</label>
                <div className="input-wrapper">
                  <span className="input-icon">•••</span>
                  <input
                    id="register-confirm-password"
                    type="password"
                    placeholder="Repeat your password"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="input-group">
  <label htmlFor="register-referral">Referral Code</label>

  <div className="input-wrapper">
    <span className="input-icon">🎁</span>

    <input
      id="register-referral"
      type="text"
      placeholder="Enter referral code"
      value={referralCode}
      onChange={(e) =>
        setReferralCode(e.target.value.toUpperCase())
      }
      autoComplete="off"
      disabled={loading}
    />
  </div>
</div>
              <button type="submit" className="login-button" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account
                    <span className="button-arrow">→</span>
                  </>
                )}
              </button>
            </form>
            <div className="register-area">
              <p>Already have an account?</p>
              <button type="button" className="register-button" onClick={goToLogin} disabled={loading}>
                ← Sign in
              </button>
            </div>
          </section>
          <p className="login-footer">© 2026 Ads Watching • Virtual Rewards Platform</p>
        </main>
      </div>
    );
  }

  // LOGIN
  return (
    <div className="login-page">
      <div className="background-glow glow-one"></div>
      <div className="background-glow glow-two"></div>
      <main className="login-wrapper">
        <div className="brand">
          <div className="brand-icon">▶</div>
          <div>
            <h1>Ads Watching</h1>
            <p>WATCH • EARN • REWARD</p>
          </div>
        </div>
        <section className="login-card">
          <div className="login-heading">
            <span className="welcome-label">WELCOME BACK</span>
            <h2>Sign in to your account</h2>
            <p>Continue watching ads and collecting your rewards.</p>
          </div>
          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">!</span>
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              <span className="alert-icon">✓</span>
              <span>{success}</span>
            </div>
          )}
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="email">Email address</label>
              <div className="input-wrapper">
                <span className="input-icon">@</span>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>
            <div className="input-group">
              <div className="password-label-row">
                <label htmlFor="password">Password</label>
                <button type="button" className="forgot-button" onClick={goToForgotPassword} disabled={loading}>
                  Forgot password?
                </button>
              </div>
              <div className="input-wrapper">
                <span className="input-icon">•••</span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="show-password"
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={loading}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <span className="button-arrow">→</span>
                </>
              )}
            </button>
          </form>
          <div className="divider">
            <span>OR</span>
          </div>
          <div className="register-area">
            <p>Don't have an account?</p>
            <button type="button" className="register-button" onClick={goToRegister} disabled={loading}>
              Create new account
            </button>
          </div>
        </section>
        <p className="login-footer">© 2026 Ads Watching • Virtual Rewards Platform</p>
      </main>
    </div>
  );
}

export default App;

