import multer from "multer";
import path from "path";

// File type validation
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    // Check file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    
    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
};

// OPTION 1: Memory Storage (Recommended for Cloudinary)
// Stores files in memory as Buffer - better for cloud uploads
const memoryStorage = multer.memoryStorage();

export const uploadMemory = multer({
    storage: memoryStorage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
        files: 5, // Maximum 5 files per request
    },
    fileFilter
});
/*

// OPTION 2: Disk Storage (Your current approach - also works)
// Stores files temporarily on disk before uploading to Cloudinary
const diskStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        // You can specify a temp directory or use default temp
        cb(null, process.env.TEMP_DIR || './temp/uploads');
    },
    filename: (req, file, cb) => {
        // Generate unique filename to avoid conflicts
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

export const uploadDisk = multer({
    storage: diskStorage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
        files: 5,
    },
    fileFilter
});

// OPTION 3: Hybrid approach - choose based on file size
const hybridStorage = multer.memoryStorage();

export const uploadHybrid = multer({
    storage: hybridStorage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
        files: 5,
    },
    fileFilter: (req, file, cb) => {
        // First do the basic file type check
        fileFilter(req, file, (err) => {
            if (err) {
                cb(err);
                return;
            }
            
            // Additional custom validation can go here
            // For example, check file name length
            if (file.originalname.length > 255) {
                cb(new Error('File name too long. Maximum 255 characters.'));
                return;
            }
            
            cb(null, true);
        });
    }
});

*/

// Default export for backward compatibility
// Use memory storage as it's more efficient for Cloudinary
export const upload = uploadMemory;

// Export specific field configurations
export const uploadFields = {
    // For user profile updates
    userProfile: uploadMemory.fields([
        { name: 'profile', maxCount: 1 },
        { name: 'cover', maxCount: 1 }
    ]),
    
    // For single file uploads
    single: (fieldName: string) => uploadMemory.single(fieldName),
    
    // For multiple files
    multiple: (fieldName: string, maxCount: number = 5) => uploadMemory.array(fieldName, maxCount),
    
    // For mixed file types (if you need it for other features)
    mixed: uploadMemory.fields([
        { name: 'images', maxCount: 5 },
        { name: 'documents', maxCount: 3 }
    ])
};

export default upload;