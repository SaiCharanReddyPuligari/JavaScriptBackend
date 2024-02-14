import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        // type of file "image""raw", etc
        //console.log("file is uploaded on cloudinary ", response.url);
        fs.unlinkSync(localFilePath); //once data is uploaded on cloud, we remove the localone
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the upload operation got failed
        return null;
    }
};

const deleteOnCloudinary = async (public_id, resource_type = "image") => {
    try {
        if (!public_id) return null;

        //deleting files on cloudinary
        const response = await cloudinary.uploader.destroy(public_id, {
            resource_type: `${resource_type}`,
        });
    } catch (error) {
        console.log("deleting files on Cloudinary failed", error);
        return error; // remove the locally saved temporary file as the upload operation got failed
    }
};

export { uploadOnCloudinary, deleteOnCloudinary };
