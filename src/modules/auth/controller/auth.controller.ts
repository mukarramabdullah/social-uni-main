import { Request, Response } from "express";
import BaseController from "../../../core/controller/base.controller";
import User, { IUser } from "../../user/model/user.model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { secretKey } from "../../../environment/environment";
import UserService from "../../user/services/user.service";

class AuthController extends BaseController {
    login = async (req: Request, res: Response) => {
        const { email, password } = req.body;
        this.handleRequest(async () => {
            const user: IUser | null = await User.findOne({ email });
            if (!user) throw "User not found";

            const match = await bcrypt.compare(password, user.password);
            if (!match) throw "Invalid Credentials";

            const token = jwt.sign({ id: user._id, email: user.email }, secretKey, { expiresIn: "1d" });
            return { token, user };
        }, "Login Successful", "Failed to log in", res);
    };

    signup = async (req: Request, res: Response) => {
        const { email, password } = req.body;
        this.handleRequest(async () => {
            const existingUser = await User.findOne({ email });
            if (existingUser) throw "User already exists with this email";

            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser: any = await UserService.createUser({ ...req.body, password: hashedPassword });

            const token = jwt.sign({ id: newUser._id, email: newUser.email }, secretKey, { expiresIn: "1d" });
            return { token, user: newUser };
        }, "Signup Successful", "Failed to sign up", res);
    };
}

export default new AuthController();
