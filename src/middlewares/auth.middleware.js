import { Client, Account } from "appwrite";
import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/apierror.js";
import { client } from "../Appwrite_Services/appwrite.js";
import UserProfileService from "../Appwrite_Services/userProfileService.js";

export const verifyjwt = asynchandler(async (req, res, next) => {
    const rawToken = req.headers.authorization;
    const jwt = rawToken?.replace("Bearer ", "").trim();

    if (!jwt) {
        return res.status(401).json(new ApiError(401, {}, "Missing Authorization Token"));
    }

    try {
        // ✅ Set the JWT dynamically for this request
        client.setJWT(jwt);

        // ✅ Create a fresh Account instance with the new JWT
        const account = new Account(client);
        const user = await account.get(); // validate user with Appwrite
        const userprofile = await UserProfileService.getUserProfile(user.$id);
        req.user = {
            ...user,
            userprofile
        };
        next();
    } catch (err) {
        res.status(401).json(new ApiError(401, {}, "Invalid or expired JWT"));
    }
});
