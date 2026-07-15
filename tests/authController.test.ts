import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  loginUser,
  logout,
  changePassword,
} from "../src/controllers/authController";

import {
  loginService,
  updateUserService,
} from "../src/services/userService";

import { comparePasswords } from "../src/utils/passwordValidation";
import { generateToken } from "../src/utils/jwt";
import { validationResult } from "express-validator";

vi.mock("../src/services/userService", () => ({
  loginService: vi.fn(),
  updateUserService: vi.fn(),
}));

vi.mock("../src/utils/passwordValidation", () => ({
  comparePasswords: vi.fn(),
}));

vi.mock("../src/utils/jwt", () => ({
  generateToken: vi.fn(),
}));

vi.mock("express-validator", () => ({
  validationResult: vi.fn(),
}));

const app = express();

app.use(express.json());
app.use(cookieParser());

app.post("/login", loginUser);
app.post("/changePassword", changePassword);
app.get("/logout", logout);

describe("Auth Controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /login", () => {
    it("should login successfully", async () => {
      (loginService as any).mockResolvedValue({
        _id: "1",
        email: "test@test.com",
        password: "hashedPassword",
      });

      (comparePasswords as any).mockResolvedValue(true);

      (generateToken as any).mockResolvedValue("jwt-token");

      const res = await request(app)
        .post("/login")
        .send({
          email: "test@test.com",
          password: "password123",
        });

      expect(res.status).toBe(200);

      expect(res.body.message).toBeDefined();

      expect(generateToken).toHaveBeenCalled();
    });

    it("should return user not found", async () => {
      (loginService as any).mockResolvedValue(null);

      const res = await request(app)
        .post("/login")
        .send({
          email: "abc@test.com",
          password: "123456",
        });

      expect(res.status).toBe(404);
    });

    it("should return password mismatch", async () => {
      (loginService as any).mockResolvedValue({
        password: "hashed",
      });

      (comparePasswords as any).mockResolvedValue(false);

      const res = await request(app)
        .post("/login")
        .send({
          email: "abc@test.com",
          password: "wrong",
        });

      expect(res.status).toBe(401);
    });

    it("should return unauthorized when password missing", async () => {
      (loginService as any).mockResolvedValue({
        email: "abc@test.com",
      });

      const res = await request(app)
        .post("/login")
        .send({
          email: "abc@test.com",
          password: "123",
        });

      expect(res.status).toBe(401);
    });

    it("should handle service exception", async () => {
      (loginService as any).mockRejectedValue(
        new Error("DB Error")
      );

      const res = await request(app)
        .post("/login")
        .send({
          email: "abc@test.com",
          password: "123",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /changePassword", () => {
    it("should update password successfully", async () => {
      (validationResult as any).mockReturnValue({
        isEmpty: () => true,
      });

      (loginService as any).mockResolvedValue({
        _id: "1",
        password: "hashed",
      });

      (comparePasswords as any).mockResolvedValue(true);

      (updateUserService as any).mockResolvedValue({});

      const res = await request(app)
        .post("/changePassword")
        .send({
          email: "test@test.com",
          currentPassword: "old",
          newPassword: "new",
        });

      expect(res.status).toBe(200);

      expect(updateUserService).toHaveBeenCalled();
    });

    it("should return validation error", async () => {
      (validationResult as any).mockReturnValue({
        isEmpty: () => false,
        array: () => [
          {
            msg: "Validation Error",
          },
        ],
      });

      const res = await request(app)
        .post("/changePassword")
        .send({});

      expect(res.status).toBe(400);
    });

    it("should return incorrect current password", async () => {
      (validationResult as any).mockReturnValue({
        isEmpty: () => true,
      });

      (loginService as any).mockResolvedValue({
        _id: "1",
        password: "hashed",
      });

      (comparePasswords as any).mockResolvedValue(false);

      const res = await request(app)
        .post("/changePassword")
        .send({
          email: "test@test.com",
          currentPassword: "wrong",
          newPassword: "new",
        });

      expect(res.status).toBe(400);
    });

    it("should handle exception", async () => {
      (validationResult as any).mockImplementation(() => {
        throw new Error("validation");
      });

      const res = await request(app)
        .post("/changePassword")
        .send({});

      expect(res.status).toBe(400);
    });
  });

   describe("GET /logout", () => {
    it("should logout successfully", async () => {
      const res = await request(app).get("/logout");

      expect(res.status).toBe(200);
    });

    // 🎯 NEW TEST CASE: Forces execution into the catch block of logout
    it("should handle unexpected exceptions and invoke failResponse during logout failure", async () => {
      // 1. Create an isolated Express app specifically to mock the response crash
      const errorApp = express();
      
      errorApp.get("/logout-fail", (req, res, next) => {
        // Force res.clearCookie to throw a runtime error
        res.clearCookie = () => {
          throw new Error("Simulated Cookie Clear Failure");
        };
        // Forward execution to your actual controller method
        logout(req, res);
      });

      const res = await request(errorApp).get("/logout-fail");

      // 2. Assert that your error handler successfully responds to the client
      expect(res.status).toBe(404); // Matches your custom StatusCode.Not_Found (404)
    });
  });

});