require("dotenv").config();
const { Resend } = require("resend");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 5001;
// ============================================================
// RESEND EMAIL
// ============================================================

const resend = new Resend(process.env.RESEND_API_KEY);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image screenshots are allowed"));
    }

    cb(null, true);
  },
});
// ============================================================
// OTP HELPERS
// ============================================================

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function createAndSendOtp({
  email,
  userId = null,
  purpose,
}) {
  const code = generateOtp();

  await pool.query(
    `
    DELETE FROM email_otps
    WHERE email = $1
      AND purpose = $2
    `,
    [email, purpose]
  );

  await pool.query(
    `
    INSERT INTO email_otps
    (
      user_id,
      email,
      code,
      purpose,
      expires_at
    )
    VALUES
    (
      $1,
      $2,
      $3,
      $4,
      NOW() + INTERVAL '10 minutes'
    )
    `,
    [userId, email, code, purpose]
  );

 const subject =
  purpose === "registration"
    ? "Ads Watching - Email Verification OTP"
    : "Ads Watching - Password Reset OTP";

const message =
  purpose === "registration"
    ? `Your Ads Watching verification OTP is ${code}. This OTP will expire in 10 minutes.`
    : `Your Ads Watching password reset OTP is ${code}. This OTP will expire in 10 minutes.`;

const { data, error } = await resend.emails.send({
  from: process.env.RESEND_FROM_EMAIL ||  "noreply@adswatching.online",
  to: [email],
  subject: subject,
  text: message,
});

if (error) {
  console.error("RESEND EMAIL ERROR:", error);
  throw new Error(error.message);
}

console.log("OTP EMAIL SENT:", data?.id);

  return true;
}

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());
app.use(express.json());

// ============================================================
// POSTGRESQL CONNECTION
// ============================================================
const dbUrl = process.env.DATABASE_URL;

const poolConfig = dbUrl
  ? {
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false,
      },
    }
  : {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: false,
    };

console.log(
  "DATABASE HOST:",
  dbUrl
    ? new URL(dbUrl).hostname
    : process.env.DB_HOST || "DATABASE HOST NOT FOUND"
);

const pool = new Pool(poolConfig);

pool
  .query("SELECT NOW()")
  .then(() => {
    console.log("PostgreSQL connected successfully");
  })
  .catch((err) => {
    console.error("PostgreSQL connection error:", err.message);
  });
// ============================================================
// NOTIFICATION HELPER
// ============================================================

async function createNotification(userId, title, message, db = pool) {
  if (!userId) return;

  try {
    await db.query(
      `
      INSERT INTO notifications
      (
        user_id,
        title,
        message,
        is_read,
        created_at
      )
      VALUES ($1, $2, $3, false, NOW())
      `,
      [userId, title, message]
    );
  } catch (error) {
    // Notification failure should NOT break the main API
    console.error("CREATE NOTIFICATION ERROR:", error.message);
  }
}
// ============================================================
// ROOT
// ============================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Ads Watching API is running",
  });
});

// ============================================================
// HEALTH
// ============================================================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is healthy",
  });
});
// ==================== ANNOUNCEMENTS ====================

// Get latest active announcement for users
app.get("/api/announcements/latest", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, message, created_at
      FROM announcements
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `);

    res.json({
      success: true,
      announcement: result.rows[0] || null,
    });
  } catch (error) {
    console.error("Latest announcement error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load announcement",
    });
  }
});


// Admin: Get all announcements
app.get(
  "/api/admin/announcements",
  authenticateAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT id, title, message, is_active, created_at
        FROM announcements
        ORDER BY created_at DESC
      `);

      res.json({
        success: true,
        announcements: result.rows,
      });
    } catch (error) {
      console.error("Admin announcements error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to load announcements",
      });
    }
  }
);


// Admin: Create announcement
app.post(
  "/api/admin/announcements",
  authenticateAdmin,
  async (req, res) => {
    try {
      const { title, message } = req.body;

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: "Title and message are required",
        });
      }

      const result = await pool.query(
        `
        INSERT INTO announcements
        (title, message, is_active, created_at)
        VALUES ($1, $2, true, NOW())
        RETURNING id, title, message, is_active, created_at
        `,
        [title.trim(), message.trim()]
      );
// Send notification to all users
await pool.query(
  `
  INSERT INTO notifications
  (
    user_id,
    title,
    message,
    is_read,
    created_at
  )
  SELECT
    id,
    $1,
    $2,
    false,
    NOW()
  FROM users
  `,
  [
    "New Update 📢",
    `${title.trim()}: ${message.trim()}`,
  ]
);

      res.json({
        success: true,
        message: "Announcement published successfully",
        announcement: result.rows[0],
      });
    } catch (error) {
      console.error("Create announcement error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to create announcement",
      });
    }
  }
);


// Admin: Deactivate announcement
app.put(
  "/api/admin/announcements/:id/deactivate",
  authenticateAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `
        UPDATE announcements
        SET is_active = false
        WHERE id = $1
        RETURNING *
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Announcement not found",
        });
      }

      res.json({
        success: true,
        message: "Announcement deactivated successfully",
        announcement: result.rows[0],
      });
    } catch (error) {
      console.error("Deactivate announcement error:", error);

      res.status(500).json({
        success: false,
        message: "Failed to deactivate announcement",
      });
    }
  }
);

// ============================================================
// ADMIN ACTIVITY ← YAHAN ADD KARO
// ============================================================

app.get(
  "/api/admin/activity",
  authenticateAdmin,
  async (req, res) => {
    try {
      const activities = [];

      const depositsResult = await pool.query(`
        SELECT
          id,
          'deposit' AS type,
          user_id,
          amount,
          status,
          created_at
        FROM payment_requests
        WHERE payment_type IN ('deposit', 'plan_purchase')
      `);

      const withdrawalsResult = await pool.query(`
        SELECT
          id,
          'withdrawal' AS type,
          user_id,
          amount,
          status,
          created_at
        FROM withdraw_requests
      `);

      activities.push(
        ...depositsResult.rows,
        ...withdrawalsResult.rows
      );

      activities.sort(
        (a, b) =>
          new Date(b.created_at) -
          new Date(a.created_at)
      );

      res.json({
        success: true,
        activity: activities,
      });

    } catch (error) {
      console.error("ADMIN ACTIVITY ERROR:", error);

      res.status(500).json({
        success: false,
        message: "Failed to load admin activity",
      });
    }
  }
);

// ============================================================
// DEPOSIT INFO ENDPOINT
// ============================================================

app.get("/api/wallet/deposit-info", (req, res) => {
  res.json({
    success: true,
    paymentAccounts: {
      EasyPaisa: {
        accountNumber: "03439540534",
        accountName: "RIZWAN ISHAQ"
      },
      JazzCash: {
        accountNumber: "03439540534",
        accountName: "RIZWAN ISHAQ"
      },
      "Bank Account": {
        accountNumber: "03439540534",
        accountName: "RIZWAN ISHAQ"
      }
    }
  });
});

// ============================================================
// NOTIFICATIONS ENDPOINT
// ============================================================

app.get("/api/notifications/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [userId]
    );
    res.json({ success: true, notifications: result.rows || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// USER ACTIVE PLANS COUNT
// ============================================================

app.get("/api/user/active-plans/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pool.query(
      `SELECT 
        COUNT(*)::int as active_count,
        COALESCE(SUM(total_earned), 0) as total_earned
       FROM user_plans 
       WHERE user_id = $1 
       AND status = 'active'`,
      [userId]
    );
    
    res.json({
      success: true,
      activeCount: result.rows[0]?.active_count || 0,
      totalEarned: parseFloat(result.rows[0]?.total_earned || 0)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
app.put("/api/notifications/:userId/read", async (req, res) => {
  try {
    const { userId } = req.params;

    await pool.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1
      `,
      [userId]
    );

    res.json({
      success: true,
      message: "Notifications marked as read",
    });
  } catch (error) {
    console.error("MARK NOTIFICATIONS READ ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read",
    });
  }
});

