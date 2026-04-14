/**
 * DigitalCAD Training - Express Server
 */
require("dotenv").config();
console.log("JWT_SECRET loaded:", !!process.env.JWT_SECRET);

const express     = require("express");
const cors        = require("cors");
const helmet      = require("helmet");
const morgan      = require("morgan");
const compression = require("compression");
const cookieParser= require("cookie-parser");
const rateLimit   = require("express-rate-limit");
const path        = require("path");

const routes       = require("./src/routes/index");
const errorHandler = require("./src/middleware/errorHandler");
const { prisma }   = require("./src/config/db");

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)        || 200,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use(generalLimiter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(compression());

if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// ── SERVE UPLOADED FILES (assignments, query media) ───────
// This is the fix for "clicking file links redirects to homepage"
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/health", (req, res) => {
  res.json({ success: true, message: "DCT API is running", timestamp: new Date() });
});

app.use("/api/v1", routes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

async function startServer() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected");

    const server = app.listen(PORT, () => {
      console.log(`🚀 DCT Server running on http://localhost:${PORT}`);
      console.log(`📋 API: http://localhost:${PORT}/api/v1`);
      console.log(`🌍 Env: ${process.env.NODE_ENV}`);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`\n❌ Port ${PORT} is already in use.`);
        console.error(`   Windows fix: netstat -ano | findstr :${PORT}  then  taskkill /PID <pid> /F`);
        console.error(`   Mac/Linux:   lsof -ti:${PORT} | xargs kill -9\n`);
        process.exit(1);
      } else throw err;
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
