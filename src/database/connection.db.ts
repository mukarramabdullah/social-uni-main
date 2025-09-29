import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = process.env.MONGO_URI || "";

        await mongoose.connect(mongoURI);

        console.log("✅ MongoDB Connected Successfully");
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        process.exit(1); // stop the app if DB fails
    }
};

export default connectDB;