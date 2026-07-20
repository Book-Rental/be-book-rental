import { Request, Response } from "express";
import { IUser } from "../models/interfaces";
import { createUserService, loginService, updateUserService } from "../services/userService";

import { failResponse, successResponse } from "../utils/response";
import { StatusCode } from "../utils/StatusCodes";

import { GUEST_COOKIE_NAME, JWT_TOKEN_NAME, Messages } from "../utils/constants";
import { validationResult } from "express-validator";
import { generateToken, verifyGuestToken } from "../utils/jwt";
import { comparePasswords } from "../utils/passwordValidation";
import { mergeGuestCartIntoUserCartService } from "../services/cartService";
const isProd = process.env.NODE_ENV === "production";

// POST login user
export const loginUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const credentials = req.body as { email: string; password: string };
        const userInfo: IUser | any = await loginService(credentials?.email);

        if (!userInfo) {
            failResponse(res, Messages.User_Not_Available, StatusCode.Not_Found);
            return;
        }
        if (userInfo?.password) {
            const password = await comparePasswords(credentials.password, userInfo.password);
            if (!password) {
                failResponse(res, Messages.Password_Not_Matched, StatusCode.Unauthorized);
                return;
            }
        } else {
            failResponse(res, Messages.Unauthorized_User, StatusCode.Unauthorized);
            return;
        }

        // Merge guest cart into user cart (if guest cookie exists)
        const guestToken = req.cookies?.[GUEST_COOKIE_NAME];
        if (guestToken) {
            const payload = verifyGuestToken(guestToken);
            if (payload && payload.anonymousId) {
                try {
                    await mergeGuestCartIntoUserCartService(
                        String(userInfo._id),
                        payload.anonymousId
                    );
                } catch (mergeError) {
                    // Merge is best-effort; don't block login on merge failure
                    console.warn("Guest cart merge error:", mergeError);
                }
            }
            // Clear guest cookie after merge
            res.clearCookie(GUEST_COOKIE_NAME, {
                httpOnly: true,
                secure: isProd,
                sameSite: isProd ? "none" : "lax",
            });
        }

        const token = await generateToken(userInfo);
        res.cookie(`${JWT_TOKEN_NAME}`, token, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
            maxAge: 24 * 60 * 60 * 1000,
        });
        successResponse(res, { userInfo, token }, Messages.UserAuthenticated, StatusCode.OK);
    } catch (err: any) {
        failResponse(res, err?.message || err, StatusCode.Bad_Request);
    }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            failResponse(res, errors.array(), StatusCode.Bad_Request);
            return;
        }
        const credentials = req.body as {
            email: string;
            currentPassword: string;
            newPassword: string;
        };
        const userInfo: IUser | any = await loginService(credentials?.email);
        const isPasswordCorrect = await comparePasswords(
            credentials?.currentPassword,
            userInfo.password
        );
        if (isPasswordCorrect) {
            const updatedUser = await updateUserService(userInfo._id, {
                password: credentials.newPassword,
            });
            successResponse(
                res,
                { newPassword: credentials.newPassword },
                Messages.Password_Updated,
                StatusCode.OK
            );
            return;
        }
        failResponse(res, Messages.CurrentPassword_NotCorrect, StatusCode.Bad_Request);
        return;
    } catch (err) {
        console.log("err", err);
        failResponse(res, Messages.CurrentPassword_NotCorrect, StatusCode.Bad_Request);
    }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
    try {
        res.clearCookie(`${JWT_TOKEN_NAME}`);
        successResponse(res, "", Messages.Logout, StatusCode.OK);
    } catch (err) {
        failResponse(res, Messages.Something_went_Wrong, StatusCode.Not_Found);
    }
};

// POST signup user (creates user, merges guest cart, sets JWT cookie)
export const signupUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const userData = req.body;
        const newUser: IUser | any = await createUserService({
            ...userData,
            createdBy: null,
            updatedBy: null,
        });

        if (newUser?.message === Messages.Duplicate_Email || !newUser?.email) {
            failResponse(
                res,
                newUser?.message || Messages.Something_went_Wrong,
                StatusCode.Bad_Request
            );
            return;
        }

        // Merge guest cart into newly created user cart (if guest cookie exists)
        const guestToken = req.cookies?.[GUEST_COOKIE_NAME];
        if (guestToken) {
            const payload = verifyGuestToken(guestToken);
            if (payload && payload.anonymousId) {
                try {
                    await mergeGuestCartIntoUserCartService(
                        String(newUser._id),
                        payload.anonymousId
                    );
                } catch (mergeError) {
                    console.warn("Guest cart merge error on signup:", mergeError);
                }
            }
            res.clearCookie(GUEST_COOKIE_NAME, {
                httpOnly: true,
                secure: isProd,
                sameSite: isProd ? "none" : "lax",
            });
        }

        // Generate and set JWT so user is logged in immediately after signup
        const token = await generateToken(newUser);
        res.cookie(`${JWT_TOKEN_NAME}`, token, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
            maxAge: 24 * 60 * 60 * 1000,
        });

        successResponse(res, { user: newUser, token }, Messages.User_Created, StatusCode.Created);
    } catch (err: any) {
        console.error("Signup error:", err);
        failResponse(res, err?.message || Messages.Something_went_Wrong, StatusCode.Bad_Request);
    }
};
