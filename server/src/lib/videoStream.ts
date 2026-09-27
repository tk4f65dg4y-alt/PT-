import { Response } from "express";

// Serves a stored video buffer with basic HTTP Range support — iOS Safari in
// particular won't play (or seek) a <video> reliably without it.
export function streamVideo(
  res: Response,
  video: { data: Buffer; mimeType: string; sizeBytes: number },
  rangeHeader?: string
) {
  res.setHeader("Content-Type", video.mimeType);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "private, max-age=86400");

  const match = rangeHeader && /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  if (match) {
    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2] ? parseInt(match[2], 10) : video.sizeBytes - 1;
    const clampedEnd = Math.min(end, video.sizeBytes - 1);
    if (start > clampedEnd || start < 0) {
      res.status(416).setHeader("Content-Range", `bytes */${video.sizeBytes}`).end();
      return;
    }
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${clampedEnd}/${video.sizeBytes}`);
    res.setHeader("Content-Length", String(clampedEnd - start + 1));
    res.end(video.data.subarray(start, clampedEnd + 1));
    return;
  }

  res.setHeader("Content-Length", String(video.sizeBytes));
  res.end(video.data);
}
