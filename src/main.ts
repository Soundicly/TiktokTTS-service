import express from "express";
import cors from "cors";
import Redis from "ioredis";
import { UploadedObjectInfo, Client, ItemBucketMetadata } from 'minio'
import crypto from "crypto"
import {path as ffprobePath} from "@ffprobe-installer/ffprobe";
import {spawn} from "child_process";
import dotenv from "dotenv";
import { ReadStream, promises as fs } from "fs";
dotenv.config();

import { TTSVoice, requestTTS } from "./tiktok";

const app = express();
app.use(express.json());

const ALLOWED_ORIGINS = (process.env.CORS ?? "http://localhost:3000").split(", ");
app.use(cors({
  origin: (origin, callback) => {
    if (origin === undefined || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
}))

// Setting up redis client
const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");

// Minio Client
const MINIO_CLIENT = new Client({
  endPoint: process.env.MINIO_ADDRESS ?? 'localhost',
  port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY ?? "",    // Replace with your actual access key
  secretKey: process.env.MINIO_SECRET_KEY ?? "",    // Replace with your actual secret key
});
const MINIO_BUCKET = process.env.MINIO_BUCKET ?? "tiktoktts";

// Creating bucket if it doesn't exist
(async () => {
  try {
    await MINIO_CLIENT.makeBucket(MINIO_BUCKET)
  } catch (err) {
    // Ignore
  }

  try {
    // Make bucket public and accessible by anyone
    await MINIO_CLIENT.setBucketPolicy(MINIO_BUCKET, JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          "Effect": "Allow",
          "Principal": "*",
          "Action": "s3:GetObject",
          "Resource": `arn:aws:s3:::${MINIO_BUCKET}/*`
        },
      ],
    }));
  } catch (err) {
    throw new Error(`Failed to set bucket policy: ${err}`);
  }
})();

/*        MINIO FUNCTIONS         */
async function getObjectMetadata(fileName: string): Promise<ItemBucketMetadata> {
  try {
    const objectStats = await MINIO_CLIENT.statObject(MINIO_BUCKET, fileName);
    if (objectStats === null || objectStats === undefined) {
      throw new Error("Object not found");
    }
    return objectStats.metaData;
  } catch (err) {
    throw new Error("Object not found " + err);
  }
}

async function uploadFile(fileName: string, audiofileBuffer: ReadStream | Buffer, duration: number): Promise<UploadedObjectInfo> {
  return MINIO_CLIENT.putObject(MINIO_BUCKET, fileName, audiofileBuffer, {
    'Content-Type': 'audio/mp3',
    'x-amz-meta-duration': duration.toString(),
  });
}

function getObjectUrl(fileName: string): string {
  /// return MINIO_CLIENT.presignedGetObject(MINIO_BUCKET, fileName)
  return `http://${process.env.MINIO_ADDRESS}:${process.env.MINIO_PORT}/${MINIO_BUCKET}/${fileName}`
}
/*                               */

// ffprobe functions
async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn(ffprobePath, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      '-i', filePath,
    ]);

    let stdoutData = '';
    let stderrData = '';
    
    ffprobe.on('error', (err) => {
      console.error(err);
      reject(err);
    });

    ffprobe.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    ffprobe.on('exit', (code) => {
      if (code === 0) {
        const duration = parseFloat(stdoutData);
        if (isNaN(duration)) {
          reject(new Error("Invalid duration"));
        } else {
          resolve(duration);
        }
      } else {
        reject(new Error(`FFprobe process exited with code ${code}. STDERR: ${stderrData}`));
      }
    });
  });
}

// Get request
// text: the text to be converted to speech
// voice: the voice to use for the speech
app.get("/tts", async (req, res) => {
  const {text, voice} = req.query;

  // Check if the text and voice parameters are provided
  if (!text || !voice) {
    return res.status(400).json({
      error: true,
      errorMessage: "Missing text or voice parameter",
    });
  }

  const ttsvoice: TTSVoice = voice as TTSVoice;

  // Check if the voice parameter is valid
  if (!Object.values(TTSVoice).includes(ttsvoice)) {
    return res.status(400).json({
      error: true,
      errorMessage: "Invalid voice parameter",
    });
  }
  
  // Checking if already in cache
  const cacheKey = crypto.createHash('md5').update(`${text}-${ttsvoice}`).digest('hex');
  const cachedFileName = await redis.get(cacheKey);
  if (cachedFileName) {
    try {
      const metadata = await getObjectMetadata(cachedFileName)
      return res.json({
        error: false,
        s3url: getObjectUrl(cachedFileName),
        duration: parseFloat(metadata.duration ?? -1),
      });
    } catch (err) {
      console.error("An error occurred retriving from s3:", err);
      await redis.del(cacheKey);
    } // Object couldn't be found
  }

  // Get the tiktok session id from the environment variables
  const sessionId = process.env.TIKTOK_SESSION_ID;

  // Check if the tiktok session id is provided
  if (!sessionId || sessionId === "") {
    return res.status(500).json({
      error: true,
      errorMessage: "Missing TikTok session id",
    });
  }

  let audioBase64;
  try {
    // Get the audio buffer from the tiktok tts api
    audioBase64 = await requestTTS(text.toString(), ttsvoice, sessionId);
  } catch (error) {
    console.error("An error occurred retriving from tiktok:", error);
    return res.status(500).json({
      error: true,
      errorMessage: "An error occurred while retriving from tiktok",
    });
  }

  // Generate a random file name
  const fileName = crypto.randomBytes(24).toString("hex") + ".mp3";

  const localTempFilePath = `./temp/${fileName}`;
  await fs.mkdir("./temp", { recursive: true })
  await fs.writeFile(localTempFilePath, Buffer.from(audioBase64, "base64"), "base64");

  // Upload the audio buffer to the minio server
  try {
    const duration = await getAudioDuration(localTempFilePath);
    await uploadFile(fileName, (await fs.open(localTempFilePath, "r")).createReadStream(), duration);
    await fs.rm(localTempFilePath);
    res.json({
      error: false,
      s3url: getObjectUrl(fileName),
      duration,
    });
    await redis.set(cacheKey, fileName);
  } catch (err) {
    console.error("An error occurred uploading to s3:", err);
    return res.status(500).json({
      error: true,
      errorMessage: "An error occurred while uploading to s3",
    });
  }

});

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
