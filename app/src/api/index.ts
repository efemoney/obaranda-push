import {RequestHandler, Router} from "express";
import {InvalidUserError} from "../errors";
import * as comicsRoute from "./comics";
import * as usersRoute from "./users";


const debugLogHandler: RequestHandler = (req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}\n`);
  next();
};

const authHandler: RequestHandler = (req, res, next) => {

  const uid = req.header('Auth-Uid');

  if (!uid) {
    next(new InvalidUserError());
    return;
  }

  req.body.uid = uid;

  next();

};


const router: Router = Router();

if (process.env.NODE_ENV !== 'production') router.use(debugLogHandler);

router.get('/comics', comicsRoute.getAll);
router.get('/comics/:page(\\d+)', comicsRoute.getPage);
router.get('/comics/latest', comicsRoute.getLatest);
router.put('/users/token', authHandler, usersRoute.updateToken);
router.put('/users/page', authHandler, usersRoute.updateCurrentPage);

export default router;