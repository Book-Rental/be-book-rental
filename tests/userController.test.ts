import { beforeEach, describe, expect, it, vi } from "vitest";
import { Request, Response } from "express";

vi.mock("../src/services/userService", () => ({
    getAllUsersService: vi.fn(),
    createUserService: vi.fn(),
    deleteUserService: vi.fn(),
    updateUserService: vi.fn(),
    getUserByIdService: vi.fn(),
    updateUserAddressService: vi.fn(),
    deleteUserAddressService: vi.fn(),
}));

vi.mock("../src/utils/response", () => ({
    successResponse: vi.fn(),
    failResponse: vi.fn(),
}));

vi.mock("../src/utils/UploadImage", () => ({
    uploadToCloudinary: vi.fn(),
}));

import {
    getUsers,
    createUser,
    deleteUser,
    updateUser,
    getUserById,
    updateUserAddress,
    deleteUserAddress,
} from "../src/controllers/usercontrollers";

import {
    getAllUsersService,
    createUserService,
    deleteUserService,
    updateUserService,
    getUserByIdService,
    updateUserAddressService,
    deleteUserAddressService,
} from "../src/services/userService";

import {
    successResponse,
    failResponse,
} from "../src/utils/response";

import { Messages } from "../src/utils/constants";
import { StatusCode } from "../src/utils/StatusCodes";
import { uploadToCloudinary } from "../src/utils/UploadImage";

