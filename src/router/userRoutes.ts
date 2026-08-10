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

router.get("/", auth as any, getUsers);
router.post("/validateAddress", auth as any, validateAddress);

// --- 2. Specific Sub-Resource Routes (Addresses) ---
router.post("/addAddress/:userId", auth as any, addUserAddress);
router.get("/addresses/:userId", auth as any, getUserAddresses);
router.get("/addresses/:userId/:addressId", auth as any, getAddressById);
router.put("/updateAddress/:userId/:addressId", auth as any, updateUserAddress);
router.delete("/deleteAddress/:userId/:addressId", auth as any, deleteUserAddress);

// --- 3. Base Resource Modification Routes ---
router.post("/create", upload.single("profilePic"), createUser);
router.put("/:id", upload.single("profilePic"), auth as any, updateUser);
router.delete("/:id", auth as any, deleteUser);

// --- 4. Generic Dynamic Parameter Routes (Place these last) ---
router.get("/:id", auth as any, getUserById);



export default router;
