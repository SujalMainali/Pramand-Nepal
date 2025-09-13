// models/Session.ts
import { Schema, model, models, type InferSchemaType } from "mongoose";

const SessionSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        tokenHash: { type: String, required: true, unique: true },
        expiresAt: { type: Date, required: true, index: true },
        userAgent: { type: String },
        ip: { type: String },
    },
    { timestamps: true, versionKey: false }
);

export type Session = InferSchemaType<typeof SessionSchema>;

const Session = models.Session || model<Session>("Session", SessionSchema);
export default Session;
