const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const Product = require("../models/product");
const Order = require("../models/order");
const paystack = require('paystack')(process.env.PAYSTACK_SECRET_KEY);
const ITEMS_PER_PAGE = 2;

exports.getProducts = (req, res, next) => {
  const page = req.query.page;
  let totalItems;

  Product.find()
    .countDocuments()
    .then(numProducts => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE);
    })
      .then((products) => {
      res.render("shop/product-list", {
        prods: products,
        pageTitle: "products",
        path: "/products",
        totalProducts: totalItems,
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPrevPage: page > 1,
        nextPage: parseInt(page) + 1,
        prevPage: parseInt(page) - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
        totalPages: Math.ceil(totalItems / ITEMS_PER_PAGE),
        isAuthenticated: req.session.isLoggedIn,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.status(404).render("404", {
          pageTitle: "Product Not Found",
          path: "/404",
        });
      }
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
        isAuthenticated: req.session.isLoggedIn,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  const page = req.query.page;
  let totalItems;

  Product.find()
    .countDocuments()
    .then(numProducts => {
      totalItems = numProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE);
    })
      .then((products) => {
      res.render("shop/index", {
        prods: products,
        pageTitle: "Shop",
        path: "/",
        totalProducts: totalItems,
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPrevPage: page > 1,
        nextPage: parseInt(page) + 1,
        prevPage: parseInt(page) - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
        totalPages: Math.ceil(totalItems / ITEMS_PER_PAGE),
        isAuthenticated: req.session.isLoggedIn,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .then((user) => {
      const products = user.cart.items.filter(p => p.productId !== null); // filter out deleted products  
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your cart",
        products: products,
        isAuthenticated: req.session.isLoggedIn,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId ? req.body.productId.trim() : "";

  if (!prodId) {
    console.log("Error: Invalid product ID");
    return res.redirect("/");
  }

  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .deleteItemFromCart(prodId)
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
    let products; //  declare outside so both .then() blocks can access it
  let total = 0;

  req.user
    .populate("cart.items.productId")
    .then((user) => {
      products = user.cart.items.filter(p => p.productId !== null);

      products.forEach(p => {
        total += p.quantity * p.productId.price;
      });
          
      res.render("shop/checkout", {
        path: "/checkout",
        pageTitle: "Checkout",
        products: products,   //  now accessible
        totalSum: total,      //  use the total we calculated
        paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY,
        userEmail: req.user.email,
        isAuthenticated: req.session.isLoggedIn,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckoutSuccess = (req, res, next) => {
  const reference = req.query.reference;

  paystack.transaction.verify(reference)
  .then((response) => {
    if (response.data.status === 'success') {
      return req.user.createOrder();
    } else {
      throw new Error('Payment verification failed');
    }
  })
  .then(() => {
    res.redirect('/orders');
  })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckoutCancel = (req, res, next) => {
  res.redirect('/checkout');
};




exports.postOrder = (req, res, next) => {
  req.user
    .createOrder()
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  req.user
    .getOrders()
    .then((orders) => {
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your orders",
        orders: orders,
        isAuthenticated: req.session.isLoggedIn,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;

  // ✅ Verify the order belongs to the logged-in user
  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        return next(new Error("No order found."));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error("Unauthorized access."));
      }

      const invoiceName = "invoice-" + orderId + ".pdf";
      const invoicePath = path.join(
        __dirname,
        "..",
        "data",
        "invoices",
        invoiceName
      );

      // ✅ Generate PDF dynamically
      const pdfDoc = new PDFDocument();

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="' + invoiceName + '"'
      );

      pdfDoc.pipe(fs.createWriteStream(invoicePath)); // save to disk
      pdfDoc.pipe(res);                               // stream to browser

      // --- PDF Content ---
      pdfDoc.fontSize(26).text("Invoice", { underline: true });
      pdfDoc.moveDown();
      pdfDoc.fontSize(14).text(`Order ID: ${orderId}`);
      pdfDoc.moveDown();
      pdfDoc.text("-----------------------------------");

      let totalPrice = 0;
      order.products.forEach((prod) => {
        totalPrice += prod.quantity * prod.product.price;
        pdfDoc
          .fontSize(14)
          .text(
            `${prod.product.title} — ${prod.quantity} x $${prod.product.price}`
          );
      });

      pdfDoc.moveDown();
      pdfDoc.text("-----------------------------------");
      pdfDoc.fontSize(16).text(`Total: $${totalPrice.toFixed(2)}`);

      pdfDoc.end(); // ✅ must call this to finish
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};