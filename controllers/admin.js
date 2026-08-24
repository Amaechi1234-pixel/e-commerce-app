const mongoose = require("mongoose");
const fileHelper = require("../util/file");
const Product = require("../models/product");
const { validationResult } = require("express-validator");

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const imageUrl = req.file ? req.file.path : null;
  const price = req.body.price;
  const description = req.body.description;
  console.log(imageUrl);
  const error = validationResult(req);

  if (!error.isEmpty() || !imageUrl) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/edit-product",
      editing: false,
      hasError: true,
      product: { title, imageUrl, price, description },
      isAuthenticated: req.session?.isLoggedIn || false,
      errorMessage: !imageUrl ? "Please upload an image." : error.array()[0].msg,
      validationErrors: error.array(),
    });
  }

  const product = new Product({
    _id: new mongoose.Types.ObjectId(),
    title,
    price,
    description,
    imageUrl,
    userId: req.user._id,
  });

  product
    .save()
    .then(() => {
      console.log("Created Product");
      res.redirect("/admin/products");
    })
    .catch((err) => next(new Error(err)));  
};

exports.getAddProduct = (req, res, next) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: [],
    product: { title: "", imageUrl: "", price: "", description: "" },
    isAuthenticated: req.session?.isLoggedIn || false,
  });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/");
  }

  const prodId = req.params.productId;
  if (!prodId) {
    return res.redirect("/admin/products");
  }

  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect("/");
      }
      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        hasError: false,
        errorMessage: null,
        validationErrors: [],
        product: product,
        isAuthenticated: req.session?.isLoggedIn || false,
      });
    })
    .catch((err) => next(new Error(err)));  
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  if (!prodId) {
    return res.redirect("/admin/products");
  }

  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file ? req.file.path : req.body.image;
  const updatedDesc = req.body.description;

  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Edit Product",
      path: "/admin/edit-product",
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        imageUrl: image,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId,
      },
      isAuthenticated: req.session?.isLoggedIn || false,
      errorMessage: error.array()[0].msg,
      validationErrors: error.array(),
    });
  }

  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect("/admin/products");
      }
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect("/");
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if (image) {
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = image;
      }
      return product.save().then(() => {
        console.log("UPDATED PRODUCT!");
        res.redirect("/admin/products");
      });
    })
    .catch((err) => next(new Error(err)));  
};

exports.getProducts = (req, res, next) => {
  Product.find({ userId: req.user._id })
    .then((products) => {
      res.render("admin/products", {
        prods: products,
        pageTitle: "Admin Products",
        path: "/admin/products",
        isAuthenticated: req.session.isLoggedIn,
      });
    })
    .catch((err) => next(new Error(err)));
};

exports.postDeleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
 
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Unauthorized: You do not own this product." });
      }
      fileHelper.deleteFile(product.imageUrl);
      return Product.deleteOne({ _id: prodId, userId: req.user._id });
    })
    .then((result) => {
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Product could not be deleted." });
      }
      return res.status(200).json({ message: "Product deleted successfully!", productId: prodId });
    })
    .catch((err) => next(new Error(err)));
};