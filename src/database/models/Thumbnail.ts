import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose';

const ThumbnailSchema = new Schema(
    {
        videoId: {
            type: Schema.Types.ObjectId,
            ref: 'Video',
            required: true,
            index: true,
        },

        // Blob storage info
        url: { type: String, required: true }, // public URL to the thumbnail
        path: { type: String, required: true, unique: true }, // e.g., /thumbs/video123_5s.jpg

        // Dimensions (optional, can be null if not measured)
        width: { type: Number, min: 1, default: null },
        height: { type: Number, min: 1, default: null },

        // Mark a thumbnail as the "cover" image
        isCover: { type: Boolean, default: false, index: true },

        // (Optional) timecode position in seconds where this frame was taken
        timecodeSec: { type: Number, min: 0, default: null },
    },
    {
        timestamps: true,   // adds createdAt + updatedAt
        versionKey: false,  // removes __v
        toJSON: {
            virtuals: true,
        },
        toObject: { virtuals: true },
    }
);

// Ensure only one cover thumbnail per video
ThumbnailSchema.index(
    { videoId: 1, isCover: 1 },
    { unique: true, partialFilterExpression: { isCover: true } }
);

export type ThumbnailDoc = InferSchemaType<typeof ThumbnailSchema>;
export type ThumbnailModel = Model<ThumbnailDoc>;

const Thumbnail =
    (models.Thumbnail as ThumbnailModel) ||
    model<ThumbnailDoc>('Thumbnail', ThumbnailSchema);

export default Thumbnail;
