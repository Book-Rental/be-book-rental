import { Router } from "express";
import { loginUser, logout, changePassword, signupUser } from "../controllers/authController";
import { auth } from "../middlewares/authMiddleware";
import { validatePassword } from "../middlewares/passwordValidation";

const router = Router();

// Define routes
router.post("/login", loginUser);
router.post("/signup", signupUser);
router.get("/logout", logout);
router.post("/changePassword", validatePassword, auth as any, changePassword);

export default router;
