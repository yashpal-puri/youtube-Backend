import { asyncHandler } from "../utils/asyncHandler.js"
import { apiError } from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js"
import { Comment } from "../models/comment.model"

const createComment = asyncHandler(async (req, res) => {
    try {
        const owner = req.user._id;
        const { content, videoId } = req.body
        if (!videoId || !content)
            throw new apiError(404, "All details are required to create comment!")

        const comment = await Comment.create({
            content,
            owner,
            video: videoId
        })

        if (!comment)
            throw new apiError(500, "Internal error in creating comment")

        res
            .status(200)
            .json(
                new apiResponse(200, comment, "Comment created successfully")
            )

    } catch (error) {
        throw new apiError(400, "Error in creation of comment " + error.message);
    }
})

const editComment = asyncHandler(async (req, res) => {
    try {
        const { cmtId, content } = req.body
        if (!cmtId || !content)
            throw new apiError(404, "Required details not found while editing the comment!")

        const comment = await Comment.findById(cmtId);
        if (req.user._id !== comment.owner)
            throw new apiError(401, "Unauthorized request to edit the comment")

        const newCmt = await Comment.findByIdAndUpdate(
            cmtId,
            {
                $set: {
                    content
                }
            },
            {
                new: true
            }
        )

        if (!newCmt)
            throw new apiError(500, "Internal error in updating the comment")

        res
            .status(200)
            .json(
                new apiResponse(200, newCmt, "Comment updated successfully!")
            )

    } catch (error) {
        throw new apiError(400, "Error in editing the comment!"+error.message);
    }
})

const deleteComment = asyncHandler(async (req, res) => {
    try {
        const cmtId = req.params.id
        if (!cmtId)
            throw new apiError(404, "Required detail cmtid not found while editing the comment!")

        const comment = await Comment.findById(cmtId);
        if (req.user._id !== comment.owner)
            throw new apiError(401, "Unauthorized request to edit the comment")

        const result = await Comment.findByIdAndDelete(cmtId)

        if (!result)
            throw new apiError(500, "Internal error in deleting the comment")

        res
            .status(200)
            .json(
                new apiResponse(200, result, "Comment deleted successfully!")
            )

    } catch (error) {
        throw new apiError(400, "Error in deleting the comment!"+error.message);
    }
})

const getUserComments = asyncHandler(async (req, res) => {
    try {
        const comments = await Comment.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(req.user._id)
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "owner",
                    foreignField: "_id",
                    as: "videos",
                    pipeline: [
                        {
                            $project: {
                                owner: 1,
                                title: 1,
                                duration: 1,
                                views: 1,
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    video: {
                        $first: "$videos"
                    }
                }
            }
        ])

        if(!comments)
            throw new apiError(500, "Unable to fetch the comments!")

        res
            .status(200)
            .json(
                new apiResponse(200,comments,"Comments fetched successfully!")
            )
    } catch (error) {
        throw new apiResponse(400, "Error in getting the user comments"+error.message)
    }
})

const getVideoComments = asyncHandler(async (req,res)=>{
    try {
        const videoId = req.params.id;
        if(!videoId)
            throw new apiError(404,"Video id not found!")
    
        const comments = Comment.aggregate([
            {
                $match: {
                    video: new mongoose.Types.ObjectId(videoId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "commentor",
                    pipeline: [
                        {
                            $project: {
                                username: 1,
                                fullname: 1
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    owner: {
                        $first: "commentor"
                    }
                }
            }
        ])
    
        if(!comments){
            throw new apiError(500,"Internal error in finding the comments for video")
        }
    
        res
            .status(200)
            .json(
                new apiResponse(200,comments,"Comments fetched successfully!")
            )
    } catch (error) {
        throw new apiError(400,"Some error in finding the comments for a particular video"+error.message);
    }
})
export {
    createComment,
    editComment,
    deleteComment,
    getUserComments,
    getVideoComments
}