// ============================================================
// AUTH APIs
// ============================================================

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, referralCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check existing user
    const existingUser = await pool.query(
      `
      SELECT id
      FROM users
      WHERE email = $1
      LIMIT 1
      `,
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // ============================================================
    // REFERRAL CODE CHECK
    // ============================================================

    let referredBy = null;

    if (referralCode && referralCode.trim()) {
      const referralResult = await pool.query(
        `
        SELECT id
        FROM users
        WHERE referral_code = $1
        LIMIT 1
        `,
        [referralCode.trim().toUpperCase()]
      );

      if (referralResult.rows.length > 0) {
        referredBy = referralResult.rows[0].id;
      }
    }

    // ============================================================
    // CREATE USER
    // ============================================================

    const result = await pool.query(
      `
      INSERT INTO users
      (
        name,
        email,
        password_hash,
        email_verified,
        referral_code,
        referred_by
      )
      VALUES
      (
        $1,
        $2,
        $3,
        false,
        'RW' || UPPER(
          SUBSTRING(
            MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT),
            1,
            8
          )
        ),
        $4
      )
      RETURNING
        id,
        name,
        email,
        email_verified,
        created_at
      `,
      [
        name.trim(),
        normalizedEmail,
        passwordHash,
        referredBy,
      ]
    );

      // ============================================================
    // SEND REGISTRATION OTP
    // ============================================================

    try {
      await createAndSendOtp({
        email: normalizedEmail,
        userId: result.rows[0].id,
        purpose: "registration",
      });
    } catch (emailError) {
      console.error("REGISTRATION OTP EMAIL ERROR:", emailError.message);

      return res.status(500).json({
        success: false,
        message: "Account created, but verification email could not be sent. Please try resend OTP.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Registration successful. OTP sent to your email.",
      user: result.rows[0],
    });

  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
});
// ============================================================
// VERIFY REGISTRATION OTP
// ============================================================

app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();

    const otpResult = await pool.query(
      `
      SELECT id, user_id
      FROM email_otps
      WHERE email = $1
        AND code = $2
        AND purpose = 'registration'
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [normalizedEmail, normalizedCode]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    const userId = otpResult.rows[0].user_id;

    await pool.query(
      `
      UPDATE users
      SET email_verified = true
      WHERE id = $1
      `,
      [userId]
    );

    await pool.query(
      `
      DELETE FROM email_otps
      WHERE email = $1
        AND purpose = 'registration'
      `,
      [normalizedEmail]
    );

    return res.json({
      success: true,
      message: "Email verified successfully",
    });

  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error during OTP verification",
    });
  }
});

// ============================================================
// RESEND REGISTRATION OTP
// ============================================================

app.post("/api/auth/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const userResult = await pool.query(
      `
      SELECT id, email_verified
      FROM users
      WHERE email = $1
;2      LIMIT 1
      `,
      [normalizedEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = userResult.rows[0];

    if (user.email_verified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    await createAndSendOtp({
      email: normalizedEmail,
      userId: user.id,
      purpose: "registration",
    });

    return res.json({
      success: true,
      message: "OTP sent successfully to your email.",
    });

  } catch (error) {
    console.error("RESEND OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
    });
  }
});
// ============================================================
// FORGOT PASSWORD - SEND OTP
// ============================================================

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

   if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const userResult = await pool.query(
      `
      SELECT id
      FROM users
      WHERE email = $1
      LIMIT 1
      `,
      [normalizedEmail]
    );

    // Generic response for security
    if (userResult.rows.length === 0) {
      return res.json({
        success: true,
        message: "If this email is registered, a password reset OTP has been sent.",
      });
    }

    await createAndSendOtp({
      email: normalizedEmail,
      userId: userResult.rows[0].id,
      purpose: "password_reset",
    });

    return res.json({
      success: true,
      message: "Password reset OTP sent successfully.",
    });

  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send password reset OTP",
    });
  }
});
// ============================================================
// RESET PASSWORD - VERIFY OTP AND UPDATE PASSWORD
// ============================================================

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, OTP and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();

    const otpResult = await pool.query(
      `
      SELECT id, user_id
      FROM email_otps
      WHERE email = $1
        AND code = $2
        AND purpose = 'password_reset'
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [normalizedEmail, normalizedCode]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    const userId = otpResult.rows[0].user_id;

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await pool.query(
      `
      UPDATE users
      SET password_hash = $1
      WHERE id = $2
      `,
      [passwordHash, userId]
    );

    await pool.query(
      `
      DELETE FROM email_otps
      WHERE email = $1
        AND purpose = 'password_reset'
      `,
      [normalizedEmail]
    );

    return res.json({
      success: true,
      message: "Password reset successfully. You can now login.",
    });

  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while resetting password",
    });
  }
});

