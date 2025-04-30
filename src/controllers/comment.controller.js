import mongoose from "mongoose"
import { ApiError } from "../utils/apierror.js"
import { ApiResponse } from "../utils/apiresponse.js"
import { asynchandler } from "../utils/asynchandler.js"
import { Comment } from "../models/comments.model.js"
import { Video } from "../models/Video.model.js"
import { Tweet } from "../models/Posts.model.js"
import verifypostowner from "../utils/checkforpostowner.js"

const getPostComments = asynchandler(async (req, res) => {
    const postId = req.params.postId;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json(new ApiError(400, {}, "Invalid ID format"));
    }

    const { q, limit, page } = req.query;

    let sortOptions = { createdAt: -1 };
    if (q === "oldestfirst") {
        sortOptions = { createdAt: 1 };
    }

    const pageNumber = parseInt(page) || 1;
    const limitOptions = parseInt(limit) || 10;
    const skip = (pageNumber - 1) * limitOptions;

    const userId = req.user?.userprofile?.userId || null;

    try {
        const Comments = await Comment.aggregate([
            { $match: { postId: new mongoose.Types.ObjectId(postId) } },
            { $sort: sortOptions },
            { $skip: skip },
            { $limit: limitOptions },
            {
                $lookup: {
                    from: 'likes',
                    let: { commentId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$comment', '$$commentId']
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                likeCount: { $sum: 1 },
                                likedByCurrentUser: {
                                    $max: {
                                        $cond: [{ $eq: ['$likedBy', userId] }, true, false]
                                    }
                                }
                            }
                        }
                    ],
                    as: 'likes'
                }
            },
            {
                $addFields: {
                    likeCount: { $ifNull: [{ $arrayElemAt: ['$likes.likeCount', 0] }, 0] },
                    likedByCurrentUser: userId ? { $ifNull: [{ $arrayElemAt: ['$likes.likedByCurrentUser', 0] }, false] } : false
                }
            },
            { $project: { likes: 0 } }
        ]);
        if (!Comments.length) {
            return res.status(404).json(new ApiError(404, {}, "Not Found"));
        }
        const totalComment = await Comment.countDocuments({ postId });
        const totalPages = Math.ceil(totalComment / limitOptions);

        return res.status(200).json(new ApiResponse(200, {
            page: pageNumber,
            limit: limitOptions,
            totalPages,
            totalComment,
            Comments
        }, "Comments Fetched Successfully"));
    } catch (error) {
        console.error('Error fetching Comments:', error);
        return res.status(500).json(new ApiError(500, {}, "Internal Server Error Please Try Again"));
    }
});


const addComment = asynchandler(async (req, res) => {
    // check login

    // check data 
    const postId = req.params.postId;
    //console.log(postId)
    if (!mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json(new ApiError(400, {}, "Invalid video ID format"));
    }

    const commenton = req.params.type
    //console.log(postId)
    const { content, username, profileimg } = req.body
    //console.log(req.user)
    if (!req.user.userprofile.userId) {
        return res.status(400).json(new ApiError(401, {}, "Pls Login"));
    }
    if (!content) {
        return res.status(401).json(new ApiError(401, {}, "Please Provide Content For Comment"));
    }
    if (!postId || !commenton) {
        return res.status(401).json(new ApiError(401, {}, "Please Provide Comment Type & PostID"));
    }

    try {
        if (commenton === "Video") {
            const video = await Video.findById(postId)
            if (!video) {
                return res.status(404).json(new ApiError(404, {}, `Your ${commenton} Is Not Found`));
            }
        } else if (commenton === "Post") {
            const tweet = await Tweet.findById(postId)
            if (!tweet) {
                return res.status(404).json(new ApiError(404, {}, `Your ${commenton} Is Not Found`));
            }
        } else {
            return res.status(404).json(new ApiError(404, {}, `Your ${commenton} Is Not Found`));
        }
    } catch (error) {
        console.log(error)
        return res.status(501).json(new ApiError(501, {}, "Internal Server Error"))
    }

    const comment = await Comment.create({
        content,
        commenton: commenton.toString(),
        postId,
        owner: {
            _id: req.user.userprofile.userId,
            username: username || req.user.userprofile.username,
            profileimg: profileimg || req.user.userprofile.profilepicture
        }
    });

    if (!comment) {
        return res.status(501).json(new ApiError(501, {}, "Error While Added Commnet"))
    }

    return res.status(201).json(new ApiResponse(201, comment, "Comment Posted SuccessFullly"))

})

const updateComment = asynchandler(async (req, res) => {
    const CommentId = req.params.commentId
    const { content } = req.body
    if (!content) {
        return res.status(401).json(new ApiError(401, {}, "Please Provide Content For Comment"));
    }

    try {
        const comment = await Comment.findById(CommentId);
        if (!comment) {
            return res.status(404).json(new ApiError(404, {}, "Comment Not Found"))
        }
        const verifyowner = verifypostowner(comment.owner, req.user._id)
        if (!verifyowner) {
            return res.status(401).json(new ApiError(401, {}, "You Are Not The Owner Of This Comment"))
        }
        const updateComment = await Comment.findByIdAndUpdate(CommentId, { content: content }, { new: true })
        if (!updateComment) {
            return res.status(501).json(new ApiError(501, {}, "Error While Updating Comment Pls Try Again"));
        }

        return res.status(201).json(new ApiResponse(201, updateComment, "Comment Updated SuccessFullly"));

    } catch (error) {
        console.log(error)
        return res.status(501).json(new ApiError(501, {}, "Internal Server Error"))
    }
})

const deleteComment = asynchandler(async (req, res) => {
    const CommentId = req.params.commentId

    try {
        const comment = await Comment.findById(CommentId);
        if (!comment) {
            return res.status(404).json(new ApiError(404, {}, "Comment Not Found"))
        }
        const verifyowner = verifypostowner(comment.owner, req.user._id)
        if (!verifyowner) {
            return res.status(401).json(new ApiError(401, {}, "You Are Not The Owner Of This Comment"))
        }

        const deletecomment = await Comment.findByIdAndDelete(CommentId);
        if (!deletecomment) {
            return res.status(501).json(new ApiError(501, {}, "Error While Updating Comment Pls Try Again"));
        }

        return res.status(201).json(new ApiResponse(201, {}, "Comment Deleted SuccessFullly"))

    } catch (error) {
        console.log(error)
        return res.status(501).json(new ApiError(501, {}, "Internal Server Error"))
    }
})

export {
    getPostComments,
    addComment,
    updateComment,
    deleteComment
}
