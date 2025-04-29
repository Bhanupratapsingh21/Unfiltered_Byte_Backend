import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const commentSchema = new Schema(
    {
        content: {
            type: String,
            required: true
        },
        commenton: {
            type: String,
            enum: ['Video', 'Post'],
            required: true
        },
        postId: {
            type: Schema.Types.ObjectId,
            required: true
        },
        owner: {
            _id: {
                type: String,
                required : true
            },
            username: {
 
                type: String,
                required : true
            },
            profileimg: {

                type: String,
                required : true
            }
        }
    },
    {
        timestamps: true
    }
)

commentSchema.plugin(mongooseAggregatePaginate)

export const Comment = mongoose.model("Comment", commentSchema) 