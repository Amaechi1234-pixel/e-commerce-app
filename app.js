const path = require("path");
const fs = require("fs");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const mongoDbStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
require("dotenv").config();
const helmet = require("helmet");
const multer = require("./middleware/multer-config");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");

const User = require("./models/user");

const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");

const errorController = require("./controllers/404");

const MONGODB_URI = process.env.MONGODB_URI;
const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const imagesDir = path.join(__dirname, "images");
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}

const store = new mongoDbStore({
  uri: MONGODB_URI,
  collection: "sessions",
});

const csrfProtection = csrf();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer.single("image")); 
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(imagesDir));
app.use(hpp());

const accessLogStream = fs.createWriteStream(path.join(__dirname, "access.log"), { flags: "a" });
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    },
  },
})
);

app.use(morgan("combined", { stream: accessLogStream }));
  
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24
    },
    store: store,
  }),
);
app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn || false;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user)
    .then((user) => {
      if (!user) return next();
      req.user = user;
      next();
    })
    .catch((err) => {
      console.log("Error fetching user from session:", err);
      next();
    });
});

app.use("/admin", adminRoutes);
app.use(authRoutes);
app.use(shopRoutes);

app.use(errorController.get404);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.statusCode || 500).render("500", {
    pageTitle: "Error!",
    path: "/500",
    errorMessage: error.message || "Internal Server Error",
    isAuthenticated: req.session?.isLoggedIn || false,
    csrfToken: req.csrfToken ? req.csrfToken() : "",
  });
});

module.exports = app;