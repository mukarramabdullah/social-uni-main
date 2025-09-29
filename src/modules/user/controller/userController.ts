import mongoose from "mongoose";
import { Request, Response } from "express";
import { v2 as cloudinary } from "cloudinary";
import User from "../model/user.model";

// Types and Interfaces
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email?: string;
    };
    body: {
        username?: string;
        bio?: string;
        location?: string;
        full_name?: string;
        profile?: string; // Cloudinary URL or base64
        cover?: string; // Cloudinary URL or base64
        input?: string;
        followId?: string;
        unfollowId?: string;
    };
}

interface UpdateUserData {
    username?: string;
    bio?: string;
    location?: string;
    full_name?: string;
    profile?: string;
    cover?: string;
}

interface CloudinaryConfig {
    allowedTypes: string[];
    maxSize: number;
    folder: string;
}

interface CloudinaryUploadResult {
    public_id: string;
    secure_url: string;
    format: string;
    bytes: number;
}

// Abstract base class for controllers
abstract class BaseController {
    protected async handleRequest(
        req: Request,
        res: Response,
        handler: () => Promise<Response>
    ): Promise<Response> {
        try {
            return await handler();
        } catch (error: any) {
            console.error('❌ Error:', error);
            return res.status(500).json({ 
                message: 'Server error', 
                error: error.message || error 
            });
        }
    }

    protected sendResponse(res: Response, data: any, statusCode: number = 200): Response {
        return res.status(statusCode).json(data);
    }

    protected validateAuthentication(req: AuthenticatedRequest): string | null {
        const userId = req.user?.id;
        if (!userId) {
            return null;
        }
        return userId;
    }
}

// Cloudinary service class for handling image operations
class CloudinaryService {
    private static instance: CloudinaryService;
    private config: CloudinaryConfig;

    private constructor() {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        this.config = {
            allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
            maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
            folder: process.env.CLOUDINARY_FOLDER || 'user-uploads'
        };

        this.validateConfig();
    }

    public static getInstance(): CloudinaryService {
        if (!CloudinaryService.instance) {
            CloudinaryService.instance = new CloudinaryService();
        }
        return CloudinaryService.instance;
    }

    private validateConfig(): void {
        if (!process.env.CLOUDINARY_CLOUD_NAME || 
            !process.env.CLOUDINARY_API_KEY || 
            !process.env.CLOUDINARY_API_SECRET) {
            throw new Error('Cloudinary configuration missing');
        }
    }

    public async uploadImage(imageData: string, folder: 'profiles' | 'covers'): Promise<string> {
        // Generate unique public_id
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const publicId = `${folder}/${timestamp}-${randomString}`;

        // Prepare upload options
        const uploadOptions = {
            folder: `${this.config.folder}/${folder}`,
            public_id: publicId,
            resource_type: 'image' as const,
            format: 'webp',
            quality: 'auto:good',
            fetch_format: 'auto',
            transformation: this.getTransformation(folder),
            overwrite: true,
            invalidate: true,
        };

        // Upload directly to Cloudinary (handles base64, URLs, etc.)
        const uploadResult: CloudinaryUploadResult = await cloudinary.uploader.upload(
            imageData,
            uploadOptions
        );

        if (!uploadResult || !uploadResult.secure_url) {
            throw new Error('Upload successful but no URL returned');
        }

        console.log(`✅ Successfully uploaded ${folder} image:`, uploadResult.public_id);
        return uploadResult.secure_url;
    }

    private getTransformation(folder: 'profiles' | 'covers'): any[] {
        if (folder === 'profiles') {
            return [
                { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                { quality: 'auto:good' },
                { format: 'webp' }
            ];
        } else if (folder === 'covers') {
            return [
                { width: 1200, height: 400, crop: 'fill' },
                { quality: 'auto:good' },
                { format: 'webp' }
            ];
        }
        return [];
    }

    public async deleteImage(imageUrl: string): Promise<void> {
        try {
            const publicId = this.extractPublicId(imageUrl);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
                console.log(`🗑️ Deleted image: ${publicId}`);
            }
        } catch (error) {
            console.warn('⚠️ Failed to delete image from Cloudinary:', error);
        }
    }

