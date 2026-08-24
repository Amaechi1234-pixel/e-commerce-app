const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  resetToken: String,
  resetTokenExpiration: Date,
  cart: {
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
      },
    ],
  },
});

userSchema.methods.addToCart = function (product) {
  const cartProductIndex = this.cart.items.findIndex((cp) => {
    return cp.productId.toString() === product._id.toString();
  });

  let newQuantity = 1;
  const updatedCartItems = [...this.cart.items];

  if (cartProductIndex >= 0) {
    newQuantity = this.cart.items[cartProductIndex].quantity + 1;
    updatedCartItems[cartProductIndex].quantity = newQuantity;
  } else {
    updatedCartItems.push({
      productId: product._id,
      quantity: newQuantity,
    });
  }

  this.cart.items = updatedCartItems;
  return this.save();
};

userSchema.methods.getCart = function () {
  return Promise.resolve(this);
};

userSchema.methods.getProducts = function () {
  const Product = mongoose.model("Product");
  const productIds = this.cart.items.map((item) => item.productId);

  if (productIds.length === 0) {
    return Promise.resolve([]);
  }

  return Product.find({ _id: { $in: productIds } }).then((products) => {
    return products.map((product) => {
      const cartItem = this.cart.items.find((item) => {
        return item.productId.toString() === product._id.toString();
      });
      return {
        ...product.toObject(),
        quantity: cartItem ? cartItem.quantity : 1,
      };
    });
  });
};

userSchema.methods.deleteItemFromCart = function (productId) {
  const updatedCartItems = this.cart.items.filter((item) => {
    return item.productId.toString() !== productId.toString();
  });

  this.cart.items = updatedCartItems;
  return this.save();
};

userSchema.methods.createOrder = function () {
  const Order = mongoose.model("Order");
  return this.getProducts()
    .then((products) => {
      const order = new Order({
        products: products.map((p) => ({
          product: { ...p }, 
          quantity: p.quantity,
        })),
        // Fix: Nest the user data to match your Order schema
        user: {
          userId: this._id,
          email: this.email // Make sure 'email' exists on your User model
        }
      });
      return order.save();
    })
    .then((result) => {
      this.cart.items = [];
      return this.save();
    });
};



userSchema.methods.getOrders = function () {
  const Order = mongoose.model("Order");
  return Order.find({ "user.userId": this._id });
};



userSchema.statics.findOrCreateDefault = function () {
  return this.findOne({}).then((user) => {
    if (user) {
      return user;
    } else {
      // Create a default user
      const defaultUser = new this({
        name: "Default User",
        email: "default@example.com",
        cart: { items: [] },
      });
      return defaultUser.save();
    }
  });
};

module.exports = mongoose.model("User", userSchema);
