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
    sizeBytes: { type: Number, min: 1 },

    durationSec: { type: Number, min: 0, default: null },
    width: { type: Number, min: 1, default: null },
    height: { type: Number, min: 1, default: null },

    status: {
      type: String,
      enum: ['ready', 'hidden'],
      default: 'hidden',
      index: true,
    },

    // --- AI Processing Fields ---
    analyzed: { type: Boolean, default: false },
    analysisStatus: {
      type: String,
      enum: ['pending', 'processing', 'done', 'failed'],
      default: 'pending',
    },
    analysisRefId: {
      type: Schema.Types.ObjectId,
      ref: 'VideoAnalysis',
      default: null,
    },
    objectsTop: [
      {
        class: { type: String },
        count: { type: Number },
      },
    ],
    claimedAt: { type: Date, default: null }, // worker AI claim timestamp
    workerId: { type: String, default: null }, // optional worker tracking
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export type VideoDoc = InferSchemaType<typeof VideoSchema>;
export type VideoModel = Model<VideoDoc>;

const Video = (models.Video as VideoModel) || model<VideoDoc>('Video', VideoSchema);
export default Video;