    private extractPublicId(imageUrl: string): string | null {
        try {
            const urlParts = imageUrl.split('/');
            const uploadIndex = urlParts.findIndex(part => part === 'upload');
            
            if (uploadIndex === -1) return null;
            
            const publicIdWithExtension = urlParts.slice(uploadIndex + 2).join('/');
            const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, '');
            
            return publicId;
        } catch (error) {
            console.warn('⚠️ Failed to extract public_id from URL:', imageUrl);
            return null;
        }
    }
}

// User service class for database operations
class UserService {
    private static instance: UserService;

    private constructor() {}

    public static getInstance(): UserService {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }

    public async findUserById(userId: string): Promise<any> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID format');
        }
        return await User.findById(userId);
    }

    public async findUserByUsername(username: string): Promise<any> {
        return await User.findOne({ username });
    }

    public async updateUser(userId: string, updateData: UpdateUserData): Promise<any> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID format');
        }
        return await User.findByIdAndUpdate(userId, updateData, { new: true });
    }

    public async searchUsers(searchInput: string, excludeUserId: string): Promise<any[]> {
        const query = {
            $or: [
                { username: new RegExp(searchInput, 'i') },
                { email: new RegExp(searchInput, 'i') },
                { full_name: new RegExp(searchInput, 'i') },
                { location: new RegExp(searchInput, 'i') }
            ]
        };

        const allUsers = await User.find(query).select('-password');
        return allUsers.filter(user => user._id.toString() !== excludeUserId);
    }

    public async addFollowing(userId: string, followId: string): Promise<void> {
        const user = await this.findUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const userToFollow = await this.findUserById(followId);
        if (!userToFollow) {
            throw new Error('User to follow not found');
        }

        if (user.following.includes(followId)) {
            throw new Error('Already following this user');
        }

        user.following.push(followId);
        await user.save();

        if (!userToFollow.followers.includes(userId)) {
            userToFollow.followers.push(userId);
            await userToFollow.save();
        }
    }

    public async removeFollowing(userId: string, unfollowId: string): Promise<void> {
        const user = await this.findUserById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        if (!user.following.includes(unfollowId)) {
            throw new Error('You are not following this user');
        }

        user.following = user.following.filter((id: string) => id.toString() !== unfollowId);
        await user.save();

        const userToUnfollow = await this.findUserById(unfollowId);
        if (userToUnfollow && userToUnfollow.followers.includes(userId)) {
            userToUnfollow.followers = userToUnfollow.followers.filter(
                (id: string) => id.toString() !== userId
            );
            await userToUnfollow.save();
        }
    }
}

// Main UserController class
export class UserController extends BaseController {
    private userService: UserService;
    private cloudinaryService: CloudinaryService;

    constructor() {
        super();
        this.userService = UserService.getInstance();
        this.cloudinaryService = CloudinaryService.getInstance();
    }

