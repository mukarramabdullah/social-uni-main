import dotenv from 'dotenv';

dotenv.config();

export const secretKey = process.env.JWT_SECRET as string;
