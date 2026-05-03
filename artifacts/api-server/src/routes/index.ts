import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import groupsRouter from "./groups";
import photosRouter from "./photos";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(groupsRouter);
router.use(photosRouter);

export default router;
