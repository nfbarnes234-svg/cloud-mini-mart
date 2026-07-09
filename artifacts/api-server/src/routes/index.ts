import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import customersRouter from "./customers";
import salesRouter from "./sales";
import expensesRouter from "./expenses";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(categoriesRouter);
router.use(productsRouter);
router.use(customersRouter);
router.use(salesRouter);
router.use(expensesRouter);
router.use(dashboardRouter);
router.use(reportsRouter);

export default router;
