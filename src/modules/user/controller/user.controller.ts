// controllers/user.controller.ts
import { Request, Response } from "express";
import BaseController from "../../../core/controller/base.controller";
import UserService from "../services/user.service";

class UserController extends BaseController {
    // ✅ Get all users
    getAllUsers = async (req: Request, res: Response) => {
        this.handleRequest(async () => {
            const users = await UserService.getAllUsers();
            return users;
        }, "Fetched all users successfully", "Failed to fetch users", res);
    };

    // ✅ Get user by ID
    getUserById = async (req: Request, res: Response) => {
        this.handleRequest(async () => {
            const { id } = req.params;
            const user = await UserService.getUserById(id);
            if (!user) throw "User not found";
            return user;
        }, "Fetched user successfully", "Failed to fetch user", res);
    };

    // ✅ Get user by username
    getUserByUsername = async (req: Request, res: Response) => {
        this.handleRequest(async () => {
            const { username } = req.params;
            const user = await UserService.getUserByUsername(username);
            if (!user) throw "User not found";
            return user;
        }, "Fetched user successfully", "Failed to fetch user", res);
    };

    // ✅ Create user
    createUser = async (req: Request, res: Response) => {
        this.handleRequest(async () => {
            const newUser = await UserService.createUser(req.body);
            return newUser;
        }, "User created successfully", "Failed to create user", res);
    };

    // ✅ Update user
    updateUser = async (req: Request, res: Response) => {
        this.handleRequest(async () => {
            const { id } = req.params;
            const updatedUser = await UserService.updateUser(id, req.body);
            if (!updatedUser) throw "User not found";
            return updatedUser;
        }, "User updated successfully", "Failed to update user", res);
    };

    // ✅ Delete user
    deleteUser = async (req: Request, res: Response) => {
        this.handleRequest(async () => {
            const { id } = req.params;
            const deletedUser = await UserService.deleteUser(id);
            if (!deletedUser) throw "User not found";
            return deletedUser;
        }, "User deleted successfully", "Failed to delete user", res);
    };

    // ✅ Follow user
    followUser = async (req: Request, res: Response) => {
        this.handleRequest(async () => {
            const { userId, targetId } = req.body;
            await UserService.followUser(userId, targetId);
            return { message: "Followed user successfully" };
        }, "Follow successful", "Failed to follow user", res);
    };

    // ✅ Unfollow user
    unfollowUser = async (req: Request, res: Response) => {
        this.handleRequest(async () => {
            const { userId, targetId } = req.body;
            await UserService.unfollowUser(userId, targetId);
            return { message: "Unfollowed user successfully" };
        }, "Unfollow successful", "Failed to unfollow user", res);
    };

    // ✅ Connect users
    connectUsers = async (req: Request, res: Response) => {
        this.handleRequest(async () => {
            const { userId, targetId } = req.body;
            await UserService.connectUsers(userId, targetId);
            return { message: "Connected users successfully" };
        }, "Connection successful", "Failed to connect users", res);
    };
}

export default new UserController();
