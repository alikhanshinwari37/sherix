require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = process.env.PORT || 5000;

// Validate essential configuration
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("A strong JWT_SECRET is required in .env");
}

if (!process.env.FRONTEND_URL) {
  throw new Error("FRONTEND_URL is missing from .env");
}

// Allowed frontend origins
const allowedOrigins = process.env.FRONTEND_URL
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

// Trust hosting proxy
app.set("trust proxy", 1);

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true
}));

// Request parsing
app.use(express.json({ limit: "1mb" }));

app.use(express.urlencoded({
  extended: true,
  limit: "1mb"
}));

// Cookie support
app.use(cookieParser());

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false
});

app.use("/api", apiLimiter);

// Separate login rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later."
  }
});

// Root route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SHERIX API is running."
  });
});

// Backend health
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "SHERIX Backend",
    status: "online"
  });
});

// Neon database health
app.get("/api/health/database", async (req, res) => {
  try {
    const {
      testDatabaseConnection
    } = require("./config/database");

    const database = await testDatabaseConnection();

    res.json({
      success: true,
      database: "connected",
      time: database.database_time
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);

    res.status(503).json({
      success: false,
      database: "unavailable",
      message: "Database connection could not be verified."
    });
  }
});

// Authentication routes
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orders"); // NEW - WhatsApp Orders

// Apply stricter rate limiting to login
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes); // NEW - WhatsApp Orders

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Requested API route was not found."
  });
});

// Central error handler
app.use((err, req, res, next) => {
  if (err.message === "Origin not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "Request origin is not allowed."
    });
  }

  console.error("Server error:", err.message);

  res.status(500).json({
    success: false,
    message: "An internal server error occurred."
  });
});

// Start server
app.listen(PORT, () => {
  console.log("----------------------------------");
  console.log("       SHERIX BACKEND");
  console.log("----------------------------------");
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log("Status: ONLINE");
  console.log("----------------------------------");
});