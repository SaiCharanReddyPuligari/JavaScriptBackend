import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema= new Schema(
    {
      videoFile: {
        type: {
          public_id: String,
          url: String,
        }, //cloudinary URL
        required: true,
      },
      thumbnail: {
        type: {
          public_id: String,
          url: String,
        }, 
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      description: {
        type: String, 
        required: true,
      },
      duration: {
        type: Number, //extracting duration from cloudinary URL
        required: true,
      },
      views: {
        type: Number, 
        default: 0,
      },
      isPublished:{
        type: Boolean,
        default: true,
      },
      owner:{
        type: Schema.Types.ObjectId,
        ref: "User",
      }
    }
)

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema)