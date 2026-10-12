import "server-only";
import { Binary } from "mongodb";
import { sealBytes, unsealBytes } from "./crypto";
import { db } from "./db";

/**
 * Progress photos: optional, private, encrypted like the other health data
 * (AES-256-GCM, server key). Served only to their owner, never shared, never
 * analysed.
 */

interface SealedImage {
  iv: Binary;
  tag: Binary;
  data: Binary;
}

interface StoredPhoto {
  _id: string;
  userId: string;
  date: string;
  at: Date;
  width: number;
  height: number;
  full: SealedImage;
  thumb: SealedImage;
}

export interface ProgressPhoto {
  id: string;
  date: string;
  width: number;
  height: number;
}

export const MAX_PROGRESS_PHOTOS = 100;
const MAX_FULL = 900_000;
const MAX_THUMB = 120_000;

const photos = () => db.collection<StoredPhoto>("progress_photos");

const toBinary = (s: { iv: Buffer; tag: Buffer; data: Buffer }): SealedImage => ({ iv: new Binary(s.iv), tag: new Binary(s.tag), data: new Binary(s.data) });
const fromBinary = (s: SealedImage) => unsealBytes({ iv: Buffer.from(s.iv.buffer), tag: Buffer.from(s.tag.buffer), data: Buffer.from(s.data.buffer) });

/** JPEG files start with FF D8 FF. */
const isJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

export async function listProgressPhotos(userId: string): Promise<ProgressPhoto[]> {
  const docs = await photos()
    .find({ userId }, { projection: { _id: 1, date: 1, width: 1, height: 1 } })
    .sort({ date: -1, at: -1 })
    .toArray();
  return docs.map((d) => ({ id: d._id, date: d.date, width: d.width, height: d.height }));
}

export type AddPhotoResult = { ok: true; photo: ProgressPhoto } | { ok: false; error: "invalid" | "too_big" | "limit" };

export async function addProgressPhoto(userId: string, input: { date: string; full: string; thumb: string; width: number; height: number }): Promise<AddPhotoResult> {
  const full = Buffer.from(input.full, "base64");
  const thumb = Buffer.from(input.thumb, "base64");
  if (!isJpeg(full) || !isJpeg(thumb)) return { ok: false, error: "invalid" };
  if (full.length > MAX_FULL || thumb.length > MAX_THUMB) return { ok: false, error: "too_big" };
  if ((await photos().countDocuments({ userId })) >= MAX_PROGRESS_PHOTOS) return { ok: false, error: "limit" };
  const doc: StoredPhoto = {
    _id: crypto.randomUUID(),
    userId,
    date: input.date,
    at: new Date(),
    width: Math.round(input.width),
    height: Math.round(input.height),
    full: toBinary(sealBytes(full)),
    thumb: toBinary(sealBytes(thumb)),
  };
  await photos().insertOne(doc);
  return { ok: true, photo: { id: doc._id, date: doc.date, width: doc.width, height: doc.height } };
}

/** The decrypted JPEG, only for its owner. */
export async function readProgressPhoto(userId: string, id: string, size: "full" | "thumb"): Promise<Buffer | null> {
  const doc = await photos().findOne({ _id: id, userId }, { projection: { [size]: 1 } });
  const sealed = doc?.[size];
  return sealed ? fromBinary(sealed) : null;
}

export async function deleteProgressPhoto(userId: string, id: string): Promise<boolean> {
  return (await photos().deleteOne({ _id: id, userId })).deletedCount === 1;
}

export async function deleteAllProgressPhotos(userId: string): Promise<void> {
  await photos().deleteMany({ userId });
}
