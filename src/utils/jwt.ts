const jwt = require("jsonwebtoken");

// Function to generate a JWT token
export const generateToken = async (user: { _id: string; email: string }) => {
    return await jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
        algorithm: "HS256",
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

// Function to verify a JWT token
export const verifyToken = async (token: string) => {
    const tokenDetail = jwt.decode(token);
    if (process.env.ENABLEJWT === "true") {
        return await jwt.verify(token, process.env.JWT_SECRET);
    }
    return tokenDetail;
};
