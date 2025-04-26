import mongoose, { Schema } from "mongoose";

const TweetSchema = new Schema({
    content: {
        type: String,
        required: true
    },
    coverImageURL: {
        url: {
            type: String,
            required: true,
        },
        public_id: {
            type: String,
            required: true,
        }
    },
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