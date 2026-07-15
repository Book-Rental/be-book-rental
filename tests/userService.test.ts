import { beforeEach, describe, expect, it, vi } from "vitest";

import User from "../src/models/User";

import {
    createUserService,
    deleteUserAddressService,
    deleteUserService,
    getAllUsersService,
    getUserByIdService,
    loginService,
    updateUserAddressService,
    updateUserService,
} from "../src/services/userService";

import * as appFunctions from "../src/utils/appFunctions";
import { Messages } from "../src/utils/constants";
vi.mock("../src/models/User", () => {
    const MockUser: any = vi.fn();

    MockUser.countDocuments = vi.fn();
    MockUser.find = vi.fn();
    MockUser.findOne = vi.fn();
    MockUser.findById = vi.fn();
    MockUser.findByIdAndDelete = vi.fn();
    MockUser.findOneAndUpdate = vi.fn();
    MockUser.updateOne = vi.fn();

    return {
        default: MockUser,
    };
});
vi.mock("../src/utils/appFunctions", () => ({
    buildPaginationQuery: vi.fn(),
    generateEmailVerificationToken: vi.fn(),
    hashToken: vi.fn(),
}));

describe("User Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getAllUsersService()", () => {
        it("should return paginated users", async () => {
            vi.mocked(appFunctions.buildPaginationQuery).mockReturnValue({
                skip: 0,
                limit: 10,
                page: 1,
            });

            vi.mocked(User.countDocuments).mockResolvedValue(2);

            const exec = vi.fn().mockResolvedValue([
                {
                    _id: "1",
                    firstName: "John",
                    email: "john@test.com",
                },
                {
                    _id: "2",
                    firstName: "Jane",
                    email: "jane@test.com",
                },
            ]);

            const select = vi.fn().mockReturnValue({ exec });
            const limit = vi.fn().mockReturnValue({ select });
            const skip = vi.fn().mockReturnValue({ limit });
            const sort = vi.fn().mockReturnValue({ skip });

            vi.mocked(User.find).mockReturnValue({
                sort,
            } as any);

            const result = (await getAllUsersService({
                search: "",
                page: 1,
                limit: 10,
                userType: "",
                status: "",
            })) as {
                users: Array<{ _id: string; firstName: string; email: string }>;
                meta: {
                    totalRecords: number;
                    currentPage: number;
                    limit: number;
                    hasMore: boolean;
                };
            };

            expect(appFunctions.buildPaginationQuery).toHaveBeenCalled();

            expect(User.countDocuments).toHaveBeenCalledWith({
                $and: [{ isActive: true }],
            });

            expect(result.users).toHaveLength(2);
            expect(result.meta.totalRecords).toBe(2);
            expect(result.meta.currentPage).toBe(1);
            expect(result.meta.limit).toBe(10);
            expect(result.meta.hasMore).toBe(false);
        });

        it("should apply search filter", async () => {
            vi.mocked(appFunctions.buildPaginationQuery).mockReturnValue({
                skip: 0,
                limit: 10,
                page: 1,
            });

            vi.mocked(User.countDocuments).mockResolvedValue(0);

            const exec = vi.fn().mockResolvedValue([]);

            const select = vi.fn().mockReturnValue({ exec });
            const limit = vi.fn().mockReturnValue({ select });
            const skip = vi.fn().mockReturnValue({ limit });
            const sort = vi.fn().mockReturnValue({ skip });

            vi.mocked(User.find).mockReturnValue({
                sort,
            } as any);

            await getAllUsersService({
                search: "john",
                page: 1,
                limit: 10,
                userType: "",
                status: "",
            });

            expect(User.countDocuments).toHaveBeenCalledWith(
                expect.objectContaining({
                    $or: expect.any(Array),
                })
            );
        });

        it("should apply userType and status filters", async () => {
            vi.mocked(appFunctions.buildPaginationQuery).mockReturnValue({
                skip: 0,
                limit: 10,
                page: 1,
            });

            vi.mocked(User.countDocuments).mockResolvedValue(0);

            const exec = vi.fn().mockResolvedValue([]);

            const select = vi.fn().mockReturnValue({ exec });
            const limit = vi.fn().mockReturnValue({ select });
            const skip = vi.fn().mockReturnValue({ limit });
            const sort = vi.fn().mockReturnValue({ skip });

            vi.mocked(User.find).mockReturnValue({
                sort,
            } as any);

            await getAllUsersService({
                search: "",
                page: 1,
                limit: 10,
                userType: "CUSTOMER",
                status: "Active",
            });

            expect(User.countDocuments).toHaveBeenCalledWith(
                expect.objectContaining({
                    $and: expect.arrayContaining([
                        { userType: "CUSTOMER" },
                        { status: "Active" },
                    ]),
                })
            );
        });

        it("should return error when countDocuments throws", async () => {
            vi.mocked(appFunctions.buildPaginationQuery).mockReturnValue({
                skip: 0,
                limit: 10,
                page: 1,
            });

            vi.mocked(User.countDocuments).mockRejectedValue(
                new Error("Database Error")
            );

            const result = await getAllUsersService({
                search: "",
                page: 1,
                limit: 10,
                userType: "",
                status: "",
            });

            expect(result).toBeInstanceOf(Error);
            expect((result as Error).message).toBe("Database Error");
        });
    });

    vi.mock("./path-to-your-user-model", () => {
        // Create a mock constructor function
        const MockUser = vi.fn().mockImplementation(function (this: any, data: any) {
            Object.assign(this, data);
            this.save = vi.fn(); // Each instance gets its own mockable save function
            return this;
        });

        // Attach static methods to the mock constructor
        (MockUser as any).findOne = vi.fn();

        return { User: MockUser };
    });

    describe("createUserService()", () => {
        const body = {
            email: "test@test.com",
            password: "password123",
            firstName: "John",
            lastName: "Doe",
        } as any;

        beforeEach(() => {
            vi.clearAllMocks(); // Clear call histories between tests
        });

        it("should create a user successfully", async () => {
            vi.mocked(User.findOne).mockResolvedValue(null as any);

            // Configure the save behavior for instances created during this test
            vi.mocked(User).mockImplementationOnce(function (this: any, data: any) {
                Object.assign(this, data);
                this._id = "123";
                this.save = vi.fn().mockImplementation(function (this: any) {
                    return Promise.resolve(this); // Sequential saves resolve to self
                });
                return this;
            });

            vi.spyOn(appFunctions, "generateEmailVerificationToken").mockReturnValue("verification-token");
            vi.spyOn(appFunctions, "hashToken").mockReturnValue("hashed-token");

            const result = await createUserService(body);

            expect(User.findOne).toHaveBeenCalledWith(
                { email: body.email },
                { email: 1 }
            );

            expect(result.save).toHaveBeenCalledTimes(2);
            expect(appFunctions.generateEmailVerificationToken).toHaveBeenCalledTimes(1);
            expect(appFunctions.hashToken).toHaveBeenCalledWith("verification-token", body.email);
            expect(result.email).toBe(body.email);
        });

        it("should return duplicate email message", async () => {
            vi.mocked(User.findOne).mockResolvedValue({ email: body.email } as any);

            const result = await createUserService(body);

            expect(result).toEqual({
                message: Messages.Duplicate_Email,
                email: body.email,
            });
        });

        it("should return first save error", async () => {
            vi.mocked(User.findOne).mockResolvedValue(null as any);

            vi.mocked(User).mockImplementationOnce(function (this: any, data: any) {
                Object.assign(this, data);
                this.save = vi.fn().mockRejectedValueOnce(new Error("Save Error"));
                return this;
            });

            const result = await createUserService(body);

            expect(result).toBeInstanceOf(Error);
            expect(result.message).toBe("Save Error");
        });

        it("should return second save error", async () => {
            vi.mocked(User.findOne).mockResolvedValue(null as any);

            vi.mocked(User).mockImplementationOnce(function (this: any, data: any) {
                Object.assign(this, data);
                this._id = "123";
                this.save = vi.fn()
                    .mockResolvedValueOnce(this)
                    .mockRejectedValueOnce(new Error("Second Save Error"));
                return this;
            });

            vi.spyOn(appFunctions, "generateEmailVerificationToken").mockReturnValue("verification-token");
            vi.spyOn(appFunctions, "hashToken").mockReturnValue("hashed-token");

            const result = await createUserService(body);

            expect(result).toBeInstanceOf(Error);
            expect(result.message).toBe("Second Save Error");
        });
    });


    describe("deleteUserService()", () => {
        const mockUserId = "60c72b2f9b1d8b2bad000001";

        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("should delete a user successfully and return the deleted document", async () => {
            const expectedDeletedUser = {
                _id: mockUserId,
                email: "deleted@test.com",
                firstName: "John",
            };

            // Mock the resolved database payload
            vi.mocked(User.findByIdAndDelete).mockResolvedValue(expectedDeletedUser as any);

            const result = await deleteUserService(mockUserId);

            // Assert the correct Mongoose method was invoked with the right ID
            expect(User.findByIdAndDelete).toHaveBeenCalledWith(mockUserId);
            expect(User.findByIdAndDelete).toHaveBeenCalledTimes(1);

            // Assert the response matches the mock document
            expect(result).toEqual(expectedDeletedUser);
        });

        it("should return null if no user is found with the given ID", async () => {
            vi.mocked(User.findByIdAndDelete).mockResolvedValue(null);

            const result = await deleteUserService(mockUserId);

            expect(User.findByIdAndDelete).toHaveBeenCalledWith(mockUserId);
            expect(result).toBeNull();
        });

        it("should catch and return the database execution error", async () => {
            const dbError = new Error("Database connection timed out");
            vi.mocked(User.findByIdAndDelete).mockRejectedValueOnce(dbError);

            const result = await deleteUserService(mockUserId);

            expect(User.findByIdAndDelete).toHaveBeenCalledWith(mockUserId);
            expect(result).toBeInstanceOf(Error);
            expect((result as Error).message).toBe("Database connection timed out");
        });
    });

    describe("updateUserService()", () => {
        const mockUserId = "60c72b2f9b1d8b2bad000001";

        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("should update a user without address modifying instructions successfully", async () => {
            const updateData = { firstName: "Jane", lastName: "Smith" };
            const mockUpdatedUser = { _id: mockUserId, ...updateData, addresses: [] };

            vi.mocked(User.find).mockResolvedValue([mockUpdatedUser] as any);
            vi.mocked(User.findOneAndUpdate).mockResolvedValue(mockUpdatedUser as any);

            const result = await updateUserService(mockUserId, updateData);

            expect(User.find).toHaveBeenCalledWith({ _id: mockUserId });
            expect(User.findOneAndUpdate).toHaveBeenCalledWith(
                { _id: mockUserId },
                { $set: updateData },
                { new: true, runValidators: true, upsert: true }
            );
            expect(result).toEqual(mockUpdatedUser);
        });

        it("should push address object into array and strip it from the root update object if passed", async () => {
            const updateData = {
                firstName: "Jane",
                address: { street: "123 Main St", city: "New York" }
            };
            const mockUpdatedUser = {
                _id: mockUserId,
                firstName: "Jane",
                addresses: [{ street: "123 Main St", city: "New York" }]
            };

            vi.mocked(User.find).mockResolvedValue([mockUpdatedUser] as any);
            vi.mocked(User.findOneAndUpdate).mockResolvedValue(mockUpdatedUser as any);

            // Capture data before reference deletion in service
            const dataCopy = { ...updateData, address: { ...updateData.address } };
            const result = await updateUserService(mockUserId, dataCopy);

            expect(User.findOneAndUpdate).toHaveBeenCalledWith(
                { _id: mockUserId },
                {
                    $set: { firstName: "Jane" }, // Assert address was deleted from root $set
                    $push: { addresses: { street: "123 Main St", city: "New York" } } // Assert address moved to $push
                },
                { new: true, runValidators: true, upsert: true }
            );
            expect(result).toEqual(mockUpdatedUser);
        });

        it("should catch and return database execution errors securely", async () => {
            const updateData = { firstName: "Jane" };
            vi.mocked(User.find).mockRejectedValueOnce(new Error("Find error"));

            const result = await updateUserService(mockUserId, updateData);

            expect(result).toBeInstanceOf(Error);
            expect((result as Error).message).toBe("Find error");
        });
    });


    describe("loginService()", () => {
        const testEmail = "login-test@test.com";
        const selectedFields = "email userType lastName firstName status addresses isVerified password favoriteProducts";

        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("should look up a user by email and return the document with specified field projections", async () => {
            const mockUserPayload = {
                _id: "60c72b2f9b1d8b2bad000001",
                email: testEmail,
                firstName: "Jane",
                lastName: "Doe",
                password: "hashedPassword123"
            };

            // Create mock chain structure for findOne().exec()
            const mockExec = vi.fn().mockResolvedValue(mockUserPayload);
            vi.mocked(User.findOne).mockReturnValue({ exec: mockExec } as any);

            const result = await loginService(testEmail);

            // Assert that findOne was called with correct filter and project strings
            expect(User.findOne).toHaveBeenCalledWith({ email: testEmail }, selectedFields);
            expect(mockExec).toHaveBeenCalledTimes(1);

            // Assert the result matches the database projection object
            expect(result).toEqual(mockUserPayload);
        });

        it("should return null if no matching user document is found", async () => {
            const mockExec = vi.fn().mockResolvedValue(null);
            vi.mocked(User.findOne).mockReturnValue({ exec: mockExec } as any);

            const result = await loginService(testEmail);

            expect(User.findOne).toHaveBeenCalledWith({ email: testEmail }, selectedFields);
            expect(result).toBeNull();
        });

        it("should catch and return errors thrown during query execution", async () => {
            const dbError = new Error("Database query execution timed out");
            const mockExec = vi.fn().mockRejectedValueOnce(dbError);
            vi.mocked(User.findOne).mockReturnValue({ exec: mockExec } as any);

            const result = await loginService(testEmail);

            expect(result).toBeInstanceOf(Error);
            expect((result as Error).message).toBe("Database query execution timed out");
        });
    });


    //get User BY ID 
    describe("getUserByIdService()", () => {
        const mockUserId = "60c72b2f9b1d8b2bad000001";
        const expectedFields = "email userType lastName firstName status addresses isVerified profilePic deliveryStatus maxConcurrentOrders currentOrderIds currentLocation";

        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("should retrieve a user by ID successfully with selected projection fields", async () => {
            const mockUserPayload = {
                _id: mockUserId,
                email: "user@test.com",
                firstName: "John",
                lastName: "Doe",
                deliveryStatus: "available",
                currentLocation: { type: "Point", coordinates: [0, 0] }
            };

            // Mock findOne to resolve directly to the payload
            vi.mocked(User.findOne).mockResolvedValue(mockUserPayload as any);

            const result = await getUserByIdService(mockUserId);

            // Assert query targets the correct ID property and requests precise projection flags
            expect(User.findOne).toHaveBeenCalledWith({ _id: mockUserId }, expectedFields);
            expect(User.findOne).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockUserPayload);
        });

        it("should return null if no matching user document exists for the ID", async () => {
            vi.mocked(User.findOne).mockResolvedValue(null);

            const result = await getUserByIdService(mockUserId);

            expect(User.findOne).toHaveBeenCalledWith({ _id: mockUserId }, expectedFields);
            expect(result).toBeNull();
        });

        it("should catch validation or database errors and return them", async () => {
            const castError = new Error("Cast to ObjectId failed for value 'invalid-id'");
            vi.mocked(User.findOne).mockRejectedValueOnce(castError);

            const result = await getUserByIdService("invalid-id");

            expect(result).toBeInstanceOf(Error);
            expect((result as Error).message).toContain("Cast to ObjectId failed");
        });
    });

    //Update Address By user ID 
    describe("updateUserAddressService()", () => {
        const mockUserId = "60c72b2f9b1d8b2bad000001";
        const mockAddressId = "60c72b2f9b1d8b2bad000999";

        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("should accurately flatten newAddress properties into positional array notation using $set", async () => {
            const inputAddress = {
                id: mockAddressId,
                street: "456 Oak Ave",
                city: "Los Angeles",
                zipCode: "90001"
            };

            const mockWriteResult = { acknowledged: true, modifiedCount: 1, matchedCount: 1 };
            vi.mocked(User.updateOne).mockResolvedValue(mockWriteResult as any);

            const result = await updateUserAddressService(mockUserId, inputAddress);

            // Verify positional mapping: "addresses.$.property"
            expect(User.updateOne).toHaveBeenCalledWith(
                { _id: mockUserId, "addresses._id": mockAddressId },
                {
                    $set: {
                        "addresses.$.id": mockAddressId,
                        "addresses.$.street": "456 Oak Ave",
                        "addresses.$.city": "Los Angeles",
                        "addresses.$.zipCode": "90001"
                    }
                }
            );
            expect(result).toEqual(mockWriteResult);
        });

        it("should safely return execution error object if update operation fails", async () => {
            vi.mocked(User.updateOne).mockRejectedValueOnce(new Error("Mongoose Connection Failure"));

            const result = await updateUserAddressService(mockUserId, { id: mockAddressId });

            expect(result).toBeInstanceOf(Error);
            expect((result as Error).message).toBe("Mongoose Connection Failure");
        });
    });

    describe("deleteUserAddressService()", () => {
        const mockUserId = "60c72b2f9b1d8b2bad000001";
        const mockAddressId = "60c72b2f9b1d8b2bad000999";

        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("should remove target address subdocument out of model array using $pull syntax", async () => {
            const mockWriteResult = { acknowledged: true, modifiedCount: 1, matchedCount: 1 };
            vi.mocked(User.updateOne).mockResolvedValue(mockWriteResult as any);

            const result = await deleteUserAddressService(mockUserId, mockAddressId);

            expect(User.updateOne).toHaveBeenCalledWith(
                { _id: mockUserId },
                {
                    $pull: {
                        addresses: { _id: mockAddressId }
                    }
                }
            );
            expect(result).toEqual(mockWriteResult);
        });

        it("should catch validation or write errors and return them to the caller", async () => {
            vi.mocked(User.updateOne).mockRejectedValueOnce(new Error("BSON Extraction Error"));

            const result = await deleteUserAddressService(mockUserId, mockAddressId);

            expect(result).toBeInstanceOf(Error);
            expect((result as Error).message).toBe("BSON Extraction Error");
        });
    });

});