import mongoose, { Schema } from "mongoose";

const TweetSchema = new Schema({
    content: {
        type: String,
    },
    toptitle: {
        type: String,
    },
    coverImageURL: {
        type: String,
    },
    tags: String,
    createdBy: {
        _id: {
            type: String,
        },
        username: {
            type: String
        },
        profileimg: {
            type: String
        }
    },
},
    {
        timestamps: true
    })

export const Tweet = mongoose.model("Tweet", TweetSchema)