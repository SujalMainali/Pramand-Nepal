// lib/generateThumbnail.ts
export async function generateThumbnailFromFile(
    file: File,
    opts?: { timeSec?: number; maxWidth?: number; quality?: number; mime?: "image/jpeg" | "image/webp" }
): Promise<{ blob: Blob; width: number; height: number; timeSec: number }> {
    const timeSec = opts?.timeSec ?? 2;
    const maxWidth = opts?.maxWidth ?? 640;
    const mime = opts?.mime ?? "image/jpeg";
    const quality = opts?.quality ?? 0.8;

    const url = URL.createObjectURL(file);
    try {
        const video = document.createElement("video");
        video.src = url;
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true; // iOS friendliness

        await new Promise<void>((resolve, reject) => {
            const onLoaded = () => resolve();
            const onError = () => reject(new Error("Failed to load video metadata"));
            video.addEventListener("loadedmetadata", onLoaded, { once: true });
            video.addEventListener("error", onError, { once: true });
        });

        // Clamp seek time to duration range
        const seekTo = Math.min(Math.max(timeSec, 0), Math.max(video.duration - 0.1, 0));
        video.currentTime = seekTo;

        await new Promise<void>((resolve, reject) => {
            const onSeeked = () => resolve();
            const onError = () => reject(new Error("Failed to seek video"));
            video.addEventListener("seeked", onSeeked, { once: true });
            video.addEventListener("error", onError, { once: true });
        });

        // Compute target canvas size (keep aspect ratio)
        const srcW = video.videoWidth;
        const srcH = video.videoHeight;
        const scale = Math.min(1, maxWidth / srcW);
        const dstW = Math.max(1, Math.round(srcW * scale));
        const dstH = Math.max(1, Math.round(srcH * scale));

        const canvas = document.createElement("canvas");
        canvas.width = dstW;
        canvas.height = dstH;

        const ctx = canvas.getContext("2d", { willReadFrequently: false });
        if (!ctx) throw new Error("Canvas 2D context not available");

        ctx.drawImage(video, 0, 0, dstW, dstH);

        const blob: Blob = await new Promise((resolve, reject) =>
            canvas.toBlob(
                (b) => (b ? resolve(b) : reject(new Error("Failed to create thumbnail blob"))),
                mime,
                quality
            )
        );

        return { blob, width: dstW, height: dstH, timeSec: seekTo };
    } finally {
        URL.revokeObjectURL(url);
    }
}
