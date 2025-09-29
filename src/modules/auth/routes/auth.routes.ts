import express, { Router } from 'express';
import AuthController from '../controller/auth.controller';

class AuthRoutes {
  private router: Router;
  //   private controller: UserController;

  constructor() {
    this.router = express.Router();
    // this.controller = new UserController();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post('/login', AuthController.login);
    this.router.post('/signup', AuthController.signup);
    // this.router.get('/logout', this.controller.logoutUser.bind(this.controller));
    // this.router.get('/logoutOfAllDevices', this.controller.logoutOfAllDevices.bind(this.controller));
    // this.router.post('/logoutUserOfAllDevices', this.controller.logoutUserOfAllDevices.bind(this.controller));
  }


  public getRouter(): Router {
    return this.router;
  }
}

export default AuthRoutes;
