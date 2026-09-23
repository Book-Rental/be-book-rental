import { Router } from "express";

import {
    addUserAddress,
    createUser,
    deleteUser,
    deleteUserAddress,
    getAddressById,
    getUserAddresses,
    getUserById,
    getUsers,
    updateUser,
    updateUserAddress,
    validateAddress,
} from "../controllers/usercontrollers";

import upload from "../utils/upload";
import { auth } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and address APIs
 */
/**
 * @swagger
 * /api/user:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved users
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/", auth as any, getUsers);
/**
 * @swagger
 * /api/user/validateAddress:
 *   post:
 *     summary: Validate user address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Address details to validate
 *     responses:
 *       200:
 *         description: Address validation successful
 *       400:
 *         description: Invalid address
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post("/validateAddress", auth as any, validateAddress);


/**
 * @swagger
 * /api/user/addAddress/{userId}:
 *   post:
 *     summary: Add an address for a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Address details
 *     responses:
 *       201:
 *         description: Address added successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post("/addAddress/:userId", auth as any, addUserAddress);


/**
 * @swagger
 * /api/user/addresses/{userId}:
 *   get:
 *     summary: Get all addresses of a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Successfully retrieved user addresses
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get("/addresses/:userId", auth as any, getUserAddresses);


/**
 * @swagger
 * /api/user/addresses/{userId}/{addressId}:
 *   get:
 *     summary: Get a specific user address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *         description: Address ID
 *     responses:
 *       200:
 *         description: Address retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 *       500:
 *         description: Internal server error
 */
router.get(
    "/addresses/:userId/:addressId",
    auth as any,
    getAddressById
);


/**
 * @swagger
 * /api/user/updateAddress/{userId}/{addressId}:
 *   put:
 *     summary: Update a user address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *         description: Address ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Updated address details
 *     responses:
 *       200:
 *         description: Address updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 *       500:
 *         description: Internal server error
 */
router.put(
    "/updateAddress/:userId/:addressId",
    auth as any,
    updateUserAddress
);


/**
 * @swagger
 * /api/user/deleteAddress/{userId}/{addressId}:
 *   delete:
 *     summary: Delete a user address
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema:
 *           type: string
 *         description: Address ID
 *     responses:
 *       200:
 *         description: Address deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Address not found
 *       500:
 *         description: Internal server error
 */
router.delete(
    "/deleteAddress/:userId/:addressId",
    auth as any,
    deleteUserAddress
);


/**
 * @swagger
 * /api/user/create:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             description: User registration details
 *             properties:
 *               profilePic:
 *                 type: string
 *                 format: binary
 *                 description: User profile picture
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
router.post(
    "/create",
    upload.single("profilePic"),
    createUser
);


/**
 * @swagger
 * /api/user/{id}:
 *   put:
 *     summary: Update a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             description: Updated user details
 *             properties:
 *               profilePic:
 *                 type: string
 *                 format: binary
 *                 description: Updated profile picture
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.put(
    "/:id",
    upload.single("profilePic"),
    auth as any,
    updateUser
);


/**
 * @swagger
 * /api/user/{id}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.delete("/:id", auth as any, deleteUser);


/**
 * @swagger
 * /api/user/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get("/:id", auth as any, getUserById);

export default router;