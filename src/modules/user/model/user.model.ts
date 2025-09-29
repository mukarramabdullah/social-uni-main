import mongoose from "mongoose";

import { Document } from "mongoose";

export interface IUser extends Document {
    id: string;
    email: string;
    password: string;
    full_name: string;
    username?: string;
    bio: string;
    profile_image: string;
    cover_image: string;
    location: string;
    followers: string[];   // array of user IDs
    following: string[];   // array of user IDs
    connections: string[]; // array of user IDs
    createdAt: Date;
    updatedAt: Date;
}

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    full_name: { type: String, required: true },
    username: { type: String, unique: true },
    password: { type: String, required: true },
    bio: { type: String, default: "Hey there! I am using Uni-Tribe" },
    profile_image: { type: String, default: "" },
    cover_image: { type: String, default: "" },
    location: { type: String, default: "" },
    followers: { type: Array, ref: 'User' },
    following: { type: Array, ref: 'User' },
    connections: { type: Array, },

}, { timestamps: true, minimize: false });

const User = mongoose.model('User', userSchema);
export default User;