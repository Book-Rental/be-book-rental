
const crypto = require('crypto');


export const generateEmailVerificationToken = () => {
    return crypto.randomBytes(32).toString('hex');
}

export const hashToken = (token: string, userEmail: string) => {
    const tokenHash = crypto.createHash('sha256').update(token + userEmail).digest('hex');
    return tokenHash;
}

export const buildPaginationQuery = (query: any): {
    skip: number,
    limit: number,
    page: number
} => {
    try {
        const page = parseInt(query.page) || 1; // Default to page 1
        const limit = parseInt(query.limit) || 10; // Default to 10 users per page
        const skip = (page - 1) * limit;
        return {
            limit,
            skip,
            page
        }
    } catch (err) {
        return {
            skip: 0,
            limit: 10,
            page: 1
        }
    }
}