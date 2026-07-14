import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response } from "express";

import {
    loginUser,
    changePassword,
    logout,
} from "../src/controllers/authController";

import {
    loginService,
    updateUserService,
} from "../src/services/userService";

import { comparePasswords } from "../src/utils/passwordValidation";
import { generateToken } from "../src/utils/jwt";
import { validationResult } from "express-validator";

import {
    successResponse,
    failResponse,
} from "../src/utils/response";

vi.mock("../../services/userService");
vi.mock("../../utils/passwordValidation");
vi.mock("../../utils/jwt");
vi.mock("express-validator");
vi.mock("../../utils/response");

describe("User Controller", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        vi.clearAllMocks();

        req = {
            body: {},
        };

        res = {
            cookie: vi.fn(),
            clearCookie: vi.fn(),
        };
    });

    describe("loginUser", () => {
        it("should login successfully", async () => {
            req.body = {
                email: "test@gmail.com",
                password: "123456",
            };

            (loginService as any).mockResolvedValue({
                _id: "1",
                email: "test@gmail.com",
                password: "hashedPassword",
            });

            (comparePasswords as any).mockResolvedValue(true);

            (generateToken as any).mockResolvedValue("jwt-token");

            await loginUser(req as Request, res as Response);

            expect(loginService).toHaveBeenCalledWith(
                "test@gmail.com"
            );

            expect(comparePasswords).toHaveBeenCalled();

            expect(generateToken).toHaveBeenCalled();

            expect(res.cookie).toHaveBeenCalled();

            expect(successResponse).toHaveBeenCalled();
        });

        it("should return user not found", async () => {
            req.body = {
                email: "test@gmial.com",
                password: "123456",
            };

            (loginService as any).mockResolvedValue(null);

            await loginUser(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalled();
        });

        it("should return password mismatch", async () => {
            req.body = {
                email: "test@gmail.com",
                password: "123456",
            };

            (loginService as any).mockResolvedValue({
                password: "hashed",
            });

            (comparePasswords as any).mockResolvedValue(false);

            await loginUser(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalled();
        });

        it("should return unauthorized if password missing", async () => {
            req.body = {
                email: "test@gmail.com",
            };

            (loginService as any).mockResolvedValue({});

            await loginUser(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalled();
        });

        it("should handle service exception", async () => {
            req.body = {
                email: "test@gmail.com",
            };

            (loginService as any).mockRejectedValue(
                new Error("Database Error")
            );

            await loginUser(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalled();
        });
    });

    describe("changePassword", () => {
        it("should update password successfully", async () => {
            req.body = {
                email: "test@gmail.com",
                currentPassword: "old",
                newPassword: "new",
            };

            (validationResult as any).mockReturnValue({
                isEmpty: () => true,
            });

            (loginService as any).mockResolvedValue({
                _id: "1",
                password: "hashed",
            });

            (comparePasswords as any).mockResolvedValue(true);

            (updateUserService as any).mockResolvedValue({});

            await changePassword(req as Request, res as Response);

            expect(updateUserService).toHaveBeenCalled();

            expect(successResponse).toHaveBeenCalled();
        });

        it("should return validation error", async () => {
            (validationResult as any).mockReturnValue({
                isEmpty: () => false,
                array: () => [{ msg: "Email required" }],
            });

            await changePassword(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalled();
        });

        it("should return wrong current password", async () => {
            (validationResult as any).mockReturnValue({
                isEmpty: () => true,
            });

            (loginService as any).mockResolvedValue({
                password: "hashed",
            });

            (comparePasswords as any).mockResolvedValue(false);

            await changePassword(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalled();
        });

        it("should handle exception", async () => {
            (validationResult as any).mockImplementation(() => {
                throw new Error();
            });

            await changePassword(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalled();
        });
    });

    describe("logout", () => {
        it("should logout successfully", async () => {
            await logout(req as Request, res as Response);

            expect(res.clearCookie).toHaveBeenCalled();

            expect(successResponse).toHaveBeenCalled();
        });

        it("should handle logout exception", async () => {
            (res.clearCookie as any).mockImplementation(() => {
                throw new Error();
            });

            await logout(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalled();
        });
    });
});