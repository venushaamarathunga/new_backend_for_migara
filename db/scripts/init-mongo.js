db['issued-uuids'].insertMany([
    {
        "_id" : ObjectId("5db6b41999c8ce624cea65aa"),
        "uuid" : "d1f5b88f-d92d-4bf3-ac2b-ae71c56d47e8",
        "usedIn" : "card"
    },
    {
        "_id" : ObjectId("5db6b42c99c8ce624cea65b8"),
        "uuid" : "59fb4903-4922-4c6e-9755-29472bec3e38",
        "usedIn" : "app"
    },
    {
        "_id" : ObjectId("5db6b43e99c8ce624cea65c6"),
        "uuid" : "768d939d-29e1-4336-9156-0c4581cdeda6",
        "usedIn" : "app"
    },
    {
        "_id" : ObjectId("5db6b45599c8ce624cea65d5"),
        "uuid" : "c790e736-0b7b-4c34-9275-d62c8f58c20e",
        "usedIn" : "app"
    },
    {
        "_id" : ObjectId("5db6b46599c8ce624cea65e4"),
        "uuid" : "b6dc9190-7f64-4643-a183-ba6f81bebc6e",
        "usedIn" : "app"
    },
    {
        "_id" : ObjectId("5dbeff7c4119fb220891307b"),
        "uuid" : "8604ecee-1c6a-4a7d-a1ec-83038b4e4a03",
        "usedIn" : "app",
        "__v" : 0
    },
    {
        "_id" : ObjectId("5e09e01aeea7253a908fb309"),
        "uuid" : "01db2f0c-e4e3-4cf9-a512-d68b07c0ebc1",
        "usedIn" : "app",
        "__v" : 0
    }
]);

db['oauth-clients'].insertMany([
    {
        "_id" : ObjectId("5db69f1199c8ce624cea5dd8"),
        "clientId" : "public-client",
        "isPublic" : true,
        "grants" : [
            "authorization_code", 
            "refresh_token"
        ],
        "__v" : 1,
        "redirectUris" : []
    },
    {
        "_id" : ObjectId("5dd4d9e07ecd5c7f37548176"),
        "clientId" : "flava-portal",
        "clientSecret" : "8QLW2XFWZ2Izt0jf",
        "grants" : [ 
            "password", 
            "refresh_token"
        ]
    },
    {
        "_id" : ObjectId("5e05b448eca3842c778d6db9"),
        "clientId" : "terminal-client-1",
        "isPublic" : true,
        "grants" : [ 
            "refresh_token", 
            "client_credentials"
        ],
        "__v" : 1,
        "redirectUris" : []
    }
]);

db.users.insertMany([
    {
        "_id" : ObjectId("5dbeffa04119fb220891307d"),
        "roles" : [ 
            "APP_USER"
        ],
        "deviceId" : "qwerer",
        "mobileNumber" : "0700000001",
        "name" : "Silva",
        "__v" : 0
    },
    {
        "_id" : ObjectId("5dbf2de6165f125978fc9d3d"),
        "deviceId" : "default",
        "mobileNumber" : "0700000002",
        "__v" : 0,
        "name" : "Nimal",
        "roles" : [ 
            "MINICARD_USER"
        ]
    },
    {
        "_id" : ObjectId("5dd4f4af7ecd5c7f37548776"),
        "name" : "Kamal",
        "password" : "ef51306214d9a6361ee1d5b452e6d2bb70dc7ebb85bf9e02c3d4747fb57d6bec",
        "roles" : [ 
            "PORTAL_USER"
        ],
        "username" : "kamal"
    }
]);

