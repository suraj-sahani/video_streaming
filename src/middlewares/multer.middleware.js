import multer from "multer";

const storage = multer.diskStorage({
  destination: (req, file, callBack) => {
    callBack(null, "./public/temp");
  },
  filename: (req, file, callBack) => {
    // We can change the uploaded filename but since the time period for which the file is going to be stored in the filesystem of the server is too low, we are not modifying it right now, but it is a good idea to do so.
    // To change the filename, we would do this
    // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)

    callBack(null, file.originalname);
  },
});

export const upload = multer({ storage });
