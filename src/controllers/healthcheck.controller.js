import { like } from "../models/like.model.js"
import { Comment } from "../models/comments.model.js"
import { ApiError } from "../utils/apierror.js"
import { ApiResponse } from "../utils/apiresponse.js"
import { asynchandler } from "../utils/asynchandler.js"
import { Video } from "../models/Video.model.js"
const healthcheck = asynchandler(async (req, res) => {
    // console.log("Health Cheack :: GOOD");

    try {
        const totallike = await like.countDocuments({});
        const totalComments = await Comment.countDocuments({});


        return res.status(200).json(new ApiResponse(200, {
            Stateofwholeapp: {
                totalComments,
                totallike,
            },
        }, "Health :: All System Are Healthy"));
    } catch (error) {
        console.error('Error in health check:', error);
        return res.status(500).json(new ApiError(500, {}, "Internal Server Error"));
    }
});

export {
    healthcheck
}