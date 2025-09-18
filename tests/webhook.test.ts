import request from "supertest";
import { createServer } from "http";
import express from "express";
import { registerRoutes } from "../routes.js";

let server: any;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  server = await registerRoutes(app);
});

describe("Webhook Endpoint Tests", () => {
  it("should return 400 for invalid payload", async () => {
    const res = await request(server)
      .post("/api/webhooks/github-push")
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe("Invalid payload");
  });

  it("should return 404 if project not found", async () => {
    const payload = {
      repository: { full_name: "nonexistent/repo" },
      ref: "refs/heads/main",
      head_commit: { id: "abc123", message: "Test commit" }
    };
    const res = await request(server)
      .post("/api/webhooks/github-push")
      .send(payload);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe("Project not found");
  });

  // Additional tests for successful deployment triggering can be added here
});
