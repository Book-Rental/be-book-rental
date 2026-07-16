import { Request, Response } from "express";
import { IUser } from "../models/interfaces";
import { loginService, updateUserService } from "../services/userService";

import { failResponse, successResponse } from "../utils/response";
import { StatusCode } from "../utils/StatusCodes";

import { JWT_TOKEN_NAME, Messages } from "../utils/constants";
import { validationResult } from "express-validator";
import { generateToken } from "../utils/jwt";
import { comparePasswords } from "../utils/passwordValidation";
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
