// services/UserService.ts
import User, { IUser } from "../model/user.model";
import { Document, Types } from "mongoose";

class UserService {
    async getAllUsers(): Promise<Document[]> {
        return await User.find();
    }

    async getUserById(id: string): Promise<Document | null> {
        return await User.findById(id);
    }

    async getUserByUsername(username: string): Promise<Document | null> {
        return await User.findOne({ username });
    }

    async createUser(data: IUser): Promise<Document> {
        console.log(data)
        return await User.create(data);
    }

    async updateUser(id: string, data: Partial<Document>): Promise<Document | null> {
        return await User.findByIdAndUpdate(id, data, { new: true });
    }

    async deleteUser(id: string): Promise<Document | null> {
        return await User.findByIdAndDelete(id);
    }

    async followUser(userId: string, targetId: string): Promise<void> {
        await User.findByIdAndUpdate(userId, { $addToSet: { following: targetId } });
        await User.findByIdAndUpdate(targetId, { $addToSet: { followers: userId } });
    }

    async unfollowUser(userId: string, targetId: string): Promise<void> {
        await User.findByIdAndUpdate(userId, { $pull: { following: targetId } });
        await User.findByIdAndUpdate(targetId, { $pull: { followers: userId } });
    }

    async connectUsers(userId: string, targetId: string): Promise<void> {
        await User.findByIdAndUpdate(userId, { $addToSet: { connections: targetId } });
        await User.findByIdAndUpdate(targetId, { $addToSet: { connections: userId } });
    }
}

export default new UserService();
