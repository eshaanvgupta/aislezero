import { safeUrl } from "../security";
export interface MediaUpload {
  url: string;
  hash: string;
  width?: number;
  height?: number;
}
export async function inspectFile(file: File) {
  if (file.size > 50 * 1024 * 1024)
    throw new Error("Files must be smaller than 50 MB");
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    png =
      bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71,
    webp =
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP",
    mp4 = String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
  if (!(
    (jpeg && file.type === "image/jpeg") ||
    (png && file.type === "image/png") ||
    (webp && file.type === "image/webp") ||
    (mp4 && file.type === "video/mp4")
  ))
    throw new Error(
      "Only signature-validated JPEG, PNG, WebP and MP4 files are accepted. SVG and HTML are blocked.",
    );
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  const hash = [...new Uint8Array(digest)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  if (!mp4) {
    const bitmap = await createImageBitmap(file);
    const width = bitmap.width,
      height = bitmap.height;
    bitmap.close();
    if (width < 100 || height < 100 || width * height > 80000000)
      throw new Error(
        "Images need dimensions of at least 100 × 100, up to 80 megapixels",
      );
    return { hash, width, height };
  }
  return { hash };
}
export function uploadDirect(
  file: File,
  provider: "pinata" | "https" | "arweave",
  endpoint: string,
  token: string,
  onProgress: (p: number) => void,
  signal: AbortSignal,
): Promise<string> {
  const url =
    provider === "pinata"
      ? "https://api.pinata.cloud/pinning/pinFileToIPFS"
      : safeUrl(endpoint);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.timeout = 120000;
    if (token) xhr.setRequestHeader("Authorization", "Bearer " + token);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    const abort = () => xhr.abort();
    signal.addEventListener("abort", abort, { once: true });
    const done = () => signal.removeEventListener("abort", abort);
    xhr.onerror = () => {
      done();
      reject(new Error("Upload failed. Check provider CORS and credentials."));
    };
    xhr.ontimeout = () => {
      done();
      reject(new Error("Upload timed out"));
    };
    xhr.onabort = () => {
      done();
      reject(new Error("Upload cancelled"));
    };
    xhr.onload = () => {
      done();
      try {
        if (xhr.status < 200 || xhr.status >= 300)
          throw new Error(`Provider returned ${xhr.status}`);
        const data = JSON.parse(xhr.responseText);
        resolve(
          provider === "pinata"
            ? `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`
            : safeUrl(data.url),
        );
      } catch (e) {
        reject(e);
      }
    };
    const data = new FormData();
    data.append("file", file);
    xhr.send(data);
  });
}
