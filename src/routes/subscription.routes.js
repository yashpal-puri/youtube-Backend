import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { 
    getSubscribedChannels,
    getSubscriberList,
    toggleSubscription,
    
    } from "../controllers/subscription.controller.js";

const router= Router();

router.route("/toggle-subscription/:id").post(verifyJWT,toggleSubscription);
router.route("/get-subscribers").get(verifyJWT,getSubscriberList);
router.route("/get-subscribed-channels").get(verifyJWT,getSubscribedChannels);

export default router;