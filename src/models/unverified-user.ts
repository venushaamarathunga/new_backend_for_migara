import { Document, model, Schema, Types } from 'mongoose';

export interface IUnverifiedUser extends Document {
    accessType: string;
    challenge: string;
    deviceId: string;
    id: Types.ObjectId;
    mobileNumber: string;
    name: string;
    uuid: string;
    verificationCode: string;
}

const schema: Schema = new Schema({
    accessType: { type: String, enum: ['app', 'card'], required: true },
    challenge: { type: String, required: true },
    deviceId: { type: String, required: true },
    id: Schema.Types.ObjectId,
    mobileNumber: { type: String, required: true },
    name: { type: String, required: true },
    uuid: { type: String, required: true },
    verificationCode: { type: String, required: true }
});

const dataModel = model<IUnverifiedUser>('UnverifiedUser', schema, 'unverified-users');
export default dataModel;
