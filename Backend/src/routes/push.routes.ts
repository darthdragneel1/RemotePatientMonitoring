import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { saveSubscription, removeSubscription, getVapidPublicKey, getAlerts } from "../controllers/push.controller";

export const pushRouter = Router();

pushRouter.use(requireAuth);

pushRouter.get("/vapid-public-key", getVapidPublicKey);
pushRouter.get("/alerts", getAlerts);
pushRouter.post("/subscribe", saveSubscription);
pushRouter.post("/unsubscribe", removeSubscription);
