const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");
const requireAuth = require("../middleware/auth");

const router = express.Router();

const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

function verifyRequestOrigin(req, res, next) {
  const origin = req.get("Origin");

  if (!origin || !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      success: false,
      message: "Request origin is not allowed."
    });
  }

  next();
}

function cookieOptions() {
  const sameSite = process.env.COOKIE_SAME_SITE || "lax";

  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite,
    maxAge: 2 * 60 * 60 * 1000,
    path: "/"
  };
}

// SELLER LOGIN
router.post("/login", verifyRequestOrigin, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password ||
      email.length > 255 ||
      password.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid email and password are required."
      });
    }

    const result = await pool.query(
      `SELECT id, full_name, email, password_hash, is_active
       FROM admin_users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email.trim()]
    );

    const admin = result.rows[0];

    if (!admin || !admin.is_active) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      admin.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "2h",
        issuer: "sherix",
        audience: "sherix-seller"
      }
    );

    res.cookie("sherix_token", token, cookieOptions());

    return res.json({
      success: true,
      message: "Login successful.",
      admin: {
        id: admin.id,
        name: admin.full_name,
        email: admin.email
      }
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Login could not be completed."
    });
  }
});

// CHECK CURRENT SELLER SESSION
router.get("/me", requireAuth, (req, res) => {
  return res.json({
    success: true,
    authenticated: true,
    admin: req.admin
  });
});

// SELLER LOGOUT
router.post("/logout", verifyRequestOrigin, (req, res) => {
  res.clearCookie("sherix_token", {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
    path: "/"
  });

  return res.json({
    success: true,
    message: "Logout successful."
  });
});

module.exports = router;