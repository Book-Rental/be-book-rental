import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  successResponse,
  failResponse,
  errorResponse,
} from "../src/utils/response";
import { Messages } from "../src/utils/constants";

describe("Response Utils", () => {
  let res: any;

  beforeEach(() => {
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe("successResponse", () => {
    it("should return success response with default values", () => {
      const data = {
        id: 1,
        name: "Book",
      };

      successResponse(res, data);

      expect(res.status).toHaveBeenCalledWith(200);

      expect(res.json).toHaveBeenCalledWith({
        status: Messages.Success,
        message: Messages.Success,
        data,
      });
    });

    it("should return success response with custom message and status", () => {
      const data = {
        id: 10,
      };

      successResponse(
        res,
        data,
        "Created Successfully",
        201
      );

      expect(res.status).toHaveBeenCalledWith(201);

      expect(res.json).toHaveBeenCalledWith({
        status: Messages.Success,
        message: "Created Successfully",
        data,
      });
    });
  });

  describe("failResponse", () => {
    it("should return fail response with default values", () => {
      failResponse(res);

      expect(res.status).toHaveBeenCalledWith(400);

      expect(res.json).toHaveBeenCalledWith({
        status: Messages.Fail,
        message: Messages.Fail,
      });
    });

    it("should return fail response with custom message", () => {
      failResponse(res, "Validation Failed", 422);

      expect(res.status).toHaveBeenCalledWith(422);

      expect(res.json).toHaveBeenCalledWith({
        status: Messages.Fail,
        message: "Validation Failed",
      });
    });
  });

  describe("errorResponse", () => {
    it("should return error response with default values", () => {
      errorResponse(res);

      expect(res.status).toHaveBeenCalledWith(500);

      expect(res.json).toHaveBeenCalledWith({
        status: Messages.Internal_Server_Error,
        message: Messages.Internal_Server_Error,
        error: null,
      });
    });

    it("should return error response with custom values", () => {
      const err = {
        stack: "stack trace",
      } as any;

      errorResponse(
        res,
        "Database Error",
        503,
        err
      );

      expect(res.status).toHaveBeenCalledWith(503);

      expect(res.json).toHaveBeenCalledWith({
        status: Messages.Internal_Server_Error,
        message: "Database Error",
        error: err,
      });
    });
  });
});