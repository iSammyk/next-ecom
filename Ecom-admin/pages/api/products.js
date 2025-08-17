import { Product } from "@/models/Product";
import { mongooseConnect } from "@/lib/mongoose";
import { isAdminRequest } from "@/pages/api/auth/[...nextauth]";
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = {
  api: {
    bodyParser: false, // Disabling Next.js's default body parsing
  },
};

export default async function handle(req, res) {
  await mongooseConnect();
  await isAdminRequest(req, res);

  if (req.method === 'GET') {
    if (req.query?.id) {
      res.json(await Product.findOne({ _id: req.query.id }));
    } else {
      res.json(await Product.find());
    }
  } else if (req.method === 'POST') {
    const form = formidable({ multiples: true, keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        res.status(500).json({ error: 'Form parsing error' });
        return;
      }

      try {
        const uploadedImages = [];

        if (files.images) {
          const imageFiles = Array.isArray(files.images) ? files.images : [files.images];

          for (const file of imageFiles) {
            const result = await cloudinary.uploader.upload(file.filepath, {
              folder: 'products',
            });
            uploadedImages.push(result.secure_url);
            fs.unlinkSync(file.filepath); // Remove the temporary file
          }
        }

        const { title, description, price, category, properties } = fields;
        const productDoc = await Product.create({
          title,
          description,
          price,
          images: uploadedImages,
          category,
          properties,
        });

        res.json(productDoc);
      } catch (uploadError) {
        res.status(500).json({ error: 'Cloudinary upload error', details: uploadError.message });
      }
    });
  } else if (req.method === 'PUT') {
    const contentType = req.headers['content-type'];

    if (contentType && contentType.startsWith('application/json')) {
      // Handle JSON body
      const { title, description, price, images, category, properties, _id } = req.body;
      await Product.updateOne({ _id }, { title, description, price, images, category, properties });
      res.json(true);
    } else {
      // Handle form-data body (if necessary)
      const form = formidable({ multiples: true, keepExtensions: true });

      form.parse(req, async (err, fields, files) => {
        if (err) {
          res.status(500).json({ error: 'Form parsing error' });
          return;
        }
        
        const { title, description, price, category, properties, _id } = fields;
        const updatedData = { title, description, price, category, properties };
        
        if (files.images) {
          const imageFiles = Array.isArray(files.images) ? files.images : [files.images];
        
          try {
            const uploadedImages = await Promise.all(
              imageFiles.map(file =>
                cloudinary.uploader.upload(file.filepath, {
                  folder: 'products',
                }).then(result => {
                  fs.unlinkSync(file.filepath); // Remove the temporary file
                  return result.secure_url;
                })
              )
            );
        
            updatedData.images = uploadedImages;
          } catch (uploadError) {
            res.status(500).json({ error: 'Image upload failed' });
            return;
          }
        }
        
        // Continue with the rest of your code (e.g., updating the database, sending response, etc.)

        await Product.updateOne({ _id }, updatedData);
        res.json(true);
      });
    }
  } else if (req.method === 'DELETE') {
    if (req.query?.id) {
      await Product.deleteOne({ _id: req.query?.id });
      res.json(true);
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
