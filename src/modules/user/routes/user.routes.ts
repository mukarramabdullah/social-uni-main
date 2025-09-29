// routes/user.routes.ts
import { Router } from "express";
import UserController from "../controller/user.controller";
import authentication from "../../../middleware/authentication";

class UserRoutes {
    private router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.use(authentication.authenticateToken)

        this.router.get("/", UserController.getAllUsers);
        this.router.get("/:id", UserController.getUserById);
        this.router.get("/username/:username", UserController.getUserByUsername);

        this.router.post("/", UserController.createUser);
        this.router.put("/:id", UserController.updateUser);
        this.router.delete("/:id", UserController.deleteUser);

        this.router.post("/follow", UserController.followUser);
        this.router.post("/unfollow", UserController.unfollowUser);
        this.router.post("/connect", UserController.connectUsers);
    }

    public getRouter(): Router {
        return this.router;
    }
}

export default UserRoutes;
