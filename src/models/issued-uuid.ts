import { Document, model, Schema, Types } from 'mongoose';

export interface IIssuedUuid extends Document {
    id: Types.ObjectId;
    usedIn: string;
    uuid: string;
}

const schema: Schema = new Schema({
    id: Schema.Types.ObjectId,
    usedIn: { type: String, required: true, enum: ['app', 'card'] },
    uuid: { type: String, required: true, unique: true }
});

const dataModel = model<IIssuedUuid>('IssuedUuid', schema, 'issued-uuids');
export default dataModel;
