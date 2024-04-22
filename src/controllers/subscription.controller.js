import { Subscription } from "../models/subscription.model.js";
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {apiResponse} from "../utils/apiResponse.js"
import mongoose from "mongoose";

const toggleSubscription = asyncHandler( async (req,res) =>{
    try {
        const channelId = req.params.id
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

const getSubscriberList = asyncHandler(async (req,res)=>{
    try {
        const channel= await Subscription.aggregate([
            {
              $match: {
                channel: new mongoose.Types.ObjectId(req.user._id)
              }
            },
            {
              $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                  {
                    $project: {
                      username: 1,
                      fullname: 1,
                      avatar: 1,
                      email: 1,
                    }
                  }        
                ]
              }
            },
            {
              $addFields: {
                subs: {
                  $first: "$subscriber"
                }
              }
            }
          ])
    
        const subscriberList = channel?.map(channel => channel.subs);
        if(!subscriberList)
          throw new apiError(500,"Some error in finding the subscribers")
    
        res
          .status(200)
          .json(
            new apiResponse(200,subscriberList,"Subscriber fetched successfully")
          )
    } catch (error) {
        throw new apiError(400, "error in fetching the subscribers");
    }
})
const getSubscribedChannels = asyncHandler(async (req,res)=>{
    try {
        const channel= await Subscription.aggregate([
            {
              $match: {
                subscriber: new mongoose.Types.ObjectId(req.user._id)
              }
            },
            {
              $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channels",
                pipeline: [
                  {
                    $project: {
                      username: 1,
                      fullname: 1,
                      avatar: 1,
                      email: 1,
                    }
                  }        
                ]
              }
            },
            {
              $addFields: {
                subs: {
                  $first: "$channels"
                }
              }
            }
          ])
    
        const subscribedList = channel?.map(channel => channel.subs);
        if(!subscribedList)
          throw new apiError(500,"Some error in finding the subscribed channels")
    
        res
          .status(200)
          .json(
            new apiResponse(200,subscribedList,"Subscribed channels fetched successfully")
          )
    } catch (error) {
        throw new apiError(400, "error in fetching the subscribed channels");
    }
})




export {
    toggleSubscription,
    getSubscriberList,
    getSubscribedChannels,
    
}