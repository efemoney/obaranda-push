import {Router} from "express";
import * as disqusRoute from "./disqus";

const router: Router = Router();

router.get('/disqus/oauth/success', disqusRoute.oauthSuccess);

export default router;