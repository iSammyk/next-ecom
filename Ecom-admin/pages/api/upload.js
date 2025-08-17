import multiparty from 'multiparty';
import { v2 as cloudinary } from 'cloudinary';
import { mongooseConnect } from "@/lib/mongoose";
import { isAdminRequest } from "@/pages/api/auth/[...nextauth]";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default async function handle(req, res) {
  await mongooseConnect();
  await isAdminRequest(req, res);

  const form = new multiparty.Form();
  const { fields, files } = await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });

  const links = [] || 'didnt push';
  for (const file of files.file) {
    const uploadResult = await cloudinary.uploader.upload(file.path, {
      resource_type: "auto", // Automatically detect file type (image, video, etc.)
    });
    links.push(uploadResult.secure_url); // Collect the URL of the uploaded file
  }

  return res.json({ links });
}

export const config = {
  api: { bodyParser: false },
};
