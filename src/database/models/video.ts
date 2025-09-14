import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose';

const VideoSchema = new Schema(
    {
        ownerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },

        title: { type: String, trim: true, default: '' },
        address: { type: String, trim: true, default: "" },

        blobUrl: { type: String, required: true },
        downloadUrl: { type: String, required: true },
        blobPath: { type: String, required: true, unique: true },

        contentType: { type: String, required: true },
        sizeBytes: { type: Number, required: false, min: 1 },

        // Optional technical metadata
        durationSec: { type: Number, min: 0, default: null },
        width: { type: Number, min: 1, default: null },
        height: { type: Number, min: 1, default: null },

        // Keep status only if you want a workflow
        status: {
            type: String,
            enum: ['ready', 'hidden'],
            default: 'hidden',
            index: true,
        },
    },
    {
        timestamps: true, // adds createdAt + updatedAt automatically
        versionKey: false,
        toJSON: {
            virtuals: true,
        },
        toObject: { virtuals: true },
    }
);

export type VideoDoc = InferSchemaType<typeof VideoSchema>;
export type VideoModel = Model<VideoDoc>;

const Video = (models.Video as VideoModel) || model<VideoDoc>('Video', VideoSchema);
export default Video;
