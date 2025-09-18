import request from "supertest";
import express from "express";
import session from "express-session";
import passport from "passport";
import { registerRoutes } from "../autoflow-backend/routes.js";

const app = express();

app.use(express.json());
app.use(session({
  secret: "test-secret",
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

beforeAll(async () => {
  await registerRoutes(app);
});

describe("Authentication Tests", () => {
  it("should return 401 for unauthenticated user on protected route", async () => {
    const res = await request(app).get("/api/auth/user");
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe("Authentication required");
  });

  // Additional tests for login flow can be added here
});
