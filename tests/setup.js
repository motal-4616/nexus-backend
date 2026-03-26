const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

/**
 * Connect to in-memory MongoDB for testing.
 * Sets env vars needed by the app (JWT secrets, etc.)
 */
const setup = async () => {
    // Set required env vars for the app
    process.env.JWT_SECRET = "test-jwt-secret-key-for-testing";
    process.env.JWT_REFRESH_SECRET = "test-jwt-refresh-secret-key-for-testing";
    process.env.JWT_EXPIRES_IN = "15m";
    process.env.JWT_REFRESH_EXPIRES_IN = "7d";
    process.env.FRONTEND_URL = "http://localhost:4200";
    process.env.NODE_ENV = "test";

    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    await mongoose.connect(uri);
};

/**
 * Drop all collections and close connection.
 */
const teardown = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany();
    }
    await mongoose.disconnect();
    if (mongoServer) {
        await mongoServer.stop();
    }
};

/**
 * Clear all collections between tests.
 */
const clearDB = async () => {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany();
    }
};

module.exports = { setup, teardown, clearDB };
