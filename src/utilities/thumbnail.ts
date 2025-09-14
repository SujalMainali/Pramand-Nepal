// lib/thumbnails.ts
import { Readable, PassThrough } from "node:stream";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { put } from "@vercel/blob";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";
import { connectDB } from "@/database/mongoose";
import Thumbnail from "@/database/models/Thumbnail";


if (!ffmpegStatic) {
    // Helpful during local dev when bundler tree-shakes incorrectly
    throw new Error("ffmpeg-static binary path not resolved");
}

ffmpeg.setFfmpegPath(ffmpegStatic as string);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

type GenerateThumbOpts = {
    /** Where to capture the frame, in seconds (default: 5s) */
    timecodeSec?: number;
    /** Max width of the thumbnail; height is auto to preserve aspect (default: 640) */
    maxWidth?: number;
    /** Mark this one as the cover image */
    isCover?: boolean;
    /** Optional explicit output filename stem; we’ll add .jpg */
    nameHint?: string;
};

/**
 * Generates a JPEG thumbnail from a video URL, uploads it to Vercel Blob,
 * and saves a Thumbnail doc linked to the provided videoId.
 *
 * @param videoId Mongo ObjectId (string) for the Video document
 * @param videoDownloadUrl Public (or signed) URL to the video file (use Blob's downloadUrl)
 */
export async function generateAndSaveThumbnail(
    videoId: string,
    videoDownloadUrl: string,
    {
        timecodeSec = 5,
        maxWidth = 640,
        isCover = true,
        nameHint,
    }: GenerateThumbOpts = {}
) {
    await connectDB();

    // 1) Use ffmpeg to grab a single frame as JPEG into a Buffer
    const imageBuffer: Buffer = await frameToJpegBuffer(videoDownloadUrl, { timecodeSec, maxWidth });

    // 2) Upload JPEG to Vercel Blob
    // Use a stable path like: thumbs/<videoId>_<timecode>s_<random>.jpg
    const safeTime = Math.max(0, Math.floor(timecodeSec));
    const base = nameHint?.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "") || "thumb";
    const path = `thumbs/${videoId}_${base}_${safeTime}s.jpg`;

    const uploaded = await put(path, imageBuffer, {
        access: "public",
        contentType: "image/jpeg",
    });

    // 3) (Optional) Get dimensions with ffprobe (cheap) — or skip for speed
    const { width, height } = await probeImageSize(imageBuffer).catch(() => ({ width: null, height: null }));

    // 4) Save Thumbnail doc
    const thumbDoc = await Thumbnail.create({
        videoId,
        url: uploaded.url,
        path: uploaded.pathname, // or uploaded.url; pathname is unique within your store
        width,
        height,
        isCover,
        timecodeSec: safeTime,
    });

    return thumbDoc.toJSON();
}

/** Extract one JPEG frame into a Buffer using ffmpeg, seeking at timecodeSec */
async function frameToJpegBuffer(
    inputUrl: string,
    { timecodeSec, maxWidth }: { timecodeSec: number; maxWidth: number }
): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const pass = new PassThrough();
        const chunks: Buffer[] = [];

        pass.on("data", (chunk) => chunks.push(chunk));
        pass.on("end", () => resolve(Buffer.concat(chunks)));
        pass.on("error", reject);

        ffmpeg(inputUrl)
            .inputOptions([`-ss ${Math.max(0, timecodeSec)}`]) // seek to time
            .outputOptions([
                "-vframes 1",            // one frame
                "-f image2",             // force image muxer
                `-vf scale=${maxWidth}:-1`, // resize to maxWidth, preserve aspect
                "-q:v 2",                // quality (2 = high, 31 = worst)
            ])
            .outputFormat("mjpeg")     // JPEG
            .on("error", reject)
            .pipe(pass, { end: true });
    });
}

/** Rough image dimensions via ffprobe over a buffer (optional) */
async function probeImageSize(buffer: Buffer): Promise<{ width: number | null; height: number | null }> {
    // ffprobe doesn't read from Buffer directly. Two options:
    // 1) Skip dimensions (fastest).
    // 2) Use a lightweight parser (like sharp/metadata) — adds a heavy dep.
    // For serverless simplicity, we’ll skip and return nulls here.
    return { width: null, height: null };
}
