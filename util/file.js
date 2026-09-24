const fs = require("fs");

const deleteFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      if (err.code === "ENOENT") {
               console.log(`File not found, skipping delete: ${filePath}`);
        return;
      }
            console.error("Error deleting file:", err);
    }
  });
};

exports.deleteFile = deleteFile;