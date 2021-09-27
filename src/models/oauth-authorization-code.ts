import { Document, model, Schema, Types } from 'mongoose';

export interface IOAuthAuthorizationCode extends Document {
    authorizationCode: string;
    client: object;
    expiresAt: Date;
    id: Types.ObjectId;
    redirectUri: string;
    user: object;
}

const schema: Schema = new Schema({
    authorizationCode: { type: String },
    client: { type: Object },
    expiresAt: { type: Date },
    redirectUri: { type: String },
    user: { type: Object }
});

const dataModel = model<IOAuthAuthorizationCode>(
    'OAuthAuthorizationCode',
    schema,
    'oauth-authorization-codes'
);
export default dataModel;