db['user-uuids'].insertMany([
    {
        "_id" : ObjectId("5dbeffa04119fb220891307e"),
        "accessType" : "app",
        "userId" : ObjectId("5dbeffa04119fb220891307d"),
        "uuid" : "8604ecee-1c6a-4a7d-a1ec-83038b4e4a03",
        "__v" : 0
    },
    {
        "_id" : ObjectId("5dbf2de62f3bc53a3c5f8b9f"),
        "accessType" : "card",
        "userId" : ObjectId("5dbf2de6165f125978fc9d3d"),
        "uuid" : "d1f5b88f-d92d-4bf3-ac2b-ae71c56d47e8",
        "__v" : 0
    },
    {
        "_id" : ObjectId("5de60cfa7ecd5c7f3754ab16"),
        "accessType" : "portal",
        "userId" : ObjectId("5dd4f4af7ecd5c7f37548776"),
        "uuid" : "7495ebd0-f83b-4959-a650-d3a0a13360bd"
    }
]);

db['user-redeemables'].insertMany([
    {
        "_id" : ObjectId("5e01c889da30a63504db543a"),
        "userId" : ObjectId("5dbf2de6165f125978fc9d3d"),
        "vendorId" : ObjectId("5dd7884e7ecd5c7f37548f09"),
        "thumbnailImageUrl" : "https://www.google.com/search?q=images&rlz=1C1CHBD_enLK873LK873&sxsrf=ACYBGNS34fna4fwvvO275hx41JI7PoZ7Dw:1577175249339&tbm=isch&source=iu&ictx=1&fir=zXwrfQvPsQ5dwM%253A%252CShwNVOdFBcmkxM%252C_&vet=1&usg=AI4_-kRfetVW6X9jb1moRFiMpyFoJA8UsA&sa=X&ved=2ahUKEwj5ufDT683mAhUC6nMBHX",
        "largeImageUrl" : "https://www.google.com/search?q=images&rlz=1C1CHBD_enLK873LK873&sxsrf=ACYBGNS34fna4fwvvO275hx41JI7PoZ7Dw:1577175249339&tbm=isch&source=iu&ictx=1&fir=zXwrfQvPsQ5dwM%253A%252CShwNVOdFBcmkxM%252=X&ved=2ahUKEwj5ufDT683mAhUC6nMBHX_LCkoQ9QEwAHoECAoQLw#imgrc=tUWsPKGJuIoBeM:&vet=1",
        "briefDescription" : "brief Description  test",
        "detailedDescription" : "detailed Description test",
        "expiryDate" : ISODate("2020-10-05T14:48:00.000Z"),
        "redeemStatus" : "UNLOCKED"
    },
    {
        "_id" : ObjectId("5e01dcf0da30a63504db543c"),
        "userId" : ObjectId("5dbf2de6165f125978fc9d3d"),
        "vendorId" : ObjectId("5dd7884e7ecd5c7f37548f09"),
        "thumbnailImageUrl" : "ttps://www.google.com/search?q=images&rlz=1C1CHBD_enLK873LK873&sxsrf=ACYBGNS34f",
        "largeImageUrl" : "gle.com/search?q=images&rlz=1C1CHBD_enLK873LK873&sxsrf=ACYBGNS34fna4fwvvO275hx41JI7PoZ7Dw:1577175249339&tbm=isch&source=iu&ictx=1&fir=zXwrfQvPsQ5dwM%253A%252CShwNVOdFBcmkxM%252=X&ved=2ahUKEwj5ufDT683mAhUC6nMBHX_LCkoQ9QEwAHoECAoQLw#imgrc=tUWsPKGJuIoBeM:&vet=1\",",
        "briefDescription" : "brief Description test 2",
        "detailedDescription" : "detailed Description test 2",
        "expiryDate" : ISODate("2020-10-05T14:48:00.000Z"),
        "redeemStatus" : "UNLOCKED"
    },
    {
        "userId": ObjectId("5dbeffa04119fb220891307d"),
        "thumbnailImageUrl": "https://cdn.pixabay.com/photo/2013/07/21/13/00/rose-165819_1280.jpg",
        "largeImageUrl": "https://storage.googleapis.com/flava-dev/vendors/Super%20Duper%20Burgers/large_image_burger_card.png",
        "briefDescription": "Brief Description",
        "detailedDescription": "Detailed Description",
        "expiryDate": ISODate("2020-10-05T14:48:00.000Z"),
        "redeemStatus": "UNLOCKED"
    }
]);