// ------------------------------------------------------------
// LOGIN
// ------------------------------------------------------------

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE email = $1
      LIMIT 1
      `,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }
    const paymentAccountsResult = await pool.query(
  `
  SELECT
    method,
    account_name,
    account_number
  FROM payment_accounts
  WHERE user_id = $1
  ORDER BY id ASC
  `,
  [user.id]
);


    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        email_verified: user.email_verified,
        created_at: user.created_at,
        cnic: user.cnic || null,
        phone: user.phone || null,
        is_account_setup: user.is_account_setup || false,
        balance: parseFloat(user.balance || 0),
        total_points: parseInt(user.total_points || 0),
        claimed_points: parseInt(user.claimed_points || 0),
        payment_accounts: paymentAccountsResult.rows,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
});
// ============================================================
// REFERRAL API
// ============================================================

app.get("/api/referral/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const userResult = await pool.query(
      `
      SELECT
        id,
        referral_code
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = userResult.rows[0];

    // Count total users referred by this user
    const referralCountResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total_referrals
      FROM users
      WHERE referred_by = $1
      `,
      [userId]
    );

    // Total referral points earned
    const pointsResult = await pool.query(
      `
      SELECT
        COALESCE(SUM(reward_points), 0) AS total_points
      FROM referral_rewards
      WHERE referrer_id = $1
      `,
      [userId]
    );

    const referralCode = user.referral_code;

    // Change this URL if your frontend production domain is different
    const baseUrl =
      process.env.FRONTEND_URL || "https://your-app-url.com";

    const referralLink =
      `${baseUrl}?ref=${encodeURIComponent(referralCode)}`;

    return res.json({
      success: true,
      referral: {
        code: referralCode,
        link: referralLink,
        totalReferrals:
          referralCountResult.rows[0]?.total_referrals || 0,
        totalReferralPoints: parseInt(
          pointsResult.rows[0]?.total_points || 0
        ),
      },
    });

  } catch (error) {
    console.error("REFERRAL API ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// WALLET APIs
// ============================================================

app.get("/api/wallet/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `
      SELECT balance
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      wallet: {
        balance: parseFloat(result.rows[0].balance || 0),
      },
    });
  } catch (error) {
    console.error("Wallet error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.get("/api/wallet/transactions/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [userId]
    );

    return res.json({
      success: true,
      transactions: result.rows,
    });
  } catch (error) {
    console.error("Transactions error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.post("/api/wallet/deposit", async (req, res) => {
  try {
    const {
      userId,
      method,
      amount,
      payerAccount,
      paymentReference,
      paymentNote,
    } = req.body;

    if (!userId || !amount || !method || !payerAccount) {
      return res.status(400).json({
        success: false,
        message: "User, amount, method and payer account are required",
      });
    }

    const userResult = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await pool.query(
      `
      INSERT INTO payment_requests
      (
        user_id,
        amount,
        payment_method,
        account_number,
        reference_id,
        payment_type,
        status
      )
      VALUES
      ($1, $2, $3, $4, $5, 'deposit', 'pending')
      `,
      [
        userId,
        amount,
        method,
        payerAccount,
        paymentReference || null,
      ]
    );

    return res.json({
      success: true,
      message: "Deposit request submitted for verification",
    });
  } catch (error) {
    console.error("Deposit error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// ACCOUNT SETUP API
// ============================================================
// ============================================================
// ACCOUNT SETUP API
// ============================================================

app.post("/api/user/setup-account", async (req, res) => {
  try {
    const {
      userId,
      name,
      cnic,
      phone,
      paymentMethod,
      password,
    } = req.body;

    if (
      !userId ||
      !name ||
      !cnic ||
      !phone ||
      !paymentMethod ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "All account setup fields are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Withdraw password must be at least 6 characters",
      });
    }

    const allowedMethods = [
      "EasyPaisa",
      "JazzCash",
      "Bank Account",
    ];

    if (!allowedMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    const userResult = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // --------------------------------------------------------
    // UPDATE MAIN USER PROFILE
    // --------------------------------------------------------

    await pool.query(
      `
      UPDATE users
      SET
        name = $1,
        cnic = $2,
        phone = $3,
        withdraw_password_hash = $4,
        is_account_setup = true,
        account_setup_date = COALESCE(account_setup_date, NOW()),
        updated_at = NOW()
      WHERE id = $5
      `,
      [
        name.trim(),
        cnic.trim(),
        phone.trim(),
        passwordHash,
        userId,
      ]
    );

    // --------------------------------------------------------
    // SAVE / UPDATE SELECTED PAYMENT ACCOUNT
    // --------------------------------------------------------

    await pool.query(
      `
      INSERT INTO payment_accounts
      (
        user_id,
        method,
        account_name,
        account_number
      )
      VALUES
      ($1, $2, $3, $4)

      ON CONFLICT (user_id, method)
      DO UPDATE SET
        account_name = EXCLUDED.account_name,
        account_number = EXCLUDED.account_number,
        updated_at = NOW()
      `,
      [
        userId,
        paymentMethod,
        name.trim(),
        phone.trim(),
      ]
    );

    return res.json({
      success: true,
      message: `${paymentMethod} account saved successfully`,
    });

  } catch (error) {
    console.error("Account setup error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// ============================================================
// GET USER PAYMENT ACCOUNTS
// ============================================================

app.get("/api/user/payment-accounts/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `
      SELECT
        id,
        method,
        account_name,
        account_number,
        created_at,
        updated_at
      FROM payment_accounts
      WHERE user_id = $1
      ORDER BY id ASC
      `,
      [userId]
    );

    return res.json({
      success: true,
      accounts: result.rows,
    });

  } catch (error) {
    console.error("Payment accounts error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// ============================================================
// PLANS APIs
// ============================================================

app.get("/api/plans", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM plans
      WHERE is_active = true
      ORDER BY price ASC
      `
    );

    return res.json({
      success: true,
      plans: result.rows,
    });
  } catch (error) {
    console.error("Plans error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.get("/api/user/plans/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `
      SELECT
        up.*,
        p.name AS current_plan_name,
        p.daily_earning AS current_daily_earning
      FROM user_plans up
      LEFT JOIN plans p
        ON up.plan_id = p.id
      WHERE up.user_id = $1
        AND up.status = 'active'
      ORDER BY up.purchase_date DESC
      `,
      [userId]
    );

    return res.json({
      success: true,
      plans: result.rows,
    });
  } catch (error) {
    console.error("User plans error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// PAYMENT APIs
// ============================================================

app.post("/api/payment/request", async (req, res) => {
  try {
    const {
      userId,
      planId,
      paymentMethod,
      accountNumber,
      accountName,
    } = req.body;

    if (
      !userId ||
      !planId ||
      !paymentMethod ||
      !accountNumber ||
      !accountName
    ) {
      return res.status(400).json({
        success: false,
        message: "All payment fields are required",
      });
    }

    const userResult = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const planResult = await pool.query(
      `
      SELECT *
      FROM plans
      WHERE id = $1
        AND is_active = true
      `,
      [planId]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    const plan = planResult.rows[0];

    const referenceId =
      "PAY-" + Date.now() + "-" + userId;

    await pool.query(
      `
      INSERT INTO payment_requests
      (
        user_id,
        plan_id,
        amount,
        payment_method,
        account_number,
        account_name,
        reference_id,
        payment_type,
        status
      )
      VALUES
      ($1, $2, $3, $4, $5, $6, $7, 'plan_purchase', 'pending')
      `,
      [
        userId,
        planId,
        plan.price,
        paymentMethod,
        accountNumber,
        accountName,
        referenceId,
      ]
    );
// User notification
await createNotification(
  userId,
  "Payment Pending ⏳",
  `Your payment of Rs ${plan.price} for ${plan.name} has been submitted and is pending admin verification.`
);

    return res.json({
      success: true,
      message: "Payment request created",
      referenceId,
      amount: plan.price,
      planName: plan.name,
      dailyEarning: plan.daily_earning,
      instructions: {
        method: paymentMethod,
        account: "03439540534",
        name: "Ads Watching",
        reference: referenceId,
      },
    });
  } catch (error) {
    console.error("Payment request error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// ============================================================
// PAYMENT CONFIRMATION WITH SCREENSHOT
// ============================================================

app.post(
  "/api/payment/confirm-with-screenshot",
  upload.single("screenshot"),
  async (req, res) => {
    try {
      const {
        userId,
        planId,
        paymentMethod,
        accountNumber,
        accountName,
      } = req.body;

      // --------------------------------------------------------
      // VALIDATION
      // --------------------------------------------------------

      if (!userId || !planId) {
        return res.status(400).json({
          success: false,
          message: "User ID and Plan ID are required",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Payment screenshot is required",
        });
      }

      if (!accountNumber || !accountName) {
        return res.status(400).json({
          success: false,
          message: "Account number and account name are required",
        });
      }

      // --------------------------------------------------------
      // GET USER
      // --------------------------------------------------------

      const userResult = await pool.query(
        `
        SELECT id, name, email, is_account_setup
        FROM users
        WHERE id = $1
        `,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // --------------------------------------------------------
      // GET PLAN
      // --------------------------------------------------------

      const planResult = await pool.query(
        `
        SELECT *
        FROM plans
        WHERE id = $1
          AND is_active = true
        `,
        [planId]
      );

      if (planResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Plan not found or inactive",
        });
      }

      const plan = planResult.rows[0];

      // --------------------------------------------------------
      // CHECK FOR EXISTING PENDING PAYMENT
      // --------------------------------------------------------

      const existingPayment = await pool.query(
        `
        SELECT id
        FROM payment_requests
        WHERE user_id = $1
          AND plan_id = $2
          AND payment_type = 'plan_purchase'
          AND status = 'pending'
        LIMIT 1
        `,
        [userId, planId]
      );

      if (existingPayment.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "You already have a pending payment request for this plan.",
        });
      }

      // --------------------------------------------------------
      // GENERATE REFERENCE ID
      // --------------------------------------------------------

      const referenceId =
        `PAY-${Date.now()}-${userId}`;

      // --------------------------------------------------------
      // CONVERT SCREENSHOT TO BASE64
      // --------------------------------------------------------

      const screenshotBase64 =
        `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

      // --------------------------------------------------------
      // SAVE PAYMENT REQUEST
      // --------------------------------------------------------

      const result = await pool.query(
        `
        INSERT INTO payment_requests
        (
          user_id,
          plan_id,
          amount,
          payment_method,
          account_number,
          account_name,
          reference_id,
          payment_type,
          status,
          payment_screenshot
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          'plan_purchase',
          'pending',
          $8
        )
        RETURNING id, reference_id, amount, status
        `,
        [
          userId,
          planId,
          plan.price,
          paymentMethod || "EasyPaisa",
          accountNumber,
          accountName,
          referenceId,
          screenshotBase64,
        ]
      );

      // --------------------------------------------------------
      // USER NOTIFICATION
      // --------------------------------------------------------

      await createNotification(
        userId,
        "Payment Pending ⏳",
        `Your payment of Rs ${plan.price} for ${plan.name} has been submitted and is waiting for admin verification.`
      );

      // --------------------------------------------------------
      // SUCCESS
      // --------------------------------------------------------

      return res.json({
        success: true,
        message:
          "Payment submitted successfully. Waiting for admin verification.",
        referenceId,
        paymentId: result.rows[0].id,
        amount: parseFloat(plan.price),
        planName: plan.name,
        status: "pending",
      });

    } catch (error) {
      console.error(
        "CONFIRM PAYMENT WITH SCREENSHOT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: error.message || "Payment submission failed",
      });
    }
  }
);

// ============================================================
// WITHDRAW APIs
// ============================================================
// ============================================================
// WITHDRAW REQUEST API
// ============================================================

app.post("/api/withdraw/request", async (req, res) => {
  try {
    const {
      userId,
      amount,
      method,
      withdrawPassword,
    } = req.body;

    // --------------------------------------------------------
    // BASIC VALIDATION
    // --------------------------------------------------------

    if (!userId || !amount || !method || !withdrawPassword) {
      return res.status(400).json({
        success: false,
        message: "User, amount, method and withdraw password are required",
      });
    }

    const amountValue = parseFloat(amount);

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid withdrawal amount",
      });
    }

    // --------------------------------------------------------
    // GET USER
    // --------------------------------------------------------

    const userResult = await pool.query(
      `
      SELECT
        id,
        balance,
        withdraw_password_hash,
        is_account_setup
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = userResult.rows[0];

    // --------------------------------------------------------
    // ACCOUNT SETUP CHECK
    // --------------------------------------------------------

    if (!user.is_account_setup) {
      return res.status(400).json({
        success: false,
        message: "Please complete account setup first",
      });
    }

    // --------------------------------------------------------
    // WITHDRAW PASSWORD CHECK
    // --------------------------------------------------------

    if (!user.withdraw_password_hash) {
      return res.status(400).json({
        success: false,
        message: "Withdrawal password is not configured",
      });
    }

    const passwordMatch = await bcrypt.compare(
      withdrawPassword,
      user.withdraw_password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid withdrawal password",
      });
    }

    // --------------------------------------------------------
    // BALANCE CHECK
    // --------------------------------------------------------

    const balance = parseFloat(user.balance || 0);

    if (amountValue > balance) {
      return res.status(400).json({
        success: false,
        message: "Insufficient balance",
      });
    }

    // --------------------------------------------------------
    // NORMALIZE METHOD
    // --------------------------------------------------------

    const normalizedMethod = String(method)
      .trim()
      .toLowerCase();

    const methodMap = {
      easypaisa: "EasyPaisa",
      jazzcash: "JazzCash",
      bank: "Bank Account",
      "bank account": "Bank Account",
    };

    const selectedMethod = methodMap[normalizedMethod];

    if (!selectedMethod) {
      return res.status(400).json({
        success: false,
        message: "Invalid withdrawal method",
      });
    }

    // --------------------------------------------------------
    // GET SAVED ACCOUNT FOR THIS METHOD
    // --------------------------------------------------------

    const accountResult = await pool.query(
      `
      SELECT
        account_name,
        account_number
      FROM payment_accounts
      WHERE user_id = $1
        AND method = $2
      LIMIT 1
      `,
      [userId, selectedMethod]
    );

    // --------------------------------------------------------
    // ACCOUNT NOT SAVED
    // --------------------------------------------------------

    if (accountResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No ${selectedMethod} account is saved. Please setup this account first.`,
      });
    }

    const savedAccount = accountResult.rows[0];

    const savedAccountName = savedAccount.account_name;
    const savedAccountNumber = savedAccount.account_number;

    // --------------------------------------------------------
    // CREATE WITHDRAWAL REQUEST
    // --------------------------------------------------------

    await pool.query(
      `
      INSERT INTO withdraw_requests
      (
        user_id,
        amount,
        method,
        account_number,
        account_name,
        status
      )
      VALUES
      ($1, $2, $3, $4, $5, 'pending')
      `,
      [
  userId,
  amountValue,
  selectedMethod,
  savedAccountNumber,
  savedAccountName,
]
    );

    // --------------------------------------------------------
    // WITHDRAWAL PENDING NOTIFICATION
    // --------------------------------------------------------

    await createNotification(
      userId,
      "Withdrawal Pending ⏳",
      `Your withdrawal request of Rs ${amountValue} has been submitted and is pending admin review.`
    );

    // --------------------------------------------------------
    // SUCCESS
    // --------------------------------------------------------

    return res.json({
      success: true,
      message: "Withdrawal request submitted successfully",
    });
  } catch (error) {
    console.error("Withdraw request error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
app.get("/api/withdraw/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM withdraw_requests
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    return res.json({
      success: true,
      requests: result.rows,
    });
  } catch (error) {
    console.error("Withdraw history error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// DAILY EARNINGS APIs
// ============================================================

app.get("/api/user/earnings/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `
      SELECT
        de.*,
        up.plan_name
      FROM daily_earnings de
      LEFT JOIN user_plans up
        ON de.user_plan_id = up.id
      WHERE de.user_id = $1
      ORDER BY de.earning_date DESC
      LIMIT 30
      `,
      [userId]
    );

    return res.json({
      success: true,
      earnings: result.rows,
    });
  } catch (error) {
    console.error("Earnings error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.post("/api/user/claim-earning", async (req, res) => {
  return res.status(410).json({
    success: false,
    message: "Manual earning claims are disabled. Earnings are credited automatically every 24 hours.",
  });
});

// ============================================================
// AUTOMATIC DAILY EARNING WORKER
// ============================================================

async function processDueEarnings() {
  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    const dueResult = await client.query(
      `
      SELECT
        de.*,
        up.plan_name,
        up.status AS plan_status,
        up.end_date
      FROM daily_earnings de
      INNER JOIN user_plans up
        ON de.user_plan_id = up.id
      WHERE de.is_claimed = false
        AND de.due_at IS NOT NULL
        AND de.due_at <= NOW()
        AND up.status = 'active'
      ORDER BY de.due_at ASC
      FOR UPDATE OF de SKIP LOCKED
      LIMIT 100
      `
    );

    for (const earning of dueResult.rows) {
      const amount = parseFloat(earning.amount || 0);

      if (!Number.isFinite(amount) || amount <= 0) {
        continue;
      }

      const claimResult = await client.query(
        `
        UPDATE daily_earnings
        SET
          is_claimed = true,
          claimed_at = NOW()
        WHERE id = $1
          AND is_claimed = false
        RETURNING *
        `,
        [earning.id]
      );

      if (claimResult.rows.length === 0) {
        continue;
      }

      await client.query(
        `
        UPDATE users
        SET
          balance = COALESCE(balance, 0) + $1,
          total_points = COALESCE(total_points, 0) + $2,
          updated_at = NOW()
        WHERE id = $3
        `,
        [
          amount,
          Math.floor(amount),
          earning.user_id,
        ]
      );

      await client.query(
        `
        UPDATE user_plans
        SET
          total_earned = COALESCE(total_earned, 0) + $1,
          days_remaining =
            GREATEST(COALESCE(days_remaining, 0) - 1, 0)
        WHERE id = $2
        `,
        [
          amount,
          earning.user_plan_id,
        ]
      );

      await client.query(
        
        `
        INSERT INTO transactions
        (
          user_id,
          type,
          amount,
          status,
          reference,
          description
        )
        VALUES
        (
          $1,
          'earning',
          $2,
          'completed',
          $3,
          $4
        )
        `,
        [
          earning.user_id,
          amount,
          `EARNING-${earning.id}`,
          "Daily earning credited automatically",
        ]
      );
      await createNotification(
        earning.user_id,
        "Daily Earning Credited 💰",
        `Rs ${amount} has been credited to your wallet as your daily earning${earning.plan_name ? ` from ${earning.plan_name}` : ""}.`,
        client
      );
      const remainingResult = await client.query(
        `
        SELECT COUNT(*)::int AS remaining
        FROM daily_earnings
        WHERE user_plan_id = $1
          AND is_claimed = false
        `,
        [earning.user_plan_id]
      );

      if (remainingResult.rows[0].remaining === 0) {
        await client.query(
          `
          UPDATE user_plans
          SET
            status = 'completed',
            days_remaining = 0
          WHERE id = $1
          `,
          [earning.user_plan_id]
        );
      }
    }

    await client.query("COMMIT");

    if (dueResult.rows.length > 0) {
      console.log(
        `Automatic earning worker processed ${dueResult.rows.length} earning(s).`
      );
    }
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}

    console.error(
      "Automatic earning worker error:",
      error.message
    );
  } finally {
    client.release();
  }
}

setInterval(processDueEarnings, 60 * 1000);
setTimeout(processDueEarnings, 5 * 1000);

// ============================================================
// GET USER POINTS
// ============================================================

app.get("/api/user/points/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `
      SELECT
        balance,
        total_points,
        claimed_points
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = result.rows[0];
const paymentAccountsResult = await pool.query(
  `
  SELECT
    method,
    account_name,
    account_number
  FROM payment_accounts
  WHERE user_id = $1
  ORDER BY id ASC
  `,
  [user.id]
);
    return res.json({
      success: true,
      data: {
        balance: parseFloat(user.balance || 0),
        total_points: parseInt(user.total_points || 0),
        claimed_points: parseInt(user.claimed_points || 0),
      },
    });
  } catch (error) {
    console.error("Points error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================================
// ADMIN APIs
// ============================================================

// ------------------------------------------------------------
// ADMIN LOGIN
// ------------------------------------------------------------

app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const result = await pool.query(
      `SELECT * FROM users WHERE email = $1 AND is_admin = true`,
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    const admin = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, admin.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    const token = jwt.sign(
  {
    adminId: admin.id,
    email: admin.email,
    role: "admin",
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "7d",
  }
);

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        is_admin: admin.is_admin,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
function authenticateAdmin(req, res, next) {
  try {
     console.log("========== ADMIN AUTH ==========");
    console.log("URL:", req.originalUrl);
    console.log("METHOD:", req.method);
    console.log("AUTH HEADER:", req.headers.authorization);
    console.log("================================");
    const authHeader = req.headers.authorization;

    console.log("ADMIN AUTH HEADER EXISTS:", !!authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("ADMIN AUTH ERROR: Missing or invalid Authorization header");

      return res.status(401).json({
        success: false,
        message: "Admin authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    console.log("ADMIN TOKEN EXISTS:", !!token);
    console.log("ADMIN TOKEN LENGTH:", token ? token.length : 0);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    console.log("ADMIN TOKEN VERIFIED:", decoded);

    if (decoded.role !== "admin") {
      console.log("ADMIN AUTH ERROR: Role is not admin");

      return res.status(403).json({
        success: false,
        message: "Admin access denied",
      });
    }

    req.admin = decoded;
    next();

  } catch (error) {
    console.error("ADMIN AUTH ERROR:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired admin token",
    });
  }
}
// ------------------------------------------------------------
// ADMIN DASHBOARD STATS
// ------------------------------------------------------------

app.get("/api/admin/dashboard-stats", authenticateAdmin, async (req, res) => {
  try {
    // Total users
    const totalUsersResult = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM users
    `);

    // Users with an active plan
    const activeUsersResult = await pool.query(`
      SELECT COUNT(DISTINCT user_id)::int AS count
      FROM user_plans
      WHERE status = 'active'
    `);

    // New users today
    const newUsersResult = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM users
      WHERE DATE(created_at) = CURRENT_DATE
    `);

    // Total deposits
    // Use approved/verified payment requests directly
   const totalDepositsResult = await pool.query(`
  SELECT COALESCE(SUM(amount), 0) AS total
  FROM payment_requests
  WHERE payment_type = 'plan_purchase'
    AND status = 'verified'
`);

    // Pending deposits
   const pendingDepositsResult = await pool.query(`
  SELECT COUNT(*)::int AS count
  FROM payment_requests
  WHERE payment_type = 'plan_purchase'
    AND status = 'pending'
`);

    // Approved deposits
   const approvedDepositsResult = await pool.query(`
  SELECT COUNT(*)::int AS count
  FROM payment_requests
  WHERE payment_type = 'plan_purchase'
    AND status = 'verified'
`);

    // Total withdrawals
    const totalWithdrawalsResult = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM withdraw_requests
      WHERE status = 'approved'
    `);

    // Pending withdrawals
    const pendingWithdrawalsResult = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM withdraw_requests
      WHERE status = 'pending'
    `);

    // Platform balance
    const totalBalanceResult = await pool.query(`
      SELECT COALESCE(SUM(balance), 0) AS total
      FROM users
    `);

    // Today's earnings
    const todayEarningsResult = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM transactions
      WHERE type = 'earning'
        AND status = 'completed'
        AND DATE(created_at) = CURRENT_DATE
    `);

    // Total active plans
    const totalPlansResult = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM plans
      WHERE is_active = true
    `);

    // Active user plans
    const activePlansResult = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM user_plans
      WHERE status = 'active'
    `);

    res.json({
      success: true,
      stats: {
        totalUsers:
          parseInt(totalUsersResult.rows[0]?.count) || 0,

        activeUsers:
          parseInt(activeUsersResult.rows[0]?.count) || 0,

        newUsersToday:
          parseInt(newUsersResult.rows[0]?.count) || 0,

        totalDeposits:
          parseFloat(totalDepositsResult.rows[0]?.total) || 0,

        pendingDeposits:
          parseInt(pendingDepositsResult.rows[0]?.count) || 0,

        approvedDeposits:
          parseInt(approvedDepositsResult.rows[0]?.count) || 0,

        totalWithdrawals:
          parseFloat(totalWithdrawalsResult.rows[0]?.total) || 0,

        pendingWithdrawals:
          parseInt(pendingWithdrawalsResult.rows[0]?.count) || 0,

        totalBalance:
          parseFloat(totalBalanceResult.rows[0]?.total) || 0,

        todayEarnings:
          parseFloat(todayEarningsResult.rows[0]?.total) || 0,

        totalPlans:
          parseInt(totalPlansResult.rows[0]?.count) || 0,

        activePlans:
          parseInt(activePlansResult.rows[0]?.count) || 0,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ------------------------------------------------------------
// ADMIN - GET ALL DEPOSITS
// ------------------------------------------------------------

app.get("/api/admin/deposits", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        pr.*,
        u.name as user_name,
        u.email as user_email,
        p.name as plan_name
      FROM payment_requests pr
      LEFT JOIN users u ON pr.user_id = u.id
      LEFT JOIN plans p ON pr.plan_id = p.id
      WHERE pr.payment_type = 'plan_purchase'
      ORDER BY pr.created_at DESC
      `
    );

    res.json({
      success: true,
      deposits: result.rows,
    });
  } catch (error) {
    console.error("Get deposits error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ------------------------------------------------------------
// ADMIN - APPROVE DEPOSIT
// ------------------------------------------------------------

app.post("/api/admin/deposit/approve", async (req, res) => {
  const client = await pool.connect();

  try {
    const { depositId } = req.body;

    if (!depositId) {
      return res.status(400).json({
        success: false,
        message: "Deposit ID is required",
      });
    }

    await client.query("BEGIN");

    const requestResult = await client.query(
      `
      SELECT * FROM payment_requests
      WHERE id = $1 AND status = 'pending' AND payment_type = 'plan_purchase'
      FOR UPDATE
      `,
      [depositId]
    );

    if (requestResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Pending deposit not found",
      });
    }

    const paymentRequest = requestResult.rows[0];

    const planResult = await client.query(
      `SELECT * FROM plans WHERE id = $1 AND is_active = true`,
      [paymentRequest.plan_id]
    );

    if (planResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Plan not found or inactive",
      });
    }

    const plan = planResult.rows[0];
    const durationDays = parseInt(plan.duration_days, 10);

    if (!Number.isInteger(durationDays) || durationDays <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Invalid plan duration",
      });
    }

    const paymentId = `PAYMENT-${depositId}`;

    const userPlanResult = await client.query(
      `
      INSERT INTO user_plans
      (user_id, plan_id, plan_name, price, daily_earning,
       purchase_date, start_date, end_date, days_remaining,
       status, total_earned, payment_id)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW(),
              NOW() + ($6 * INTERVAL '1 day'), $6,
              'active', 0, $7)
      RETURNING *
      `,
      [paymentRequest.user_id, plan.id, plan.name, plan.price,
       plan.daily_earning, durationDays, paymentId]
    );

    const userPlan = userPlanResult.rows[0];

    for (let day = 1; day <= durationDays; day++) {
  await client.query(
    `
    INSERT INTO daily_earnings
    (
      user_id,
      plan_id,
      user_plan_id,
      amount,
      earning_date,
      is_claimed,
      claimed_at,
      due_at
    )
    VALUES
    (
      $1,
      $2,
      $3,
      $4,
      (NOW() + ($5 * INTERVAL '1 day'))::date,
      false,
      NULL,
      NOW() + ($5 * INTERVAL '1 day')
    )
    ON CONFLICT (user_plan_id, earning_date)
DO NOTHING
    `,
    [
      paymentRequest.user_id,
      plan.id,
      userPlan.id,
      plan.daily_earning,
      day,
    ]
  );

    }

    await client.query(
      `
      UPDATE payment_requests
      SET status = 'verified', admin_verified = true,
          verified_at = NOW()
      WHERE id = $1
      `,
      [depositId]
    );
// User notification
await createNotification(
  paymentRequest.user_id,
  "Deposit Approved ✅",
  `Your deposit of Rs ${paymentRequest.amount} has been approved successfully. Your ${plan.name} plan is now active.`,
  client
);
    // ============================================================
// REFERRAL REWARD - 30% OF APPROVED DEPOSIT
// ============================================================

const referralResult = await client.query(
  `
  SELECT referred_by
  FROM users
  WHERE id = $1
  LIMIT 1
  `,
  [paymentRequest.user_id]
);

if (referralResult.rows.length > 0) {
  const referrerId = referralResult.rows[0].referred_by;

  if (referrerId) {
    const depositAmount = parseFloat(paymentRequest.amount);

    if (
      Number.isFinite(depositAmount) &&
      depositAmount > 0
    ) {
      const rewardPoints = Math.floor(
        depositAmount * 0.30
      );

      if (rewardPoints > 0) {

        // Prevent duplicate reward for same deposit
        const rewardCheck = await client.query(
          `
          SELECT id
          FROM referral_rewards
          WHERE deposit_id = $1
          LIMIT 1
          `,
          [depositId]
        );

        if (rewardCheck.rows.length === 0) {

          // Add referral points to referrer
          await client.query(
            `
            UPDATE users
            SET
              total_points =
                COALESCE(total_points, 0) + $1,
              updated_at = NOW()
            WHERE id = $2
            `,
            [
              rewardPoints,
              referrerId,
            ]
          );

          // Record reward
          await client.query(
            `
            INSERT INTO referral_rewards
            (
              referrer_id,
              referred_user_id,
              deposit_id,
              deposit_amount,
              reward_points
            )
            VALUES
            ($1, $2, $3, $4, $5)
            `,
            [
              referrerId,
              paymentRequest.user_id,
              depositId,
              depositAmount,
              rewardPoints,
            ]
          );

          // Notification for referrer
          await client.query(
            `
            INSERT INTO notifications
            (
              user_id,
              title,
              message,
              is_read,
              created_at
            )
            VALUES
            ($1, $2, $3, false, NOW())
            `,
            [
              referrerId,
              "Referral Reward 🎁",
              `You earned ${rewardPoints} referral points because your referred user made a deposit of Rs ${depositAmount}.`,
            ]
          );

          console.log(
            `REFERRAL REWARD: User ${referrerId} earned ${rewardPoints} points from deposit ${depositId}`
          );
        }
      }
    }
  }
}

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Deposit approved! Plan activated.",
      plan,
      userPlan,
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Approve deposit error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
});

// ------------------------------------------------------------
// ADMIN - REJECT DEPOSIT
// ------------------------------------------------------------

app.post("/api/admin/deposit/reject", async (req, res) => {
  try {
    const { depositId, reason } = req.body;

    if (!depositId) {
      return res.status(400).json({
        success: false,
        message: "Deposit ID is required",
      });
    }

   const result = await pool.query(
  `
  UPDATE payment_requests
  SET status = 'rejected'
  WHERE id = $1
    AND status = 'pending'
  RETURNING user_id, amount
  `,
  [depositId]
);

if (result.rows.length === 0) {
  return res.status(404).json({
    success: false,
    message: "Pending deposit not found",
  });
}

const rejectedDeposit = result.rows[0];

await createNotification(
  rejectedDeposit.user_id,
  "Deposit Rejected ❌",
  `Your deposit of Rs ${rejectedDeposit.amount} was rejected.${reason ? ` Reason: ${reason}` : ""}`
);
    res.json({
      success: true,
      message: "Deposit rejected",
      reason: reason || null,
    });
  } catch (error) {
    console.error("Reject deposit error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ------------------------------------------------------------
// ADMIN - GET ALL USERS
// ------------------------------------------------------------

app.get(
  "/api/admin/users",
  authenticateAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT 
          id,
          name,
          email,
          phone,
          cnic,
          balance,
          total_points,
          is_account_setup,
          email_verified,
          created_at,
          updated_at
        FROM users
        ORDER BY created_at DESC
      `);

      res.json({
        success: true,
        users: result.rows,
      });
    } catch (error) {
      console.error("Get users error:", error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ------------------------------------------------------------
// ADMIN - GET ALL WITHDRAWALS
// ------------------------------------------------------------
app.get("/api/admin/withdrawals", authenticateAdmin, async (req, res) => {
    console.log("🔥 WITHDRAWALS ROUTE HIT");
  console.log("🔥 ADMIN:", req.admin);
  try {
    const result = await pool.query(
      `
      SELECT
        wr.*,
        u.name as user_name,
        u.email as user_email,
        u.balance as user_balance
      FROM withdraw_requests wr
      LEFT JOIN users u ON wr.user_id = u.id
      WHERE wr.status = 'pending'
      ORDER BY wr.created_at DESC
      `
    );

    res.json({
      success: true,
      withdrawals: result.rows,
    });
  } catch (error) {
    console.error("Get withdrawals error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ------------------------------------------------------------
// ADMIN - APPROVE WITHDRAWAL
// ------------------------------------------------------------

app.post(
  "/api/admin/withdraw/approve",
  authenticateAdmin,
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { withdrawId } = req.body;

      if (!withdrawId) {
        return res.status(400).json({
          success: false,
          message: "Withdrawal ID is required",
        });
      }

      await client.query("BEGIN");

      // Get pending withdrawal + lock row
      const withdrawResult = await client.query(
        `
        SELECT *
        FROM withdraw_requests
        WHERE id = $1
          AND status = 'pending'
        FOR UPDATE
        `,
        [withdrawId]
      );

      if (withdrawResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "Pending withdrawal not found",
        });
      }

      const withdrawal = withdrawResult.rows[0];

      const amount = parseFloat(withdrawal.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "Invalid withdrawal amount",
        });
      }

      // Lock and get user
      const userResult = await client.query(
        `
        SELECT id, balance
        FROM users
        WHERE id = $1
        FOR UPDATE
        `,
        [withdrawal.user_id]
      );

      if (userResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const user = userResult.rows[0];
      const balance = parseFloat(user.balance || 0);

      // Check balance again before approval
      if (amount > balance) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          success: false,
          message: "User has insufficient balance",
        });
      }

      // Deduct balance
      await client.query(
        `
        UPDATE users
        SET
          balance = COALESCE(balance, 0) - $1,
          updated_at = NOW()
        WHERE id = $2
        `,
        [amount, withdrawal.user_id]
      );

      // Mark withdrawal approved
      const updateResult = await client.query(
        `
        UPDATE withdraw_requests
SET
  status = 'approved',
  approved_at = NOW()
WHERE id = $1
RETURNING *
        `,
        [withdrawId]
      );

      // Add transaction
      await client.query(
        `
        INSERT INTO transactions
        (
          user_id,
          type,
          amount,
          status,
          reference,
          description
        )
        VALUES
        (
          $1,
          'withdrawal',
          $2,
          'completed',
          $3,
          $4
        )
        `,
        [
          withdrawal.user_id,
          amount,
          `WITHDRAW-${withdrawId}`,
          `Withdrawal approved via ${withdrawal.method}`,
        ]
      );

      // User notification
      await client.query(
        `
        INSERT INTO notifications
        (
          user_id,
          title,
          message,
          is_read,
          created_at
        )
        VALUES
        ($1, $2, $3, false, NOW())
        `,
        [
          withdrawal.user_id,
          "Withdrawal Approved",
          `Your withdrawal of Rs ${amount} has been approved successfully.`,
        ]
      );

      await client.query("COMMIT");

      return res.json({
        success: true,
        message: "Withdrawal approved successfully.",
        withdrawal: updateResult.rows[0],
      });

    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (_) {}

      console.error("APPROVE WITHDRAWAL ERROR:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    } finally {
      client.release();
    }
  }
);


// ------------------------------------------------------------
// ADMIN - REJECT WITHDRAWAL
// ------------------------------------------------------------

app.post(
  "/api/admin/withdraw/reject",
  authenticateAdmin,
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { withdrawId, reason } = req.body;

      if (!withdrawId) {
        return res.status(400).json({
          success: false,
          message: "Withdrawal ID is required",
        });
      }

      await client.query("BEGIN");

      // Get pending withdrawal
      const withdrawResult = await client.query(
        `
        SELECT *
        FROM withdraw_requests
        WHERE id = $1
          AND status = 'pending'
        FOR UPDATE
        `,
        [withdrawId]
      );

      if (withdrawResult.rows.length === 0) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          success: false,
          message: "Pending withdrawal not found",
        });
      }

      const withdrawal = withdrawResult.rows[0];

      const rejectionReason =
        reason && reason.trim()
          ? reason.trim()
          : "Withdrawal rejected by admin";

      // Mark withdrawal rejected
      const updateResult = await client.query(
        `
       UPDATE withdraw_requests
SET
  status = 'rejected'
WHERE id = $1
RETURNING *
        `,
        [withdrawId]
      );

      // Notification to user
      await client.query(
        `
        INSERT INTO notifications
        (
          user_id,
          title,
          message,
          is_read,
          created_at
        )
        VALUES
        ($1, $2, $3, false, NOW())
        `,
        [
          withdrawal.user_id,
          "Withdrawal Rejected",
          `Your withdrawal of Rs ${withdrawal.amount} was rejected. Reason: ${rejectionReason}`,
        ]
      );
// User notification
await createNotification(
  userId,
  "Withdrawal Pending ⏳",
  `Your withdrawal request of Rs ${amountValue} has been submitted and is pending admin review.`
);

      await client.query("COMMIT");

      return res.json({
        success: true,
        message: "Withdrawal rejected successfully.",
        reason: rejectionReason,
        withdrawal: updateResult.rows[0],
      });

    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (_) {}

      console.error("REJECT WITHDRAWAL ERROR:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    } finally {
      client.release();
    }
  }
);

// ------------------------------------------------------------
// ADMIN - GET ALL TRANSACTIONS
// ------------------------------------------------------------

app.get("/api/admin/transactions", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        t.*,
        u.name as user_name,
        u.email as user_email
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 100
      `
    );

    res.json({
      success: true,
      transactions: result.rows,
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ------------------------------------------------------------
// ADMIN - GET ALL PLANS
// ------------------------------------------------------------

app.get("/api/admin/plans", authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT * FROM plans ORDER BY price ASC
      `
    );

    res.json({
      success: true,
      plans: result.rows,
    });
  } catch (error) {
    console.error("Get plans error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ------------------------------------------------------------
// ADMIN - CREATE PLAN
// ------------------------------------------------------------

app.post("/api/admin/plans/create", authenticateAdmin, async (req, res) => {
  try {
    const { name, price, daily_earning, duration_days, total_earning } = req.body;

    if (!name || !price || !daily_earning || !duration_days) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO plans (name, price, daily_earning, duration_days, total_earning)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [name, price, daily_earning, duration_days, total_earning || daily_earning * duration_days]
    );

    res.json({
      success: true,
      message: "Plan created successfully",
      plan: result.rows[0],
    });
  } catch (error) {
    console.error("Create plan error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ------------------------------------------------------------
// ADMIN - UPDATE PLAN
// ------------------------------------------------------------

app.put("/api/admin/plans/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, daily_earning, duration_days, total_earning, is_active } = req.body;

    const result = await pool.query(
      `
      UPDATE plans 
      SET 
        name = COALESCE($1, name),
        price = COALESCE($2, price),
        daily_earning = COALESCE($3, daily_earning),
        duration_days = COALESCE($4, duration_days),
        total_earning = COALESCE($5, total_earning),
        is_active = COALESCE($6, is_active)
      WHERE id = $7
      RETURNING *
      `,
      [name, price, daily_earning, duration_days, total_earning, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    res.json({
      success: true,
      message: "Plan updated successfully",
      plan: result.rows[0],
    });
  } catch (error) {
    console.error("Update plan error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ------------------------------------------------------------
// ADMIN - DELETE PLAN
// ------------------------------------------------------------
// ------------------------------------------------------------
// ADMIN - DELETE / DEACTIVATE PLAN
// ------------------------------------------------------------

app.delete("/api/admin/plans/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if plan is referenced by users or payment requests
    const references = await pool.query(
      `
      SELECT
        (SELECT COUNT(*) FROM user_plans WHERE plan_id = $1) AS user_plan_count,
        (SELECT COUNT(*) FROM payment_requests WHERE plan_id = $1) AS payment_count
      `,
      [id]
    );

    const userPlanCount = Number(references.rows[0].user_plan_count);
    const paymentCount = Number(references.rows[0].payment_count);

    // If plan is already referenced, deactivate it instead of deleting
    if (userPlanCount > 0 || paymentCount > 0) {
      const result = await pool.query(
        `
        UPDATE plans
        SET is_active = false
        WHERE id = $1
        RETURNING *
        `,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Plan not found",
        });
      }

      return res.json({
        success: true,
        deleted: false,
        deactivated: true,
        message: "Plan is already in use, so it has been deactivated instead of deleted.",
        plan: result.rows[0],
      });
    }

    // Only completely unused plans can actually be deleted
    const result = await pool.query(
      `
      DELETE FROM plans
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    return res.json({
      success: true,
      deleted: true,
      deactivated: false,
      message: "Plan deleted successfully",
    });

  } catch (error) {
    console.error("Delete plan error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
app.post("/api/admin/plans/toggle", authenticateAdmin, async (req, res) => {
  try {
    const { planId, active } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "Plan ID is required",
      });
    }

    const result = await pool.query(
      `
      UPDATE plans
      SET is_active = $1
      WHERE id = $2
      RETURNING *
      `,
      [Boolean(active), planId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    res.json({
      success: true,
      message: active
        ? "Plan activated successfully"
        : "Plan deactivated successfully",
      plan: result.rows[0],
    });
  } catch (error) {
    console.error("Toggle plan error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Ads Watching server running on http://0.0.0.0:${PORT}`);
  console.log(`Admin login: http://localhost:${PORT}/admin`);
});

