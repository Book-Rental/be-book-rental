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
 * Priority order:
 * 1. Authorization cookie → userId (authenticated user)
 * 2. X-Anonymous-Id header → anonymousId (from frontend localStorage)
 * 3. Guest cookie → anonymousId (legacy/fallback)
 * 4. Generate new guest UUID → anonymousId (new visitor)
 *
 * The X-Anonymous-Id header is used as the primary mechanism for guest
 * identity to bypass third-party cookie blocking in modern browsers.
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

/**
 * Simple UUID v4 validation regex.
 */
const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

        // 2. Try X-Anonymous-Id header (primary guest mechanism — bypasses 3rd-party cookie blocking)
        const headerAnonymousId = req.headers["x-anonymous-id"] as string | undefined;
        if (headerAnonymousId && UUID_REGEX.test(headerAnonymousId)) {
            // Set the guest cookie as well for backward compatibility (e.g. server-side rendering)
            const guestToken = signGuestToken(headerAnonymousId);
            res.cookie(GUEST_COOKIE_NAME, guestToken, {
                httpOnly: true,
                secure: isProd,
                sameSite: isProd ? "none" : "lax",
                maxAge: GUEST_MAX_AGE,
            });

            req.cartIdentity = { anonymousId: headerAnonymousId };
            next();
            return;
        }

        // 3. Try guest cookie (legacy/fallback)
        const guestToken = req.cookies?.[GUEST_COOKIE_NAME];
        if (guestToken) {
            const payload = verifyGuestToken(guestToken);
            if (payload && payload.anonymousId) {
                req.cartIdentity = { anonymousId: payload.anonymousId };
                next();
                return;
            }
        }

        // 4. No valid identity → generate new guest UUID
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
