const mongoose = require("mongoose");
const Product = require("../models/product");
const { validationResult } = require("express-validator");

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const price = req.body.price;
  const description = req.body.description;
  const imageFile = req.file;

  let imageUrl = null;
  if (imageFile) {
    imageUrl = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString("base64")}`;
  }

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
  const updatedDesc = req.body.description;
  const imageFile = req.file;

  let image = req.body.image; 
  if (imageFile) {
    image = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString("base64")}`;
  }

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
      if (imageFile) {
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
        res.status(404).json({ message: "Product not found" });
        return null;
      }
      if (product.userId.toString() !== req.user._id.toString()) {
        res.status(403).json({ message: "Unauthorized: You do not own this product." });
        return null;
      }
      return Product.deleteOne({ _id: prodId, userId: req.user._id });
    })
    .then((result) => {
      if (result === null) {
        return;
      }
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Product could not be deleted." });
      }
      return res.status(200).json({ message: "Product deleted successfully!", productId: prodId });
    })
    .catch((err) => next(new Error(err)));
};