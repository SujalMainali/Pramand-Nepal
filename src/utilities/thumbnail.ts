// lib/thumbnails.ts
import 'server-only';
import { PassThrough } from "node:stream";
import { put } from "@vercel/blob";
import { connectDB } from "@/database/mongoose";
import Thumbnail from "@/database/models/Thumbnail";

/**
 * Lazy-load ffmpeg & the static binary ONLY at runtime.
 * This avoids Turbopack trying to parse native/binary assets at build time.
 */
async function getFfmpeg() {
    const [{ default: ffmpeg }, { default: ffmpegStatic }] = await Promise.all([
        import('fluent-ffmpeg'),
        import('ffmpeg-static'),
    ]);

    if (!ffmpegStatic) {
        throw new Error("ffmpeg-static binary path not resolved");
    }
    ffmpeg.setFfmpegPath(ffmpegStatic as string);

    return ffmpeg;
}

type GenerateThumbOpts = {
    timecodeSec?: number;
    maxWidth?: number;
    isCover?: boolean;
    nameHint?: string;
};

/**
 * Generates a JPEG thumbnail from a video URL, uploads it to Vercel Blob,
 * and saves a Thumbnail doc linked to the provided videoId.
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

    // 1) Extract a JPEG frame into a Buffer
    const imageBuffer: Buffer = await frameToJpegBuffer(videoDownloadUrl, {
        timecodeSec,
        maxWidth,
    });

    // 2) Upload JPEG to Vercel Blob
    const safeTime = Math.max(0, Math.floor(timecodeSec));
    const base = nameHint?.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "") || "thumb";
    const path = `thumbs/${videoId}_${base}_${safeTime}s.jpg`;

    const uploaded = await put(path, imageBuffer, {
        access: "public",
        contentType: "image/jpeg",
    });

    // 3) (Skipping dimension probe to avoid extra native deps)
    const width = null, height = null;

    // 4) Persist Thumbnail doc
    const thumbDoc = await Thumbnail.create({
        videoId,
        url: uploaded.url,
        path: uploaded.pathname,
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
    const ffmpeg = await getFfmpeg();

    return new Promise<Buffer>((resolve, reject) => {
        const pass = new PassThrough();
        const chunks: Buffer[] = [];

        pass.on("data", (chunk) => chunks.push(chunk));
        pass.on("end", () => resolve(Buffer.concat(chunks)));
        pass.on("error", reject);

        ffmpeg(inputUrl)
            .inputOptions([`-ss ${Math.max(0, timecodeSec)}`]) // seek first
            .outputOptions([
                "-vframes 1", // one frame
                "-f image2", // image muxer
                `-vf scale=${maxWidth}:-1`, // keep aspect ratio
                "-q:v 2", // quality (2 high, 31 worst)
            ])
            .outputFormat("mjpeg") // JPEG
            .on("error", reject)
            .pipe(pass, { end: true });
    });
}
