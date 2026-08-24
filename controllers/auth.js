const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const User = require("../models/user");
require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.getLogin = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: message,
    oldInput: { email: "", password: "" },
    validationErrors: [],
    isAuthenticated: req.session.isLoggedIn || false,
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      oldInput: { email, password },
      validationErrors: errors.array(),
      isAuthenticated: false,
    });
  }

  User.findOne({ email })
    .then((user) => {
      if (!user) {
        return res.status(422).render("auth/login", {
          path: "/login",
          pageTitle: "Login",
          errorMessage: "Invalid email or password.",
          oldInput: { email, password },
          validationErrors: [],
          isAuthenticated: false,
        });
      }
      return bcrypt.compare(password, user.password).then((doMatch) => {
        if (doMatch) {
          req.session.isLoggedIn = true;
          req.session.user = user._id.toString();
          return req.session.save(() => res.redirect("/"));
        }
        return res.status(422).render("auth/login", {
          path: "/login",
          pageTitle: "Login",
          errorMessage: "Invalid email or password.",
          oldInput: { email, password },
          validationErrors: [],
          isAuthenticated: false,
        });
      });
    })
    .catch((err) => next(new Error(err)));  
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      return next(new Error(err));  
    }
    res.redirect('/');
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Sign Up",
    errorMessage: message,
    oldInput: { email: "", password: "", confirmPassword: "" },
    validationErrors: [],
    isAuthenticated: req.session.isLoggedIn || false,
  });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Sign Up",
      errorMessage: errors.array()[0].msg,
      oldInput: { email, password, confirmPassword: req.body.confirmPassword },
      validationErrors: errors.array(),
      isAuthenticated: req.session.isLoggedIn || false,
    });
  }

  bcrypt.hash(password, 12)
    .then((hashedPassword) => {
      const user = new User({
        email,
        password: hashedPassword,
        cart: { items: [] },
      });
      return user.save();
    })
    .then((result) => {
      res.redirect("/login");
      return resend.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: 'Signup Succeeded!',
        html: '<h1>You successfully signed up!</h1><p>Welcome to our shop.</p>'
      });
    })
    .then((emailResult) => {
      if (emailResult) console.log("Email sent successfully:", emailResult);
    })
    .catch((err) => next(new Error(err)));  
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: message,
    isAuthenticated: req.session.isLoggedIn || false,
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      return next(new Error(err));  
    }

    const token = buffer.toString("hex");

    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No account with that email found.");
          return res.redirect("/reset");
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then((result) => {
        if (!result) return null;
        res.redirect("/");
        return resend.emails.send({
          from: 'onboarding@resend.dev',
          to: req.body.email,
          subject: 'Password reset',
          html: `<p>You requested a password reset.</p>
                 <p>Click this <a href="http://localhost:3001/reset/${token}">link</a> to set a new password.</p>`
        });
      })
      .then((emailResult) => {
        if (emailResult) console.log("Password reset email sent:", emailResult);
      })
      .catch((err) => next(new Error(err))); 
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then((user) => {
      if (!user) {
        req.flash("error", "Invalid or expired token.");
        return res.redirect("/reset");
      }
      res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "New Password",
        errorMessage: null,
        isAuthenticated: req.session.isLoggedIn || false,
        userId: user._id.toString(),
        passwordToken: token
      });
    })
    .catch((err) => next(new Error(err))); 
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;

  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId
  })
    .then((user) => {
      if (!user) {
        req.flash("error", "Invalid or expired token.");
        return res.redirect("/reset");
      }
      return bcrypt.hash(newPassword, 12)
        .then((hashedPassword) => {
          user.password = hashedPassword;
          user.resetToken = undefined;
          user.resetTokenExpiration = undefined;
          return user.save();
        })
        .then(() => res.redirect("/login"))
        .catch((err) => next(new Error(err)));
    })
    .catch((err) => next(new Error(err)))
};  