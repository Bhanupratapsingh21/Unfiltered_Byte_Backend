import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
    region: process.env.AWS_REGION, // e.g., 'ap-south-1'
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_KEY
    }
});

// Function to delete all objects under a folder/prefix in S3
const deleteFolderFromS3 = async (folderPrefix) => {
    const listParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Prefix: folderPrefix,
    };

    try {
        // Step 1: List all objects with the given prefix
        const listedObjects = await s3Client.send(new ListObjectsV2Command(listParams));

        if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
            return; // Nothing to delete
        }

        // Step 2: Prepare delete parameters
        const deleteParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Delete: {
                Objects: listedObjects.Contents.map(obj => ({ Key: obj.Key })),
                Quiet: true
            }
        };

        // Step 3: Delete the objects
        const deleteResult = await s3Client.send(new DeleteObjectsCommand(deleteParams));
        return deleteResult;
    } catch (err) {
        console.error("Failed to delete S3 folder:", err);
        throw err;
    }
};

export default deleteFolderFromS3;
