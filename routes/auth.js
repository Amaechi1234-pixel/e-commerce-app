const express = require("express");

const { check, body} = require('express-validator'); 

const authController = require("../controllers/auth");

const router = express.Router();

router.get("/login", authController.getLogin);

router.post(
    "/login",
    [
        check("email")
            .isEmail()
            .withMessage("Please enter a valid email.")
        .normalizeEmail(),
        check("password", "Password has to be valid.")
            .isLength({min: 6})
            .isAlphanumeric()
            .trim()
    ],
    authController.postLogin
);

router.post("/logout", authController.postLogout);

router.get("/signup", authController.getSignup);

const User = require("../models/user");

router.post("/signup", [
    check("email")
        .isEmail()
        .withMessage("Please enter a valid email.")

        .custom((value, {req}) => {
            return User.findOne({email: value}).then(user => {
                if (user) {
                    return Promise.reject("Email address already exists!");
                }
            });
        })
    .normalizeEmail(),
    check("password", "Please enter a password with only numbers and text and at least 6 characters.")
        .isLength({min: 6})
        .isAlphanumeric()
        .trim(),
    check("confirmPassword")
        .trim() 
        .custom((value, {req}) => {
            if (value !== req.body.password) {
                throw new Error("Passwords have to match!");
            }
            return true;
        })
        .trim()
], authController.postSignup);


router.get("/reset", authController.getReset);

router.post("/reset", authController.postReset);

router.get("/reset/:token", authController.getNewPassword);

router.post("/new-password", authController.postNewPassword);



module.exports = router;
