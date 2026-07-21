import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";
import { verifyToken, verifyGuestToken, signGuestToken } from "../utils/jwt";
import { GUEST_COOKIE_NAME, JWT_TOKEN_NAME } from "../utils/constants";

/**
 * Resolves cart identity for a request.
 *
 * Sets on the request:
 *   req.cartIdentity = { userId?, anonymousId? }
 *
 * If a valid Authorization cookie is present → userId is set (existing auth).
 * Else if a valid guest cookie is present → anonymousId is set.
 * Else → a new guest UUID is generated, a guest cookie is set, and anonymousId is set.
 */
export interface CartIdentity {
    userId?: string;
    anonymousId?: string;
}

// Extend Express Request
declare module "express" {
    interface Request {
        cartIdentity?: CartIdentity;
    }
}

const GUEST_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
const isProd = process.env.NODE_ENV === "production";

export const resolveCartIdentity = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // 1. Try authenticated user first (existing Authorization cookie)
        const authToken = req.cookies?.[JWT_TOKEN_NAME];
        if (authToken) {
            try {
                const decoded = await verifyToken(authToken);
                if (decoded && typeof decoded === "object") {
                    const userId =
                        (decoded as any).id || (decoded as any)._id || (decoded as any).userId;
                    if (userId) {
                        req.cartIdentity = { userId };
                        next();
                        return;
                    }
                }
            } catch {
                // Auth token invalid/expired → fall through to guest check
            }
        }

        // 2. Try guest cookie
        const guestToken = req.cookies?.[GUEST_COOKIE_NAME];
        if (guestToken) {
            const payload = verifyGuestToken(guestToken);
            if (payload && payload.anonymousId) {
                req.cartIdentity = { anonymousId: payload.anonymousId };
                next();
                return;
            }
        }

        // 3. No valid identity → generate new guest UUID
        const anonymousId = randomUUID();
        const newGuestToken = signGuestToken(anonymousId);

        res.cookie(GUEST_COOKIE_NAME, newGuestToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
            maxAge: GUEST_MAX_AGE,
        });

        req.cartIdentity = { anonymousId };
        next();
    } catch (err) {
        // On any error, assign a fresh guest identity to keep cart working.
        const anonymousId = randomUUID();
        const newGuestToken = signGuestToken(anonymousId);

        res.cookie(GUEST_COOKIE_NAME, newGuestToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
            maxAge: GUEST_MAX_AGE,
        });

        req.cartIdentity = { anonymousId };
        next();
    }
};
