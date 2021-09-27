import { Document, model, Schema, Types } from 'mongoose';

export interface IUser extends Document {
    deviceId: string;
    id: Types.ObjectId;
    mobileNumber: string;
    name: string;
    roles: string[];
}

const userSchema: Schema = new Schema({
    deviceId: { type: String, required: true },
    id: Schema.Types.ObjectId,
    mobileNumber: { type: String, required: true },
    name: { type: String, required: true },
    roles: [{ type: String, enum: ['MINICARD_USER', 'APP_USER'], required: true }]
});

userSchema.index({ mobileNumber: 1, deviceId: 1 }, { unique: true });

const dataModel = model<IUser>('User', userSchema, 'users');
export default dataModel;
