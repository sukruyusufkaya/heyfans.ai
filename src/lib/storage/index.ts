import "server-only";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/config/env";
import { FeatureUnavailableError } from "@/lib/errors";

export interface UploadTarget {
  method: "PUT";
  url: string;
  headers: Record<string, string>;
}

export interface StorageProvider {
  readonly name: "local" | "s3";
  /** İstemcinin dosyayı doğrudan yükleyeceği hedef (Vercel 4,5 MB gövde sınırını aşmak için). */
  uploadTarget(key: string, mime: string, assetId: string): Promise<UploadTarget>;
  put(key: string, body: Buffer, mime: string): Promise<void>;
  head(key: string): Promise<{ size: number } | null>;
  readRange(key: string, bytes: number): Promise<Buffer>;
  read(key: string): Promise<Buffer>;
  /** Özel nesne için kısa ömürlü okuma URL'si (s3) — local'de null (uygulama üzerinden akıtılır). */
  signedReadUrl(key: string, ttlSec: number): Promise<string | null>;
  publicUrl(key: string): string | null;
  remove(key: string): Promise<void>;
}

class LocalStorage implements StorageProvider {
  readonly name = "local" as const;
  private root = path.resolve(env().STORAGE_LOCAL_DIR);
  private file(key: string) {
    const p = path.resolve(this.root, key);
    if (!p.startsWith(this.root)) throw new Error("Geçersiz depolama anahtarı");
    return p;
  }
  async uploadTarget(_key: string, mime: string, assetId: string): Promise<UploadTarget> {
    return { method: "PUT", url: `/api/media/upload/${assetId}`, headers: { "Content-Type": mime } };
  }
  async put(key: string, body: Buffer) {
    const p = this.file(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, body);
  }
  async head(key: string) {
    try {
      const s = await stat(this.file(key));
      return { size: s.size };
    } catch {
      return null;
    }
  }
  async readRange(key: string, bytes: number) {
    const buf = await readFile(this.file(key));
    return buf.subarray(0, bytes);
  }
  async read(key: string) {
    return readFile(this.file(key));
  }
  async signedReadUrl() {
    return null;
  }
  publicUrl() {
    return null;
  }
  async remove(key: string) {
    await rm(this.file(key), { force: true });
  }
}

class S3Storage implements StorageProvider {
  readonly name = "s3" as const;
  private clientPromise: Promise<import("@aws-sdk/client-s3").S3Client>;
  constructor(
    private readonly bucket: string,
    private readonly publicBase: string | undefined,
  ) {
    const e = env();
    this.clientPromise = import("@aws-sdk/client-s3").then(
      ({ S3Client }) =>
        new S3Client({
          region: e.S3_REGION,
          endpoint: e.S3_ENDPOINT,
          credentials: { accessKeyId: e.S3_ACCESS_KEY_ID!, secretAccessKey: e.S3_SECRET_ACCESS_KEY! },
          forcePathStyle: Boolean(e.S3_ENDPOINT),
        }),
    );
  }
  async uploadTarget(key: string, mime: string): Promise<UploadTarget> {
    const [{ PutObjectCommand }, { getSignedUrl }, client] = await Promise.all([import("@aws-sdk/client-s3"), import("@aws-sdk/s3-request-presigner"), this.clientPromise]);
    const url = await getSignedUrl(client, new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: mime }), { expiresIn: 600 });
    return { method: "PUT", url, headers: { "Content-Type": mime } };
  }
  async put(key: string, body: Buffer, mime: string) {
    const [{ PutObjectCommand }, client] = await Promise.all([import("@aws-sdk/client-s3"), this.clientPromise]);
    await client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: mime }));
  }
  async head(key: string) {
    const [{ HeadObjectCommand }, client] = await Promise.all([import("@aws-sdk/client-s3"), this.clientPromise]);
    try {
      const r = await client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { size: r.ContentLength ?? 0 };
    } catch {
      return null;
    }
  }
  async readRange(key: string, bytes: number) {
    const [{ GetObjectCommand }, client] = await Promise.all([import("@aws-sdk/client-s3"), this.clientPromise]);
    const r = await client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: `bytes=0-${bytes - 1}` }));
    return Buffer.from(await r.Body!.transformToByteArray());
  }
  async read(key: string) {
    const [{ GetObjectCommand }, client] = await Promise.all([import("@aws-sdk/client-s3"), this.clientPromise]);
    const r = await client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return Buffer.from(await r.Body!.transformToByteArray());
  }
  async signedReadUrl(key: string, ttlSec: number) {
    const [{ GetObjectCommand }, { getSignedUrl }, client] = await Promise.all([import("@aws-sdk/client-s3"), import("@aws-sdk/s3-request-presigner"), this.clientPromise]);
    return getSignedUrl(client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: ttlSec });
  }
  publicUrl(key: string) {
    return this.publicBase ? `${this.publicBase.replace(/\/$/, "")}/${key}` : null;
  }
  async remove(key: string) {
    const [{ DeleteObjectCommand }, client] = await Promise.all([import("@aws-sdk/client-s3"), this.clientPromise]);
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

let instance: StorageProvider | undefined;
export function getStorage(): StorageProvider {
  if (instance) return instance;
  const e = env();
  if (e.STORAGE_PROVIDER === "s3") {
    if (!e.S3_BUCKET || !e.S3_ACCESS_KEY_ID || !e.S3_SECRET_ACCESS_KEY) throw new FeatureUnavailableError("Medya depolama yapılandırılmadı.", ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]);
    instance = new S3Storage(e.S3_BUCKET, e.S3_PUBLIC_BASE_URL);
  } else {
    instance = new LocalStorage();
  }
  return instance;
}
