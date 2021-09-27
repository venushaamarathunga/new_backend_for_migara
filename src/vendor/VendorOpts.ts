export interface VendorOpts {
    id?: string;
    givenName: string;
    fullName: string;
    thumbnailImage: string;
    terminalImage: string;
    storageBucket: string;
    pointSchemes: VendorPoinstSchemeOpts[];
    pin?: string;
}

export interface VendorPoinstSchemeOpts {
    type: string;
    value: number;
    criteria?: any;
}
