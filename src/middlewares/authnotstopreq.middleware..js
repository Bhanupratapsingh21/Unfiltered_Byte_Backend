import { ApiError } from "../utils/apierror.js";
import { asyncHandeler } from "../utils/asynchandeler.js";
import { Client, Account } from "appwrite";
import { client } from "../Appwrite_Services/appwrite.js";
import UserProfileService from "../Appwrite_Services/userProfileService.js";

export const addedusertoreqdontstopresponse = asyncHandeler(async (req, res, next) => {
    const rawToken = req.headers.authorization;
    const jwt = rawToken?.replace("Bearer ", "").trim();

    try {
        if (jwt) {
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
        }
    } catch (err) {
        //   res.status(401).json(new ApiError(401, {}, "Invalid or expired JWT"));
    } finally {
        next();
    }
});