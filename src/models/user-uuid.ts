import { Document, model, Schema, Types } from 'mongoose';

export interface IUserUuid extends Document {
    accessType: string;
    id: Types.ObjectId;
    userId: Types.ObjectId;
    uuid: string;
}

const schema: Schema = new Schema({
    accessType: { type: String, enum: ['app', 'card'], required: true },
    id: Schema.Types.ObjectId,
    userId: { type: Schema.Types.ObjectId, required: true },
    uuid: { type: String, required: true, unique: true }
});

const dataModel = model<IUserUuid>('UserUUID', schema, 'user-uuids');
export default dataModel;
