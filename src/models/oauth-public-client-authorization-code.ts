import { Document, model, Schema, Types } from 'mongoose';

export interface IOAuthPublicClientAuthorizationCode extends Document {
    authorizationCode: string;
    challenge: string;
    client: object;
    expiresAt: Date;
    id: Types.ObjectId;
    scope: string;
}

const schema: Schema = new Schema({
    authorizationCode: { type: String, index: true },
    challenge: { type: String },
    client: { type: Object },
    expiresAt: { type: Date },
    scope: { type: String }
});

const dataModel = model<IOAuthPublicClientAuthorizationCode>(
    'OAuthPublicClientAuthorizationCode',
    schema,
    'oauth-public-client-authorization-codes'
);
export default dataModel;
