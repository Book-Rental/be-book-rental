import { beforeEach, describe, expect, it, vi } from "vitest";

import User from "../src/models/User";

import {
    addUserAddressService,
    createUserService,
    deleteUserAddressService,
    deleteUserService,
    getAddressByIdService,
    getAllUsersService,
    getUserAddressesService,
    getUserByIdService,
    loginService,
    updateUserAddressService,
    updateUserService,
} from "../src/services/userService";

import * as appFunctions from "../src/utils/appFunctions";
import { Messages } from "../src/utils/constants";
import mongoose from "mongoose";
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



    describe("User Address Services", () => {
        // Generate valid 24-character hex ObjectIds to pass Mongoose validation checks
        const validUserId = "60c72b2f9b1d8b2bad000001";
        const validAddressId = "60c72b2f9b1d8b2bad000999";
        const invalidId = "123-short-id";

        let mockUserInstance: any;

        beforeEach(() => {
            vi.clearAllMocks();

            // Re-initialize a fresh mock instance before each test to prevent mutation leakage
            mockUserInstance = {
                _id: validUserId,
                addresses: [
                    {
                        _id: new mongoose.Types.ObjectId(validAddressId),
                        street: "123 Main St",
                        isDefault: true,
                        // Simple mock definition of Mongoose's subdocument deleteOne helper
                        deleteOne: vi.fn().mockImplementation(function (this: any) {
                            mockUserInstance.addresses = mockUserInstance.addresses.filter(
                                (a: any) => a._id.toString() !== validAddressId
                            );
                        })
                    }
                ],
                // Mock Mongoose's document save function
                save: vi.fn().mockImplementation(function (this: any) {
                    return Promise.resolve(this);
                })
            };
        });

        // =========================================================================
        // 1. addUserAddressService()
        // =========================================================================
        describe("addUserAddressService()", () => {
            const newAddressPayload = {
                street: "456 Oak Ave",
                city: "Hyderabad",
                isDefault: false
            };

            it("should reject with validation error if user ID structure is incorrect", async () => {
                await expect(addUserAddressService(invalidId, newAddressPayload))
                    .rejects.toThrowError("Invalid user id.");
            });

            it("should throw an error if the user document is completely missing", async () => {
                vi.mocked(User.findById).mockResolvedValue(null);
                await expect(addUserAddressService(validUserId, newAddressPayload))
                    .rejects.toThrowError("User not found.");
            });

            it("should successfully append a brand new address to the array list", async () => {
                vi.mocked(User.findById).mockResolvedValue(mockUserInstance);

                const result = await addUserAddressService(validUserId, newAddressPayload);

                expect(User.findById).toHaveBeenCalledWith(validUserId);
                expect(mockUserInstance.addresses).toHaveLength(2);
                expect(mockUserInstance.save).toHaveBeenCalledTimes(1);
                expect(result.street).toBe("456 Oak Ave");
            });

            it("should unset all existing default flags if the incoming address is set to default", async () => {
                vi.mocked(User.findById).mockResolvedValue(mockUserInstance);
                const defaultAddressPayload = { ...newAddressPayload, isDefault: true };

                await addUserAddressService(validUserId, defaultAddressPayload);

                // The original pre-existing address should be forced to false
                expect(mockUserInstance.addresses[0].isDefault).toBe(false);
                // The brand new address retains its true flag
                expect(mockUserInstance.addresses[1].isDefault).toBe(true);
            });
            it("should throw User not found error during add address operation", async () => {
                vi.mocked(User.findById).mockResolvedValue(null);
                await expect(addUserAddressService("60c72b2f9b1d8b2bad000001", {}))
                    .rejects.toThrowError("User not found.");
            });

        });

        // =========================================================================
        // 2. updateUserAddressService()
        // =========================================================================
        describe("updateUserAddressService()", () => {
            const updatePayload = { street: "789 Pine Rd" };

            it("should validate both route arguments before matching document keys", async () => {
                await expect(updateUserAddressService(invalidId, validAddressId, updatePayload))
                    .rejects.toThrowError("Invalid user id.");

                await expect(updateUserAddressService(validUserId, invalidId, updatePayload))
                    .rejects.toThrowError("Invalid address id.");
            });

            it("should throw an error if the specific address ID is missing from the list", async () => {
                vi.mocked(User.findById).mockResolvedValue(mockUserInstance);
                await expect(updateUserAddressService(validUserId, "60c72b2f9b1d8b2bad000111", updatePayload))
                    .rejects.toThrowError("Address not found.");
            });

            it("should iterate keys cleanly and merge parameters dynamically into target object indices", async () => {
                vi.mocked(User.findById).mockResolvedValue(mockUserInstance);

                const result = await updateUserAddressService(validUserId, validAddressId, updatePayload);

                expect(result.street).toBe("789 Pine Rd");
                expect(mockUserInstance.save).toHaveBeenCalledTimes(1);
            });

            it("should handle default flag cascading updates correctly", async () => {
                // Add a secondary dummy item to test cascading resets
                mockUserInstance.addresses.push({ _id: new mongoose.Types.ObjectId(), isDefault: false });
                vi.mocked(User.findById).mockResolvedValue(mockUserInstance);

                // Actively update the first element to trigger cascades
                await updateUserAddressService(validUserId, validAddressId, { isDefault: true });

                expect(mockUserInstance.addresses[0].isDefault).toBe(true);
            });
            it("should skip user id validation and throw error on invalid address id specifically", async () => {
                // Pass a PERFECTLY VALID user id, but an invalid address id format
                await expect(updateUserAddressService("60c72b2f9b1d8b2bad000001", "short-address-id", {}))
                    .rejects.toThrowError("Invalid address id.");
            });
            it("should throw User not found error during update address operation", async () => {
                vi.mocked(User.findById).mockResolvedValue(null);
                await expect(updateUserAddressService("60c72b2f9b1d8b2bad000001", "60c72b2f9b1d8b2bad000999", {}))
                    .rejects.toThrowError("User not found.");
            });

        });

        // =========================================================================
        // 3. deleteUserAddressService()
        // =========================================================================
        describe("deleteUserAddressService()", () => {
            it("should successfully trigger deleteOne subdocument calls and clear targeted array references", async () => {
                vi.mocked(User.findById).mockResolvedValue(mockUserInstance);

                const result = await deleteUserAddressService(validUserId, validAddressId);

                expect(result).toBe(true);
                expect(mockUserInstance.addresses).toHaveLength(0);
                expect(mockUserInstance.save).toHaveBeenCalledTimes(1);
            });

            it("should bubble out error if targeted deletion element is absent", async () => {
                vi.mocked(User.findById).mockResolvedValue(mockUserInstance);
                await expect(deleteUserAddressService(validUserId, "60c72b2f9b1d8b2bad000111"))
                    .rejects.toThrowError("Address not found.");
            });
            it("should bypass user verification and throw on invalid address id structure during deletion", async () => {
                // Pass a valid user id, but a broken address id structure
                await expect(deleteUserAddressService("60c72b2f9b1d8b2bad000001", "short-address-id"))
                    .rejects.toThrowError("Invalid address id.");
            });
            it("should throw User not found error during delete address operation", async () => {
                vi.mocked(User.findById).mockResolvedValue(null);
                await expect(deleteUserAddressService("60c72b2f9b1d8b2bad000001", "60c72b2f9b1d8b2bad000999"))
                    .rejects.toThrowError("User not found.");
            });
            it("should trigger immediate failure flag at line 261 when an invalid user ID structure is encountered", async () => {
                // 1. Arrange: Define a broken alpha-numeric or short string that fails 24-character hex rules
                const structurallyInvalidUserId = "invalid-user-123";
                const normalLookingAddressId = "60c72b2f9b1d8b2bad000999";

                // 2. Act & Assert: Execute and expect it to reject with the exact string message on line 262
                await expect(deleteUserAddressService(structurallyInvalidUserId, normalLookingAddressId))
                    .rejects
                    .toThrowError("Invalid user id.");
            });

        });

        // =========================================================================
        // 4. getUserAddressesService()
        // =========================================================================
        describe("getUserAddressesService()", () => {
            it("should return the entire address payload array with field projection safety", async () => {
                // Simulate Mongoose select chaining mock
                const mockQueryChain: any = {
                    select: vi.fn().mockResolvedValue(mockUserInstance)
                };
                vi.mocked(User.findById).mockReturnValue(mockQueryChain);

                const result = await getUserAddressesService(validUserId);

                expect(User.findById).toHaveBeenCalledWith(validUserId);
                expect(mockQueryChain.select).toHaveBeenCalledWith("addresses");
                expect(result).toEqual(mockUserInstance.addresses);
            });
            it("should throw User not found error when trying to fetch all addresses", async () => {
                const mockQueryChain: any = {
                    select: vi.fn().mockResolvedValue(null)
                };
                vi.mocked(User.findById).mockReturnValue(mockQueryChain);

                await expect(getUserAddressesService("60c72b2f9b1d8b2bad000001"))
                    .rejects.toThrowError("User not found.");
            });
            it("should trigger immediate failure flag when an invalid user ID structure is encountered", async () => {
                // 1. Arrange: Define a broken string that fails the 24-character hexadecimal rule
                const structurallyInvalidUserId = "invalid-user-123";

                // 2. Act & Assert: Execute and verify it throws the exact error message
                await expect(getUserAddressesService(structurallyInvalidUserId))
                    .rejects
                    .toThrowError("Invalid user id.");
            });


        });

        // =========================================================================
        // 5. getAddressByIdService()
        // =========================================================================
        describe("getAddressByIdService()", () => {
            it("should isolate and return a specific single subdocument matching addressId context", async () => {
                const mockQueryChain: any = {
                    select: vi.fn().mockResolvedValue(mockUserInstance)
                };
                vi.mocked(User.findById).mockReturnValue(mockQueryChain);

                const result = await getAddressByIdService(validUserId, validAddressId);

                expect(result._id.toString()).toBe(validAddressId);
            });

            it("should throw error if address item lookup returns empty", async () => {
                const mockQueryChain: any = {
                    select: vi.fn().mockResolvedValue(mockUserInstance)
                };
                vi.mocked(User.findById).mockReturnValue(mockQueryChain);

                await expect(getAddressByIdService(validUserId, "60c72b2f9b1d8b2bad000111"))
                    .rejects.toThrowError("Address not found.");
            });
            it("should successfully trigger address id structure validation errors when user id passes checks", async () => {
                // Pass a valid user id, but a broken address id structure
                await expect(getAddressByIdService("60c72b2f9b1d8b2bad000001", "short-address-id"))
                    .rejects.toThrowError("Invalid address id.");
            });
            it("should throw User not found error when searching for a single address by id", async () => {
                const mockQueryChain: any = {
                    select: vi.fn().mockResolvedValue(null)
                };
                vi.mocked(User.findById).mockReturnValue(mockQueryChain);

                await expect(getAddressByIdService("60c72b2f9b1d8b2bad000001", "60c72b2f9b1d8b2bad000999"))
                    .rejects.toThrowError("User not found.");
            });
            it("should trigger immediate failure flag when an invalid user ID structure is encountered", async () => {
                // 1. Arrange: Structurally broken user ID, but valid address ID format
                const structurallyInvalidUserId = "invalid-user-123";
                const normalLookingAddressId = "60c72b2f9b1d8b2bad000999";

                // 2. Act & Assert: Verify it short-circuits instantly at the first check
                await expect(getAddressByIdService(structurallyInvalidUserId, normalLookingAddressId))
                    .rejects
                    .toThrowError("Invalid user id.");
            });

            it("should bypass user ID checks and trigger a failure flag when an invalid address ID structure is encountered", async () => {
                // 1. Arrange: Perfectly valid 24-character hex user ID, but structurally broken address ID
                const normalLookingUserId = "60c72b2f9b1d8b2bad000001";
                const structurallyInvalidAddressId = "invalid-address-456";

                // 2. Act & Assert: Verify it passes the first guard clause but catches on the second
                await expect(getAddressByIdService(normalLookingUserId, structurallyInvalidAddressId))
                    .rejects
                    .toThrowError("Invalid address id.");
            });

        });
    });



});