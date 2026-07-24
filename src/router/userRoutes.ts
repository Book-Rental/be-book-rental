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
} from "../controllers/usercontrollers";
import upload from "../utils/upload";
import { auth } from "../middlewares/authMiddleware";

const router = Router();

router.get("/", auth as any, getUsers);
router.post("/create", upload.single("profilePic"), createUser);
router.delete("/:id", auth as any, deleteUser);
router.put("/:id", upload.single("profilePic"), auth as any, updateUser);

router.get("/:id", auth as any, getUserById);

router.post("/addAddress/:userId",auth as any, addUserAddress);

router.get("/addresses/:userId", auth as any,getUserAddresses);

router.get("/addresses/:userId/:addressId",auth as any, getAddressById);

router.put("/updateAddress/:userId/:addressId",auth as any, updateUserAddress);

router.delete("/deleteAddress/:userId/:addressId", auth as any ,deleteUserAddress);

export default router;
