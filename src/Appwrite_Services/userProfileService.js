import { databases } from './appwrite.js';

// Assert that environment variables are defined
const databaseId = process.env.APPWRITE_DATABASE_ID;
const userProfileCollectionId = process.env.APPWRITE_DATABASE_USERPROFILECOLLECTION;

if (!databaseId || !userProfileCollectionId) {
    throw new Error("Missing required environment variables for Appwrite configuration");
}


const UserProfileService = {

    getUserProfile: async (userId) => {
        try {
            const profile = await databases.getDocument(
                databaseId,
                userProfileCollectionId,
                userId
            );

            return {
                userId: profile.$id,
                username: profile.username,
                bio: profile.bio,
                gender: profile.gender,
                profilepicture: profile.profilepicture,
                country: profile.country,
                category: profile.category,
                skills_critaria: profile.skills_critaria,
                githubusername: profile.githubusername,
            };
        } catch (error) {
            // Handle case where profile doesn't exist
            if (error.code === 404) {
                return null;
            }
            console.error('Error getting user profile:', error);
            throw error;
        }
    }
}

export default UserProfileService;