// models/User.ts
import { Schema, model, models, type Model, type InferSchemaType, type HydratedDocument } from "mongoose";

const UserSchema = new Schema(
    {
        // Remove the real `id` field entirely
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100,
        },
        email: {
            type: String,
            required: true,
            unique: true,      // keep this; it will create a unique index
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
            index: true,
        },
        hashedPassword: {
            type: String,
            required: true,
            minlength: 60,     // bcrypt = 60 chars
        },

        role: { type: String, enum: ["admin", "moderator", "general"], default: "general", index: true },
        isSuspended: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        versionKey: false,
        toJSON: {
            virtuals: true,    // exposes the virtual `id` (stringified _id)
            transform: (_doc, ret) => {
                delete (ret as any).hashedPassword;
                return ret;
            },
        },
        toObject: { virtuals: true },
    }
);

// You already set unique at path level; this line is redundant, so omit it
// UserSchema.index({ email: 1 }, { unique: true });

export type User = InferSchemaType<typeof UserSchema>;               // plain shape
export type UserDoc = HydratedDocument<User>;                        // document instance
export type UserModel = Model<User>;                                 // model type

const User = (models.User as UserModel) || model<User, UserModel>("User", UserSchema);
export default User;
