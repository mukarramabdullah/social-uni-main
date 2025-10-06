import { v2 as cloudinary } from "cloudinary";

export interface CloudinaryConfig {
    allowedTypes: string[];
    maxSize: number; // bytes
    folder: string;
}

export interface CloudinaryUploadResult {
    public_id: string;
    secure_url: string;
    format: string;
    bytes: number;
}

export class CloudinaryService {
    private static instance: CloudinaryService;
    private config: CloudinaryConfig;

    private constructor() {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        this.config = {
            allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
            maxSize: 10 * 1024 * 1024, // 10 MB
            folder: process.env.CLOUDINARY_FOLDER || "user-uploads",
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
        if (
            !process.env.CLOUDINARY_CLOUD_NAME ||
            !process.env.CLOUDINARY_API_KEY ||
            !process.env.CLOUDINARY_API_SECRET
        ) {
            throw new Error("❌ Cloudinary configuration missing.");
        }
    }

    /**
     * Validate file type and size before upload
     */
    private validateFile(file: Express.Multer.File): void {
        if (!file) throw new Error("No file provided.");

        // Validate MIME type
        if (!this.config.allowedTypes.includes(file.mimetype)) {
            throw new Error(
                `Invalid file type. Allowed: ${this.config.allowedTypes.join(", ")}`
            );
        }

        // Validate size
        if (file.size > this.config.maxSize) {
            throw new Error(
                `File too large. Max allowed size is ${
                    this.config.maxSize / (1024 * 1024)
                } MB`
            );
        }
    }

    /**
     * Upload image directly to Cloudinary via stream
     */
    public async uploadImage(
        file: Express.Multer.File,
        folder: "profiles" | "covers"
    ): Promise<string> {
        this.validateFile(file);

        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const publicId = `${folder}/${timestamp}-${randomString}`;

        const uploadOptions = {
            folder: `${this.config.folder}/${folder}`,
            public_id: publicId,
            resource_type: "image" as const,
            transformation: this.getTransformation(folder),
            format: "webp",
            quality: "auto:good",
            fetch_format: "auto",
            overwrite: true,
            invalidate: true,
        };

        // ✅ Use stream upload wrapped in a Promise for TS compatibility
        const uploadResult: CloudinaryUploadResult = await new Promise(
            (resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    uploadOptions,
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result as CloudinaryUploadResult);
                    }
                );

                stream.end(file.buffer);
            }
        );

        if (!uploadResult || !uploadResult.secure_url) {
            throw new Error("Upload succeeded but no secure URL returned.");
        }

        console.log(`✅ Uploaded ${folder} image: ${uploadResult.public_id}`);
        return uploadResult.secure_url;
    }

    /**
     * Transformations for profile & cover images
     */
    private getTransformation(folder: "profiles" | "covers"): any[] {
        if (folder === "profiles") {
            return [
                { width: 400, height: 400, crop: "fill", gravity: "face" },
                { quality: "auto:good" },
                { format: "webp" },
            ];
        } else if (folder === "covers") {
            return [
                { width: 1200, height: 400, crop: "fill" },
                { quality: "auto:good" },
                { format: "webp" },
            ];
        }
        return [];
    }

    /**
     * Delete image by Cloudinary URL
     */
    public async deleteImage(imageUrl: string): Promise<void> {
        try {
            const publicId = this.extractPublicId(imageUrl);
            if (publicId) {
                await cloudinary.uploader.destroy(publicId);
                console.log(`🗑️ Deleted image: ${publicId}`);
            }
        } catch (error) {
            console.warn("⚠️ Failed to delete image from Cloudinary:", error);
        }
    }

    /**
     * Extract Cloudinary public_id from secure URL
     */
    private extractPublicId(imageUrl: string): string | null {
        try {
            const urlParts = imageUrl.split("/");
            const uploadIndex = urlParts.findIndex((part) => part === "upload");
            if (uploadIndex === -1) return null;

            const publicIdWithExt = urlParts.slice(uploadIndex + 2).join("/");
            const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
            return publicId;
        } catch {
            console.warn("⚠️ Failed to extract public_id from:", imageUrl);
            return null;
        }
    }
}
