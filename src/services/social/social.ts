import "server-only";
import { connectDb, withTransaction } from "@/lib/db/mongo";
import { NotFoundError } from "@/lib/errors";
import { oid } from "@/lib/validation/common";
import { ContentItem } from "@/models/content";
import { CreatorProfile } from "@/models/creator";
import { AnalyticsEvent } from "@/models/platform";
import { Favorite, Follow, type IFavorite } from "@/models/social";
import { notify } from "@/services/notifications/notifications";

/** Takip et / bırak. Benzersiz indeks sayesinde tekrar kayıt oluşmaz; sayaç yalnız gerçek değişimde güncellenir. */
export async function setFollow(userId: string, creatorId: string, follow: boolean) {
  await connectDb();
  const cid = oid(creatorId);
  const uid = oid(userId);
  const creator = await CreatorProfile.findOne({ _id: cid, status: "approved" }, { userId: 1, displayName: 1 }).lean();
  if (!creator) throw new NotFoundError("İçerik üreticisi bulunamadı.");
  if (creator.userId.equals(uid)) return { following: false, changed: false };

  const changed = await withTransaction(async (session) => {
    if (follow) {
      const res = await Follow.updateOne({ followerId: uid, creatorId: cid }, { $setOnInsert: { followerId: uid, creatorId: cid } }, { upsert: true, session });
      if (res.upsertedCount === 1) {
        await CreatorProfile.updateOne({ _id: cid }, { $inc: { "stats.followers": 1 } }, { session });
        return true;
      }
      return false;
    }
    const res = await Follow.deleteOne({ followerId: uid, creatorId: cid }, { session });
    if (res.deletedCount === 1) {
      await CreatorProfile.updateOne({ _id: cid, "stats.followers": { $gt: 0 } }, { $inc: { "stats.followers": -1 } }, { session });
      return true;
    }
    return false;
  });
  if (changed) {
    await AnalyticsEvent.create({ type: follow ? "follow" : "unfollow", userId: uid, creatorId: cid, props: {} });
    if (follow) await notify(creator.userId.toString(), { type: "follow", title: "Yeni takipçi", body: "Bir hayran seni takip etmeye başladı.", link: "/studio/fans" });
  }
  return { following: follow, changed };
}

/** Favori ekle / çıkar (creator, içerik, ikiz). */
export async function setFavorite(userId: string, targetType: IFavorite["targetType"], targetId: string, favorite: boolean) {
  await connectDb();
  const tid = oid(targetId);
  if (targetType === "creator" || targetType === "twin") {
    if (!(await CreatorProfile.exists({ _id: tid, status: "approved" }))) throw new NotFoundError("İçerik üreticisi bulunamadı.");
  } else if (!(await ContentItem.exists({ _id: tid, status: "published" }))) {
    throw new NotFoundError("İçerik bulunamadı.");
  }
  const uid = oid(userId);
  if (favorite) {
    await Favorite.updateOne({ userId: uid, targetType, targetId: tid }, { $setOnInsert: { userId: uid, targetType, targetId: tid } }, { upsert: true });
    await AnalyticsEvent.create({ type: "favorite", userId: uid, creatorId: targetType === "content" ? null : tid, contentId: targetType === "content" ? tid : null, props: {} });
  } else {
    await Favorite.deleteOne({ userId: uid, targetType, targetId: tid });
  }
  return { favorite };
}

export async function listFollowing(userId: string) {
  await connectDb();
  const follows = await Follow.find({ followerId: oid(userId) }).sort({ createdAt: -1 }).limit(500).lean();
  return follows.map((f) => ({ creatorId: f.creatorId.toString(), since: f.createdAt, notify: f.notify }));
}

export async function listFavoriteIds(userId: string, targetType: IFavorite["targetType"]) {
  await connectDb();
  const favs = await Favorite.find({ userId: oid(userId), targetType }).sort({ createdAt: -1 }).limit(500).lean();
  return favs.map((f) => ({ id: f.targetId.toString(), since: f.createdAt }));
}
