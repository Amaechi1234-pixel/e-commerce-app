const express = require("express");

const { check, body } = require('express-validator');

const adminController = require("../controllers/admin");

const isAuth = require("../middleware/is-auth");

const router = express.Router()

router.get("/add-product", [
    check("title")
        .isString()
        .isLength({ min: 3 })
        .trim(),
    check("price").isFloat(),
    check("description")
        .isLength({ min: 5, max: 400 })
        .trim()
],
    isAuth, adminController.getAddProduct);

router.get("/products", isAuth, adminController.getProducts);

router.post("/add-product", [
    body("title")
        .isString()
        .isLength({ min: 3 })
        .trim(),
    body("price")
        .isFloat(),
    body("description")
        .isLength({ min: 5, max: 400 })
        .trim()
],
    isAuth, adminController.postAddProduct);

router.get("/edit-product/:productId", isAuth, adminController.getEditProduct);

router.post("/edit-product", [
    check("title")
        .isString()
        .isLength({ min: 3 })
        .trim(),
    check("price")
        .isFloat(),
    check("description")
        .isLength({ min: 5, max: 400 })
        .trim()
], isAuth, adminController.postEditProduct);

router.post("/delete-product/:productId", isAuth, adminController.postDeleteProduct);

module.exports = router;
