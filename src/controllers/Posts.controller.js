import { Tweet } from "../models/Posts.model.js";
import { uploadOnCloudinary, deletefromcloudinary } from "../utils/cloudinary.js";
import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apiresponse.js";
import verifypostowner from "../utils/checkforpostowner.js";
import { like } from "../models/like.model.js";
import mongoose from "mongoose";

const handleaddblogs = asynchandler(async (req, res) => {
    try {
        const { content, toptitle, tags, coverImageURL, isAnonymous } = req.body;
        // Ensure at least one of the required fields is provided
        if (!content && !toptitle && !coverImageURL) {
            return res.status(400).json(new ApiError(400, "Please provide at least one field to post"));
        }
        

        const blog = await Tweet.create({
            content,
            toptitle,
            tags,
            coverImageURL: coverImageURL ? coverImageURL : null, // if no image, keep it null or empty
            createdBy: {
                _id: isAnonymous ? "Anonymous" : req.user.userprofile.userId,
                username: isAnonymous ? "Anonymous" : req.user.userprofile.username,
                profileimg: isAnonymous ? "https://res.cloudinary.com/dhvkjanwa/image/upload/v1745684103/txflglvist3rnhwmygsc.jpg" : req.user.userprofile.profilepicture,
            },
        });

        if (!blog) {
            return res.status(501).json(new ApiError(501, {}, "Something Went Wrong While Posting Tweet"));
        }

        return res.status(201).json(new ApiResponse(201, blog, "Successfully Uploaded Tweet"));

    } catch (error) {
        console.error(error);
        return res.status(500).json(new ApiError(500, {}, `Server Error :: ${error}`));
    }
});

const getblogsbasic = asynchandler(async (req, res) => {
    const { q, limit } = req.query;
    let sortOption = {};
    if (q === "newestfirst") {
        sortOption = { createdAt: -1 };
    } else if (q === 'oldestfirst') {
        sortOption = { createdAt: 1 };
    }

    const limitOptions = parseInt(limit) || 10; // default will be 10 in case url not will hit

    try {
        const blogs = await Tweet.find().sort(sortOption).limit(limitOptions);
        return res.status(200).json(new ApiResponse(200, blogs, "Latest Tweets Fetched Successfully"));
    } catch (error) {
        console.error('Error fetching blogs:', error);
        return res.status(500).json(new ApiError(500, {}, "Internal Server Error Please Try Again"));
    }
});

const getblogsAdv = asynchandler(async (req, res) => {
    const { q, limit, page } = req.query;

    // Determine sort order
    let sortOption = {};
    if (q === "newestfirst") {
        sortOption = { createdAt: -1 };
    } else if (q === "oldestfirst") {
        sortOption = { createdAt: 1 };
    }

    const pageNumber = parseInt(page) || 1;
    const limitOptions = parseInt(limit) || 10;
    const skip = (pageNumber - 1) * limitOptions;

    const userId = req.user?.userprofile?.userId || null;

    try {
        const aggregationPipeline = [
            { $match: {} },
            { $sort: sortOption },
            { $skip: skip },
            { $limit: limitOptions },
            {
                $lookup: {
                    from: 'likes',
                    let: { tweetId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$tweet', '$$tweetId']
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
            {
                $lookup: {
                    from: 'subscriptions',
                    let: { ownerId: '$createdBy._id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$channel', '$$ownerId'] },
                                        { $eq: ['$subscriber', userId] }
                                    ]
                                }
                            }
                        },
                        { $project: { _id: 1 } }
                    ],
                    as: 'subscription'
                }
            },
            {
                $addFields: {
                    subscribedByCurrentUser: { $gt: [{ $size: '$subscription' }, 0] }
                }
            },
            {
                $lookup: {
                    from: 'comments',  // 🔥 Correct collection name
                    let: { tweetId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$postId', '$$tweetId']
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                commentCount: { $sum: 1 },
                            }
                        }
                    ],
                    as: 'commentsData' // ✅ Renamed to avoid confusion
                }
            },
            {
                $addFields: {
                    commentCount: { $ifNull: [{ $arrayElemAt: ['$commentsData.commentCount', 0] }, 0] }
                }
            },
            {
                $project: {
                    likes: 0,
                    subscription: 0,
                    commentsData: 0  // ✅ Hide raw comments array
                }
            }
        ];


        const blogs = await Tweet.aggregate(aggregationPipeline);
        const totalBlogs = await Tweet.countDocuments({});
        const totalPages = Math.ceil(totalBlogs / limitOptions);

        return res.status(200).json(new ApiResponse(200, {
            page: pageNumber,
            limit: limitOptions,
            totalPages,
            totalBlogs,
            blogs
        }, "Latest Tweets Fetched Successfully"));
    } catch (error) {
        console.error('Error fetching blogs:', error);
        return res.status(500).json(new ApiError(500, {}, "Internal Server Error Please Try Again"));
    }
});