db.vendors.insertMany([
    {
		"_id": ObjectId("5dd7884e7ecd5c7f37548f09"),
		"fullName": "Zara Inc.",
		"givenName": "Zara",
		"thumbnailImageUrl": "https://storage.googleapis.com/flava-dev/vendors/ZARA/zara_card.png"
	},
	{
		"_id": ObjectId("5dd7885c7ecd5c7f37548f17"),
		"fullName": "Super Duper Burgers Pvt Ltd",
		"givenName": "Super Duper Burgers",
		"thumbnailImageUrl": "https://storage.googleapis.com/flava-dev/vendors/Super%20Duper%20Burgers/super_duper_burgers.png"
	}
]);

db['vendor-auth-clients'].insertMany([
    {
        "_id" : ObjectId("5e05b5d6eca3842c778d6e39"),
        "clientId" : "terminal-client-1",
        "vendorId" : ObjectId("5dd7884e7ecd5c7f37548f09")
    }
]);

db['vendor-customers'].insertMany([
    {
        "_id" : ObjectId("5dd7ad3f7ecd5c7f375497a5"),
        "userId" : ObjectId("5dbf2de6165f125978fc9d3d"),
        "vendorId" : ObjectId("5dd7884e7ecd5c7f37548f09"),
        "createdAt" : ISODate("2019-12-27T09:12:24.531Z"),
        "points" : 0,
        "totalPointsBurned" : 0,
        "totalPointsEarned" : 0,
        "pointsSchemeId" : ObjectId("5e05ce51eca3842c778d78ca"),
        "updatedAt" : ISODate("2020-01-01T11:17:56.340Z")
    },
    {
        "_id" : ObjectId("5e0c6e2e1c695c40710ef338"),
        "userId" : ObjectId("5dbf2de6165f125978fc9d3d"),
        "vendorId" : ObjectId("5dd7885c7ecd5c7f37548f17"),
        "createdAt" : ISODate("2019-12-28T09:12:24.531Z"),
        "points" : 0,
        "totalPointsBurned" : 0,
        "totalPointsEarned" : 0,
        "pointsSchemeId" : ObjectId("5e05ce51eca3842c778d78ca"),
        "updatedAt" : ISODate("2020-01-01T08:04:33.383Z")
    },
    {
		"userId": ObjectId("5dbeffa04119fb220891307d"),
		"vendorId": ObjectId("5dd7884e7ecd5c7f37548f09"),
        "createdAt" : ISODate("2019-12-28T09:12:24.531Z"),
		"points": 0,
		"totalPointsEarned": 0,
		"totalPointsBurned": 0
	},
	{
		"userId": ObjectId("5dbeffa04119fb220891307d"),
		"vendorId": ObjectId("5dd7885c7ecd5c7f37548f17"),
        "createdAt" : ISODate("2019-12-29T09:12:24.531Z"),
		"points": 0,
		"totalPointsEarned": 0,
		"totalPointsBurned": 0
	}
]);

db['vendor-managers'].insertMany([
    {
        "_id" : ObjectId("5dd789227ecd5c7f37548f44"),
        "userId" : ObjectId("5dd4f4af7ecd5c7f37548776"),
        "vendorId" : ObjectId("5dd7884e7ecd5c7f37548f09")
    }
]);

db['vendor-points-schemes'].insertMany([
    {
        "_id" : ObjectId("5e05ce51eca3842c778d78ca"),
        "vendorId" : ObjectId("5dd7884e7ecd5c7f37548f09"),
        "type" : "FIXED",
        "default" : true,
        "fixed" : 5
    }
]);
