import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pajoyRouter from "./pajoy";
import authRouter, { requireAuth } from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(requireAuth);
router.use(pajoyRouter);

export default router;
