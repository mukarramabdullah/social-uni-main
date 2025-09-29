import express, { Express, Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import cors from "cors";
const cookieParser = require("cookie-parser");
import RoutesHelper from "../routes/base.routes";
import path from "path";
import connectDB from "../../database/connection.db";
import AuthRoutes from "../../modules/auth/routes/auth.routes";
import UserRoutes from "../../modules/user/routes/user.routes";



class App {
  private app: Express;
  private helper: typeof RoutesHelper;

  constructor() {
    this.app = express();
    this.helper = RoutesHelper;
    this.accessControl();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.connectToMongo();
    this.startServer();
  }

  private accessControl() {
    this.app.use(cors({ origin: true }));
    this.app.use(cookieParser());
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-Requested-With, application/json");
      next();
    });

  }

  private connectToMongo() {
    connectDB();
  }

  private initializeMiddleware() {
    this.app.use(bodyParser.json({ limit: '50mb' }));;
    this.app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
    this.app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'assets', 'uploads')));
  }

  private initializeRoutes(): void {
    const routes: any[] = [
      //App
      UserRoutes

      //Admin


    ];

    const openRoutes: any[] = [
      AuthRoutes
    ]; //non authenticated routes


    this.app.get("/", (req: Request, res: Response) => {
      res.json({
        message: `App is running `,
        format: `${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
        time: `${new Date()}`,
      });
    });

    this.helper.initializeRoutes(this.app, true, routes);
    this.helper.initializeRoutes(this.app, false, openRoutes);

    // Error handling middleware should be placed after all other middleware and routes
    this.app.use(this.handleErrors.bind(this));
  }

  private async startServer(): Promise<void> {
    const port = process.env.PORT || 3001;
    this.app.listen(port, () => {
      console.log(`path:${path.join(__dirname, '..', '..', 'assets', 'uploads')}`);
      console.log(`Server is running on port ${port}`);
    });
  }

  private handleErrors(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    console.error(err.stack);
    res.status(500).send("Something went wrong!");
  }
}

export default App;

