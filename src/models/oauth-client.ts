import { Document, model, Schema, Types } from 'mongoose';

export interface IOAuthClient extends Document {
    accessTokenLifetime?: number;
    clientId: string;
    clientSecret: string;
    grants: string[];
    id: Types.ObjectId;
    isPublic: boolean;
    redirectUris: string[];
    refreshTokenLifetime?: number;
    tempClientSecret: { clientSecret: string; expiresAt: Date };
}

const schema: Schema = new Schema({
    accessTokenLifetime: { type: Number },
    clientId: { type: String },
    clientSecret: { type: String },
    grants: { type: Array },
    isPublic: { type: Boolean },
    redirectUris: { type: Array },
    refreshTokenLifetime: { type: Number },
    tempClientSecret: { type: Object }
});

const dataModel = model<IOAuthClient>('OAuthClient', schema, 'oauth-clients');
export default dataModel;
