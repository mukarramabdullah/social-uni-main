import mongoose from "mongoose";
import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import User from "../../modules/user/model/user.model";
// Types and Interfaces
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email?: string;
    };
    files?: {
        profile?: Express.Multer.File[];
        cover?: Express.Multer.File[];
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

interface SearchUsersRequestBody {
    input: string;
}

interface FollowUserRequestBody {
    followId: string;
}

interface UnfollowUserRequestBody {
    unfollowId: string;
}

// Configuration for file uploads
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
    protected handleError(res: Response, error: any, message: string = 'Server error'): Response {
        console.error(`❌ ${message}:`, error);
        return res.status(500).json({ message, error: error.message || error });
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
        // Configure Cloudinary
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
            throw new Error('Cloudinary configuration missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
        }
    }

    public async uploadImage(file: Express.Multer.File, folder: 'profiles' | 'covers'): Promise<string> {
        try {
            // Validate file type
            if (!this.config.allowedTypes.includes(file.mimetype)) {
                throw new Error('Invalid file type. Only JPEG, JPG, PNG, and WebP are allowed.');
            }

            // Validate file size
            if (file.size > this.config.maxSize) {
                throw new Error(`File size too large. Maximum size is ${this.config.maxSize / 1024 / 1024}MB.`);
            }

            // Generate unique public_id
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 15);
            const publicId = `${folder}/${timestamp}-${randomString}`;

            // Prepare upload options
            const uploadOptions = {
                folder: `${this.config.folder}/${folder}`,
                public_id: publicId,
                resource_type: 'image' as const,
                format: 'webp', // Convert to WebP for optimization
                quality: 'auto:good',
                fetch_format: 'auto',
                transformation: this.getTransformation(folder),
                overwrite: true, // Allow overwriting if same public_id exists
                invalidate: true, // Invalidate CDN cache
            };

            let uploadResult: CloudinaryUploadResult;

            // Upload from buffer (memory storage) or file path (disk storage)
            if (file.buffer) {
                // Memory storage - upload from buffer
                uploadResult = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        uploadOptions,
                        (error, result) => {
                            if (error) {
                                console.error('Cloudinary upload error:', error);
                                reject(new Error(`Upload failed: ${error.message}`));
                            } else {
                                resolve(result as CloudinaryUploadResult);
                            }
                        }
                    ).end(file.buffer);
                });
            } else if (file.path) {
                // Disk storage - upload from file path
                uploadResult = await cloudinary.uploader.upload(file.path, uploadOptions);
                
                // Clean up temporary file after successful upload
                try {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                } catch (cleanupError) {
                    console.warn('Failed to cleanup temp file:', cleanupError);
                }
            } else {
                throw new Error('Invalid file data: neither buffer nor path available');
            }

            // Validate upload result
            if (!uploadResult || !uploadResult.secure_url) {
                throw new Error('Upload successful but no URL returned');
            }

            console.log(`Successfully uploaded ${folder} image:`, uploadResult.public_id);
            return uploadResult.secure_url;

        } catch (error: any) {
            console.error(`Cloudinary upload failed for ${folder}:`, error);
            
            // Clean up temp file if upload failed
            if (file.path && fs.existsSync(file.path)) {
                try {
                    fs.unlinkSync(file.path);
                } catch (cleanupError) {
                    console.warn('Failed to cleanup temp file after upload failure:', cleanupError);
                }
            }
            
            throw new Error(`Cloudinary upload failed: ${error.message || error}`);
        }
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
            // Extract public_id from Cloudinary URL
            const publicId = this.extractPublicId(imageUrl);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
            }
        } catch (error) {
            console.warn('Failed to delete image from Cloudinary:', error);
        }
    }

    private extractPublicId(imageUrl: string): string | null {
        try {
            // Extract public_id from Cloudinary URL
            // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg
            const urlParts = imageUrl.split('/');
            const uploadIndex = urlParts.findIndex(part => part === 'upload');
            
            if (uploadIndex === -1) return null;
            
            // Get everything after /upload/v{version}/
            const publicIdWithExtension = urlParts.slice(uploadIndex + 2).join('/');
            
            // Remove file extension
            const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, '');
            
            return publicId;
        } catch (error) {
            console.warn('Failed to extract public_id from URL:', imageUrl);
            return null;
        }
    }

    public generateTransformedUrl(publicId: string, transformations: any[]): string {
        return cloudinary.url(publicId, {
            transformation: transformations,
            secure: true
        });
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

    public async findUserByEmail(email: string): Promise<any> {
        return await User.findOne({ email });
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

        const allUsers = await User.find(query).select('-password'); // Exclude password field

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

        // Optionally add to followers list of the followed user
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

        // Optionally remove from followers list of the unfollowed user
        const userToUnfollow = await this.findUserById(unfollowId);
        if (userToUnfollow && userToUnfollow.followers.includes(userId)) {
            userToUnfollow.followers = userToUnfollow.followers.filter((id: string) => id.toString() !== userId);
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
        try {
            const userId = this.validateAuthentication(req);
            if (!userId) {
                return this.sendResponse(res, { message: "Unauthorized" }, 401);
            }

            const user = await this.userService.findUserById(userId);

            if (!user) {
                return this.sendResponse(res, { message: 'User not found' }, 404);
            }

            // Remove sensitive information before sending
            const { password, ...safeUser } = user.toObject();

            return this.sendResponse(res, safeUser);
        } catch (error) {
            return this.handleError(res, error, "Error in getUserId");
        }
    };

    // ---------------- UPDATE USER -----------------
    public updateUserId = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
        try {
            const userId = this.validateAuthentication(req);
            if (!userId) {
                return this.sendResponse(res, { message: "Unauthorized" }, 401);
            }

            const { username, bio, location, full_name } = req.body;

            const tempUser = await this.userService.findUserById(userId);

            if (!tempUser) {
                return this.sendResponse(res, { message: 'User not found' }, 404);
            }

            if (!username) {
                const { password, ...safeUser } = tempUser.toObject();
                return this.sendResponse(res, { user: safeUser });
            }

            let finalUsername = tempUser.username;

            // Check if username is being changed and validate uniqueness
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

            // Handle image uploads
            await this.handleImageUploads(req, updatedData, tempUser);

            const updatedUser = await this.userService.updateUser(tempUser._id, updatedData);
            const { password, ...safeUser } = updatedUser.toObject();

            return this.sendResponse(res, { success: true, user: safeUser });
        } catch (error) {
            return this.handleError(res, error, "Error in updateUserId");
        }
    };

    private async handleImageUploads(req: AuthenticatedRequest, updatedData: UpdateUserData, currentUser: any): Promise<void> {
        const profile = req.files?.profile?.[0];
        const cover = req.files?.cover?.[0];

        if (profile) {
            // Delete old profile image if it exists
            if (currentUser.profile) {
                await this.cloudinaryService.deleteImage(currentUser.profile);
            }
            updatedData.profile = await this.cloudinaryService.uploadImage(profile, 'profiles');
        }

        if (cover) {
            // Delete old cover image if it exists
            if (currentUser.cover) {
                await this.cloudinaryService.deleteImage(currentUser.cover);
            }
            updatedData.cover = await this.cloudinaryService.uploadImage(cover, 'covers');
        }
    }

    // ---------------- SEARCH USERS -----------------
    public searchUsers = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
        try {
            const userId = this.validateAuthentication(req);
            if (!userId) {
                return this.sendResponse(res, { message: "Unauthorized" }, 401);
            }

            const { input }: SearchUsersRequestBody = req.body;

            if (!input || input.trim().length === 0) {
                return this.sendResponse(res, { users: [] });
            }

            const filteredUsers = await this.userService.searchUsers(input.trim(), userId);

            return this.sendResponse(res, { users: filteredUsers });
        } catch (error) {
            return this.handleError(res, error, "Error in searchUsers");
        }
    };

    // ---------------- FOLLOWING USER -----------------
    public followUser = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
        try {
            const userId = this.validateAuthentication(req);
            if (!userId) {
                return this.sendResponse(res, { message: "Unauthorized" }, 401);
            }

            const { followId }: FollowUserRequestBody = req.body;

            if (userId === followId) {
                return this.sendResponse(res, { message: 'You cannot follow yourself' }, 400);
            }

            await this.userService.addFollowing(userId, followId);

            return this.sendResponse(res, { message: 'Now you are following this user' });
        } catch (error) {
            if (error instanceof Error && (
                error.message === 'Already following this user' ||
                error.message === 'User to follow not found'
            )) {
                return this.sendResponse(res, { message: error.message }, 400);
            }
            return this.handleError(res, error, "Error in followUser");
        }
    };

    // ---------------- UNFOLLOWING USER -----------------
    public unfollowUser = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
        try {
            const userId = this.validateAuthentication(req);
            if (!userId) {
                return this.sendResponse(res, { message: "Unauthorized" }, 401);
            }

            const { unfollowId }: UnfollowUserRequestBody = req.body;

            if (userId === unfollowId) {
                return this.sendResponse(res, { message: 'You cannot unfollow yourself' }, 400);
            }

            await this.userService.removeFollowing(userId, unfollowId);

            return this.sendResponse(res, { message: 'You have unfollowed this user' });
        } catch (error) {
            if (error instanceof Error && error.message === 'You are not following this user') {
                return this.sendResponse(res, { message: error.message }, 400);
            }
            return this.handleError(res, error, "Error in unfollowUser");
        }
    };
}

// Create and export controller instance
const userController = new UserController();

// Export individual methods for backward compatibility
export const getUserId = userController.getUserId;
export const updateUserId = userController.updateUserId;
export const searchUsers = userController.searchUsers;
export const followUser = userController.followUser;
export const unfollowUser = userController.unfollowUser;