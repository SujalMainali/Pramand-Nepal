// lib/mongodb.ts
import mongoose from "mongoose";

let isConnected = false; // Track connection status

export const connectDB = async (): Promise<void> => {
    if (isConnected) {
        console.log("✅ Using existing MongoDB connection");
        return;
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI as string, {
            dbName: process.env.MONGODB_DB,
        });

        isConnected = mongoose.connection.readyState === 1;
        console.log("🚀 MongoDB connected successfully");
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        throw new Error("Failed to connect to MongoDB");
    }
};
