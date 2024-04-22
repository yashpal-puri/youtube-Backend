import { Subscription } from "../models/subscription.model";
import { apiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import {apiResponse} from "../utils/apiResponse"

const toggleSubscription = asyncHandler( async (req,res) =>{
    try {
        const {channelId} = req.body
        if(!channelId)
            throw new apiError(404,"Channelid not found")
        const subscriberId = req.user._id;
        
        const isSubscribed = await Subscription.findOne({
            subscriber: subscriberId,
            channel: channelId
        })

        if(isSubscribed){
            const unsubscribeChannelResult = await Subscription.findOneAndDelete({
                subscriber: subscriberId,
                channel: channelId
            })
            if(!unsubscribeChannelResult)
                throw new apiError(500,"Internal Error in unsubscribing")

            res
                .status(200)
                .json(
                    new apiResponse(200,{},"Channel unsubscribed successfully")
                )
        }
        else{
            const subscribeChannelResult = await Subscription.create({
                subscriber: subscriberId,
                channel: channelId
            })
            if(!subscribeChannelResult)
                throw new apiError(500,"Internal Error in subscribing")
            res
                .status(200)
                .json(
                    new apiResponse(200,subscribeChannelResult,"Channel subscribed  successfully!")
                )
        }
        
    } catch (error) {
        throw new apiError(400, "error in subscribing toggle "+error.message);
    }   
    
})



export {
    toggleSubscription,
    
}