import { Tweet } from "../models/Posts.model.js";
import { ApiError } from "../utils/apierror.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { asynchandler } from "../utils/asynchandler.js";
const getTrendingTags = asynchandler(async (req, res) => {
    try {
        const recentPeriod = new Date();
        recentPeriod.setDate(recentPeriod.getDate() - 2);

        const fallbackPeriod = new Date();
        fallbackPeriod.setDate(fallbackPeriod.getDate() - 365);

        const getTagsPipeline = (dateFilter) => [
            { $match: { createdAt: { $gte: dateFilter } } },
            { $unwind: "$tags" },
            { $group: { _id: "$tags", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            { $project: { _id: 0, tag: "$_id" } }
        ];

        // Try recent tags
        let tags = await Tweet.aggregate(getTagsPipeline(recentPeriod));

        // Fallback to 1-year if none found
        if (tags.length === 0) {
            tags = await Tweet.aggregate(getTagsPipeline(fallbackPeriod));
        }

        if (tags.length === 0) {
            throw new ApiError(404, "No trending tags available");
        }

        // Extract and optionally split comma-separated tags
        const tagNames = tags.flatMap(item =>
            item.tag.includes(",") ? item.tag.split(",").map(t => t.trim()) : [item.tag]
        );

        // Log trending tags for debug
        // console.log("[Trending Tags]", tagNames);

        return res.status(200).json(
            new ApiResponse(200, tagNames, "Trending tags fetched successfully")
        );

    } catch (error) {
        console.error("Error fetching trending tags:", error);

        if (error instanceof ApiError) {
            return res.status(error.statusCode).json(error);
        }

        return res.status(500).json(
            new ApiError(500, "Error while fetching trending tags. Please try again later")
        );
    }
});


export {
    getTrendingTags
}