const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const productSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

productSchema.statics.fetchAll = function () {
  return this.find();
};

productSchema.statics.findAll = function () {
  return this.find();
};

productSchema.statics.findById = function (prodId) {
  return this.findOne({ _id: prodId });
};

productSchema.statics.deleteById = function (prodId) {
  return this.deleteOne({ _id: prodId });
};

module.exports = mongoose.model("Product", productSchema);