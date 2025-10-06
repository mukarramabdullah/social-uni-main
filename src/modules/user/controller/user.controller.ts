// controllers/user.controller.ts
import { Request, Response } from "express";
import BaseController from "../../../core/controller/base.controller";
import UserService from "../services/user.service";
import { CloudinaryService } from "../../../core/services/cloudinary.service";

class UserController extends BaseController {
    private cloudinaryService: CloudinaryService = CloudinaryService.getInstance();
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

            // Fetch current user to potentially clean up old images
            const existingUser: any = await UserService.getUserById(id);
            if (!existingUser) throw "User not found";

            const {
                profile,
                cover,
                profile_image,
                cover_image,
                ...rest
            } = req.body as any;

            const updates: any = { ...rest };

            // Handle profile image upload (supports `profile` or `profile_image` keys)
            const incomingProfile = profile ?? profile_image;
            if (incomingProfile && typeof incomingProfile === "string" && incomingProfile.trim().length > 0) {
                if (existingUser.profile_image) {
                    try { await this.cloudinaryService.deleteImage(existingUser.profile_image); } catch { /* ignore */ }
                }
                const profileBuffer = Buffer.from(incomingProfile, 'base64');
                const profileFile = {
                    buffer: profileBuffer,
                    originalname: `profile-${Date.now()}.jpg`,
                    mimetype: 'image/jpeg',
                } as Express.Multer.File;
                const profileUrl = await this.cloudinaryService.uploadImage(profileFile, 'profiles');
                updates.profile_image = profileUrl;
            }

            // Handle cover image upload (supports `cover` or `cover_image` keys)
            const incomingCover = cover ?? cover_image;
            if (incomingCover && typeof incomingCover === "string" && incomingCover.trim().length > 0) {
                if (existingUser.cover_image) {
                    try { await this.cloudinaryService.deleteImage(existingUser.cover_image); } catch { /* ignore */ }
                }
                const coverBuffer = Buffer.from(incomingCover, 'base64');
                const coverFile = {
                    buffer: coverBuffer,
                    originalname: `cover-${Date.now()}.jpg`,
                    mimetype: 'image/jpeg',
                } as Express.Multer.File;
                const coverUrl = await this.cloudinaryService.uploadImage(coverFile, 'covers');
                updates.cover_image = coverUrl;
            }

            const updatedUser = await UserService.updateUser(id, updates);
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
