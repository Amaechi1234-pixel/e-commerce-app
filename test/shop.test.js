const request = require("supertest");
const mongoose = require("mongoose");
require("dotenv").config();

const app = require("../app");

const MONGODB_URI = process.env.MONGODB_URI;

beforeAll(async () => {
  await mongoose.connect(MONGODB_URI);
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Shop routes", () => {
  it("GET / should return 200", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toBe(200);
  }, 15000);
});

it("GET /login should return 200", async () => {
  const res = await request(app).get("/login");
  expect(res.statusCode).toBe(200);
}, 15000);