const updateeditblogs = asynchandler(async (req, res) => {
    const _id = req.params.id;

    try {
        const lastblog = await Tweet.findById(_id);
        if (!lastblog) {
            return res
                .status(404)
                .json(new ApiError(404, {}, "This Tweet Not Found"));
        }

        // check the owner and current user is same or not 
        const verifyowner = verifypostowner(lastblog.createdBy._id, req.user._id)

        if (!verifyowner) {
            return res.status(401).json(new ApiError(401, {}, "You Are Not The Owner Of This Blog"))
        }

        const profileImgPath = req.files?.tweetthumbnail?.[0]?.path;
        const { content } = req.body;

        // Initialize blogsdata with the necessary fields
        const blogsdata = {
            content,
            createdBy: {
                _id: req.user._id,
                username: req.user.username,
                profileimg: req.user.avatar.url,
            }
        };

        if (profileImgPath) {
            const uploadedImage = await uploadOnCloudinary(profileImgPath);

            if (!uploadedImage) {
                return res.status(500).json(new ApiError(500, {}, "Failed to upload image"));
            }

            if (lastblog && lastblog.coverImageURL && lastblog.coverImageURL.public_id) {
                await deletefromcloudinary(lastblog.coverImageURL.public_id);
            }

            blogsdata.coverImageURL = {
                url: uploadedImage.url,
                public_id: uploadedImage.public_id
            };
        }

        const updatedblog = await Tweet.findByIdAndUpdate(_id, blogsdata, { new: true });

        if (!updatedblog) {
            return res.status(404).json(new ApiError(404, {}, "Tweet Not Found"));
        }

        return res.status(200).json(new ApiResponse(200, updatedblog, "Tweet Edited Successfully And Updated"));
    } catch (error) {
        console.error(error);
        return res.status(500).json(new ApiError(500, {}, "Internal Server Error Please Try Again"));
    }
});

const deleteblogs = asynchandler(async (req, res) => {
    const _id = req.params.id;

    try {
        // checking for user then 
        const lastblog = await Tweet.findById(_id);
        if (!lastblog) {
            return res
                .status(404)
                .json(new ApiError(404, {}, "This Tweet Not Found"));
        }

        // check the owner and current user is same or not 
        const verifyowner = verifypostowner(lastblog.createdBy._id, req.user._id)

        if (!verifyowner) {
            return res.status(401).json(new ApiError(401, {}, "You Are Not The Owner Of This Blog"))
        }

        const blogsresult = await Tweet.findByIdAndDelete(_id);
        if (!blogsresult) {
            return res.status(404).json(new ApiResponse(404, {}, "Some Error Occerd While Deleteing Video"));
        }
        const resdeletefromcloudinary = await deletefromcloudinary(blogsresult?.coverImageURL?.public_id);
        return res.status(200).json(new ApiResponse(200, {}, "Blog Deleted Successfully"));
    } catch (error) {
        console.error(error);
        return res.status(500).json(new ApiError(500, {}, "Internal Server Error Please Try Again"));
    }
});

const handlegetindividualblog = asynchandler(async (req, res) => {
    const _id = req.params.id;
    try {
        const blog = await Tweet.findById(_id);

        if (!blog) {
            return res.status(404).json(new ApiError(404, {}, "Your Requested Tweet Is Not Found"));
        }

        const likeCount = await like.countDocuments({ comment: _id })
        let likebyuserstate = false;
        if (req.user) {
            // Check if the user has liked the video
            const getlikebyuserstate = await like.findOne({ comment: _id, likedBy: req.user._id });
            likebyuserstate = !!getlikebyuserstate; // Convert to boolean
        }
        return res.status(200).json(new ApiResponse(200, { blog, likeCount, likebyuserstate }, "Tweet Fetched Successfully"));
    } catch (error) {
        console.error(error);
        return res.status(500).json(new ApiError(500, {}, "Internal Server Error Please Try Again"));
    }
});

export {
    handleaddblogs,
    getblogsbasic,
    updateeditblogs,
    deleteblogs,
    handlegetindividualblog,
    getblogsAdv,
};
