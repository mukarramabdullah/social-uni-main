import { Request } from "express";

export interface UpdateUserData {
    username?: string;
    bio?: string;
    location?: string;
    full_name?: string;
    profile?: string;
    cover?: string;
}

export interface AuthenticatedRequest extends Request {
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