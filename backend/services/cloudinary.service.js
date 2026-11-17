const { cloudinary } = require("../config/cloudinary");

const uploadImage = (buffer, folder = "prescripto") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );

    stream.end(buffer);
  });
};

// Accepts either a publicId ("prescripto/abc123") or a full Cloudinary URL
const extractPublicId = (value) => {
  if (!value) return null;

  // already a publicId (no protocol)
  if (!/^https?:\/\//i.test(value)) return value;

  // https://res.cloudinary.com/<cloud>/image/upload/v123/prescripto/abc123.jpg
  const match = value.match(
    /\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(.+?)\.[a-z0-9]+$/i,
  );
  return match ? match[1] : null;
};

const deleteImage = async (imageOrPublicId) => {
  const publicId = extractPublicId(imageOrPublicId);

  if (!publicId) {
    console.warn(
      "deleteImage: could not extract publicId from:",
      imageOrPublicId,
    );
    return null;
  }

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });

  // result.result is "ok" on success, "not found" if the id is wrong
  if (result.result !== "ok") {
    console.warn(
      `deleteImage: Cloudinary returned "${result.result}" for`,
      publicId,
    );
  }

  return result;
};

module.exports = { uploadImage, deleteImage, extractPublicId };