describe("User Controller - Part 1", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        vi.clearAllMocks();

        req = {
            body: {},
            params: {},
            query: {},
            file: undefined,
        };

        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
    });

    describe("getUsers()", () => {
        it("should return users successfully", async () => {
            const users = {
                users: [
                    {
                        _id: "1",
                        firstName: "John",
                        email: "john@test.com",
                    },
                ],
                meta: {
                    totalRecords: 1,
                    totalPages: 1,
                    currentPage: 1,
                    limit: 10,
                    hasMore: false,
                },
            };

            req.query = {
                page: "1",
                limit: "10",
            };

            (getAllUsersService as any).mockResolvedValue(users);

            await getUsers(req as Request, res as Response);

            expect(getAllUsersService).toHaveBeenCalledWith(req.query);

            expect(successResponse).toHaveBeenCalledWith(
                res,
                users,
                "",
                StatusCode.OK
            );
        });

        it("should return error when service throws", async () => {
            req.query = {};

            (getAllUsersService as any).mockRejectedValue(
                new Error("Database Error")
            );

            await getUsers(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalledWith(
                res,
                "Database Error",
                StatusCode.Bad_Request
            );
        });
        it("should handle getUsers exception", async () => {
            (getAllUsersService as any).mockImplementation(() => {
                throw new Error("Database Error");
            });

            await getUsers(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalledWith(
                res,
                "Database Error",
                StatusCode.Bad_Request
            );
        });
    });

    describe("createUser()", () => {
        beforeEach(() => {
            req.body = {
                firstName: "John",
                lastName: "Doe",
                email: "john@test.com",
                password: "password123",
            };

            req.file = undefined;
        });

        it("should create user successfully", async () => {
            const createdUser = {
                _id: "user123",
                email: "john@test.com",
                firstName: "John",
            };

            (createUserService as any).mockResolvedValue(createdUser);

            await createUser(req as Request, res as Response);

            expect(createUserService).toHaveBeenCalledWith({
                ...req.body,
                createdBy: null,
                updatedBy: null,
            });

            expect(successResponse).toHaveBeenCalledWith(
                res,
                createdUser,
                Messages.User_Created,
                StatusCode.Created
            );
        });

        it("should return duplicate email response", async () => {
            (createUserService as any).mockResolvedValue({
                message: Messages.Duplicate_Email,
                email: "john@test.com",
            });

            await createUser(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalledWith(
                res,
                Messages.Duplicate_Email,
                StatusCode.Bad_Request
            );
        });

        it("should return failure when email is missing", async () => {
            (createUserService as any).mockResolvedValue({
                message: "Invalid User",
            });

            await createUser(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalled();
        });

        it("should return error when service throws", async () => {
            (createUserService as any).mockRejectedValue(
                new Error("Create Error")
            );

            await createUser(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalledWith(
                res,
                "Create Error",
                StatusCode.Bad_Request
            );
        });

        it("should handle createUser exception", async () => {
            (createUserService as any).mockImplementation(() => {
                throw new Error("Create Error");
            });

            await createUser(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalledWith(
                res,
                "Create Error",
                StatusCode.Bad_Request
            );
        });
    });


    // ============================
    //  createUser 

    describe("createUser() - Cloudinary Upload", () => {
        beforeEach(() => {
            req.body = {
                name: "John",
                firstName: "John",
                lastName: "Doe",
                email: "john@test.com",
                password: "password123",
            };

            req.file = {
                buffer: Buffer.from("dummy-image"),
                originalname: "profile.png",
                mimetype: "image/png",
                size: 100,
                fieldname: "profilePic",
                encoding: "7bit",
                destination: "",
                filename: "",
                path: "",
                stream: {} as any,
            };
        });

        it("should upload profile picture and create user", async () => {
            (uploadToCloudinary as any).mockResolvedValue(
                "https://cloudinary.com/profile.png"
            );

            const createdUser = {
                _id: "user123",
                email: "john@test.com",
                profilePic: "https://cloudinary.com/profile.png",
            };

            (createUserService as any).mockResolvedValue(createdUser);

            await createUser(req as Request, res as Response);

            expect(uploadToCloudinary).toHaveBeenCalledTimes(1);

            expect(createUserService).toHaveBeenCalledWith({
                ...req.body,
                profilePic: "https://cloudinary.com/profile.png",
                createdBy: null,
                updatedBy: null,
            });

            expect(successResponse).toHaveBeenCalledWith(
                res,
                createdUser,
                Messages.User_Created,
                StatusCode.Created
            );
        });

        it("should return failure when cloudinary upload fails", async () => {
            (uploadToCloudinary as any).mockRejectedValue(
                new Error("Cloudinary Error")
            );

            await createUser(req as Request, res as Response);

            expect(uploadToCloudinary).toHaveBeenCalled();

            expect(failResponse).toHaveBeenCalledWith(
                res,
                "Failed to upload profile picture",
                StatusCode.Internal_Server_Error
            );

            expect(createUserService).not.toHaveBeenCalled();
        });
    });

    //delete User 

    describe("deleteUser()", () => {
        beforeEach(() => {
            req.params = {
                id: "user123",
            };
        });

        it("should delete user successfully", async () => {
            (deleteUserService as any).mockResolvedValue({
                _id: "user123",
            });

            await deleteUser(req as Request, res as Response);

            expect(deleteUserService).toHaveBeenCalledWith("user123");

            expect(successResponse).toHaveBeenCalledWith(
                res,
                {},
                Messages.User_Deleted,
                StatusCode.OK
            );
        });

        it("should return failure when service returns message", async () => {
            (deleteUserService as any).mockResolvedValue({
                message: "User not found",
            });

            await deleteUser(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalledWith(
                res,
                "User not found",
                StatusCode.Bad_Request
            );
        });

        it("should return failure when service throws", async () => {
            (deleteUserService as any).mockRejectedValue(
                new Error("Delete Error")
            );

            await deleteUser(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalledWith(
                res,
                "Delete Error",
                StatusCode.Bad_Request
            );
        });

        it("should handle deleteUser exception", async () => {
            req.params = {
                id: "user123",
            };

            (deleteUserService as any).mockImplementation(() => {
                throw new Error("Delete Error");
            });

            await deleteUser(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalledWith(
                res,
                "Delete Error",
                StatusCode.Bad_Request
            );
        });
    });


    //Update USer 
    describe("updateUser()", () => {
        beforeEach(() => {
            req.params = {
                id: "user123",
            };

            req.body = {
                firstName: "Updated John",
            };

            req.file = undefined;
        });

        it("should update user successfully", async () => {
            const updatedUser = {
                _id: "user123",
                firstName: "Updated John",
            };

            (updateUserService as any).mockResolvedValue(updatedUser);

            await updateUser(req as Request, res as Response);

            expect(updateUserService).toHaveBeenCalledWith(
                "user123",
                req.body
            );

            expect(successResponse).toHaveBeenCalledWith(
                res,
                updatedUser,
                Messages.User_Updated,
                StatusCode.OK
            );
        });

        it("should upload image and update user", async () => {
            req.file = {
                buffer: Buffer.from("image"),
                originalname: "profile.png",
                mimetype: "image/png",
                size: 100,
                fieldname: "profilePic",
                encoding: "7bit",
                destination: "",
                filename: "",
                path: "",
                stream: {} as any,
            };

            (uploadToCloudinary as any).mockResolvedValue(
                "https://cloudinary.com/profile.png"
            );

            const updatedUser = {
                _id: "user123",
                profilePic: "https://cloudinary.com/profile.png",
            };

            (updateUserService as any).mockResolvedValue(updatedUser);

            await updateUser(req as Request, res as Response);

            expect(uploadToCloudinary).toHaveBeenCalled();

            expect(updateUserService).toHaveBeenCalledWith(
                "user123",
                expect.objectContaining({
                    profilePic: "https://cloudinary.com/profile.png",
                })
            );

            expect(successResponse).toHaveBeenCalledWith(
                res,
                updatedUser,
                Messages.User_Updated,
                StatusCode.OK
            );
        });

        it("should return failure when cloudinary upload fails", async () => {
            req.file = {
                buffer: Buffer.from("image"),
                originalname: "profile.png",
                mimetype: "image/png",
                size: 100,
                fieldname: "profilePic",
                encoding: "7bit",
                destination: "",
                filename: "",
                path: "",
                stream: {} as any,
            };

            (uploadToCloudinary as any).mockRejectedValue(
                new Error("Upload Error")
            );

            await updateUser(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalledWith(
                res,
                "Failed to upload profile picture",
                StatusCode.Internal_Server_Error
            );

            expect(updateUserService).not.toHaveBeenCalled();
        });

        it("should parse addresses string before updating", async () => {
            req.body = {
                addresses: JSON.stringify([
                    {
                        city: "Hyderabad",
                        street: "Road 1",
                    },
                ]),
            };

            (updateUserService as any).mockResolvedValue({
                _id: "user123",
            });

            await updateUser(req as Request, res as Response);

            expect(updateUserService).toHaveBeenCalledWith(
                "user123",
                {
                    addresses: [
                        {
                            city: "Hyderabad",
                            street: "Road 1",
                        },
                    ],
                }
            );
        });

        it("should continue when address JSON parsing fails", async () => {
            req.body = {
                addresses: "{invalid json}",
            };

            const consoleSpy = vi
                .spyOn(console, "error")
                .mockImplementation(() => { });

            (updateUserService as any).mockResolvedValue({
                _id: "user123",
            });

            await updateUser(req as Request, res as Response);

            expect(updateUserService).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        it("should return failure when service returns message", async () => {
            (updateUserService as any).mockResolvedValue({
                message: "User not found",
            });

            await updateUser(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalledWith(
                res,
                "User not found",
                StatusCode.Bad_Request
            );
        });

        it("should return failure when service throws", async () => {
            (updateUserService as any).mockRejectedValue(
                new Error("Update Error")
            );

            await updateUser(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalledWith(
                res,
                "Update Error",
                StatusCode.Bad_Request
            );
        });
        it("should handle updateUser exception", async () => {
            req.params = {
                id: "user123",
            };

            req.body = {};

            (updateUserService as any).mockImplementation(() => {
                throw new Error("Update Error");
            });

            await updateUser(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalledWith(
                res,
                "Update Error",
                StatusCode.Bad_Request
            );
        });
    });

    //get User By Id
    describe("getUserById()", () => {
        beforeEach(() => {
            req.params = {
                id: "user123",
            };
        });

        it("should get user by id successfully", async () => {
            const user = {
                _id: "user123",
                firstName: "John",
                email: "john@test.com",
            };

            (getUserByIdService as any).mockResolvedValue(user);

            await getUserById(req as Request, res as Response);

            expect(getUserByIdService).toHaveBeenCalledWith("user123");

            expect(successResponse).toHaveBeenCalledWith(
                res,
                user,
                Messages.User_Updated,
                StatusCode.OK
            );
        });

        it("should return fail response when service returns message", async () => {
            (getUserByIdService as any).mockResolvedValue({
                message: "User not found",
            });

            await getUserById(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalledWith(
                res,
                "User not found",
                StatusCode.Bad_Request
            );
        });

        it("should return fail response when service throws", async () => {
            (getUserByIdService as any).mockRejectedValue(
                new Error("Database Error")
            );

            const consoleSpy = vi
                .spyOn(console, "log")
                .mockImplementation(() => { });

            await getUserById(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalledWith(
                res,
                "Database Error",
                StatusCode.Bad_Request
            );

            consoleSpy.mockRestore();
        });
        it("should handle getUserById exception", async () => {
            req.params = {
                id: "user123",
            };

            (getUserByIdService as any).mockImplementation(() => {
                throw new Error("User Error");
            });

            await getUserById(req as Request, res as Response);

            expect(failResponse).toHaveBeenCalledWith(
                res,
                "User Error",
                StatusCode.Bad_Request
            );
        });
    });



});