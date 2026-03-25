const jwt = require("jsonwebtoken");

const signAccessToken = (userId) => {
    return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    });
};

const signRefreshToken = (userId) => {
    return jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    });
};

const verifyToken = (token, secret) => {
    return jwt.verify(token, secret);
};

module.exports = { signAccessToken, signRefreshToken, verifyToken };
