import { Response, NextFunction } from "express";
import { failResponse } from "../utils/response";
import { AuthRequest } from "./authMiddleware";

export const superAdmin = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {

    const user = req.user as {
        id?: string;
        email?: string;
        userType?: string;
    };

    if (user?.userType !== "superadmin") {
        return failResponse(
            res,
            "Superadmin access required",
            403
        );
    }

    return next();
};