    // ---------------- GET USER -----------------
    public getUserId = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
        return this.handleRequest(req, res, async () => {
            const userId = this.validateAuthentication(req);
            if (!userId) {
                return this.sendResponse(res, { message: "Unauthorized" }, 401);
            }

            const user = await this.userService.findUserById(userId);

            if (!user) {
                return this.sendResponse(res, { message: 'User not found' }, 404);
            }

            const { password, ...safeUser } = user.toObject();
            return this.sendResponse(res, safeUser);
        });
    };

    // ---------------- UPDATE USER -----------------
    public updateUserId = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
        return this.handleRequest(req, res, async () => {
            const userId = this.validateAuthentication(req);
            if (!userId) {
                return this.sendResponse(res, { message: "Unauthorized" }, 401);
            }

            const { username, bio, location, full_name, profile, cover } = req.body;

            const tempUser = await this.userService.findUserById(userId);

            if (!tempUser) {
                return this.sendResponse(res, { message: 'User not found' }, 404);
            }

            if (!username) {
                const { password, ...safeUser } = tempUser.toObject();
                return this.sendResponse(res, { user: safeUser });
            }

            let finalUsername = tempUser.username;

            if (tempUser.username !== username) {
                const existingUser = await this.userService.findUserByUsername(username);
                if (!existingUser) {
                    finalUsername = username;
                }
            }

            const updatedData: UpdateUserData = {
                username: finalUsername,
                bio,
                location,
                full_name
            };

            // Handle image uploads directly from request body
            await this.handleImageUploads(req, updatedData, tempUser);

            const updatedUser = await this.userService.updateUser(tempUser._id, updatedData);
            const { password, ...safeUser } = updatedUser.toObject();

            return this.sendResponse(res, { success: true, user: safeUser });
        });
    };

    private async handleImageUploads(
        req: AuthenticatedRequest, 
        updatedData: UpdateUserData, 
        currentUser: any
    ): Promise<void> {
        const { profile, cover } = req.body;

        if (profile) {
            if (currentUser.profile) {
                await this.cloudinaryService.deleteImage(currentUser.profile);
            }
            updatedData.profile = await this.cloudinaryService.uploadImage(profile, 'profiles');
        }

        if (cover) {
            if (currentUser.cover) {
                await this.cloudinaryService.deleteImage(currentUser.cover);
            }
            updatedData.cover = await this.cloudinaryService.uploadImage(cover, 'covers');
        }
    }

    // ---------------- SEARCH USERS -----------------
    public searchUsers = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
        return this.handleRequest(req, res, async () => {
            const userId = this.validateAuthentication(req);
            if (!userId) {
                return this.sendResponse(res, { message: "Unauthorized" }, 401);
            }

            const { input } = req.body;

            if (!input || input.trim().length === 0) {
                return this.sendResponse(res, { users: [] });
            }

            const filteredUsers = await this.userService.searchUsers(input.trim(), userId);
            return this.sendResponse(res, { users: filteredUsers });
        });
    };

    // ---------------- FOLLOWING USER -----------------
    public followUser = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
        return this.handleRequest(req, res, async () => {
            const userId = this.validateAuthentication(req);
            if (!userId) {
                return this.sendResponse(res, { message: "Unauthorized" }, 401);
            }

            const { followId } = req.body;

            if (!followId) {
                return this.sendResponse(res, { message: 'Follow ID is required' }, 400);
            }

            if (userId === followId) {
                return this.sendResponse(res, { message: 'You cannot follow yourself' }, 400);
            }

            await this.userService.addFollowing(userId, followId);
            return this.sendResponse(res, { message: 'Now you are following this user' });
        });
    };

    // ---------------- UNFOLLOWING USER -----------------
    public unfollowUser = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
        return this.handleRequest(req, res, async () => {
            const userId = this.validateAuthentication(req);
            if (!userId) {
                return this.sendResponse(res, { message: "Unauthorized" }, 401);
            }

            const { unfollowId } = req.body;

            if (!unfollowId) {
                return this.sendResponse(res, { message: 'Unfollow ID is required' }, 400);
            }

            if (userId === unfollowId) {
                return this.sendResponse(res, { message: 'You cannot unfollow yourself' }, 400);
            }

            await this.userService.removeFollowing(userId, unfollowId);
            return this.sendResponse(res, { message: 'You have unfollowed this user' });
        });
    };
}

// Create and export controller instance
const userController = new UserController();

// Export individual methods
export const getUserId = userController.getUserId;
export const updateUserId = userController.updateUserId;
export const searchUsers = userController.searchUsers;
export const followUser = userController.followUser;
export const unfollowUser = userController.unfollowUser;