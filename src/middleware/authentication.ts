import jwt from "jsonwebtoken";
import { secretKey } from "../environment/environment";
import { Request, Response, NextFunction } from "express";


class Authentication {
  public authenticateToken(
    req: Request,
    res: Response<any, Record<string, any>>,
    next: NextFunction
  ): void {
    const token = req.headers.authorization?.split(" ")[1];
    const secret_key = secretKey || "";
    if (!token) {
      res.status(401).send("Unauthorized");
      return;
    }

    jwt.verify(token, secret_key, async (err: any, decoded: any) => {
      if (err) {
        res.status(403).send("Invalid token");
        return;
      }


      (req as any).userId = decoded.userId;
      next();
    });
  }
}

export default new Authentication();
