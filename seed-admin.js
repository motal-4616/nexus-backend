require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User.model");

const ADMIN_EMAIL = "admin@nexus.com";
const ADMIN_PASSWORD = "Admin@123";
const ADMIN_NAME = "Admin";
const ADMIN_USERNAME = "admin";

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
        if (existing.role === "admin") {
            console.log("Admin account already exists:");
            console.log(`  Email: ${ADMIN_EMAIL}`);
            console.log(`  Role: ${existing.role}`);
        } else {
            existing.role = "admin";
            await existing.save();
            console.log("Upgraded existing user to admin:");
            console.log(`  Email: ${ADMIN_EMAIL}`);
        }
    } else {
        await User.create({
            name: ADMIN_NAME,
            username: ADMIN_USERNAME,
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            role: "admin",
        });
        console.log("Admin account created successfully!");
        console.log(`  Email: ${ADMIN_EMAIL}`);
        console.log(`  Password: ${ADMIN_PASSWORD}`);
    }

    await mongoose.disconnect();
    console.log("Done.");
}

seed().catch((err) => {
    console.error("Seed error:", err.message);
    process.exit(1);
});
