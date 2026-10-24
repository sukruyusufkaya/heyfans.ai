import { afterAll, describe, expect, it } from "vitest";
import mongoose, { Types } from "mongoose";
import { AiTwin, Category, CreatorApplication, CreatorProfile, MediaAsset } from "@/models";
import { recordSelfDeclaredAge } from "@/services/auth/age";
import { answerAssistantStep, getCreatorAssistantView, submitAssistantApplication } from "@/services/auth/creator-assistant";
import { startCreatorOnboarding } from "@/services/creators/onboarding";
import { makeUser } from "./helpers";

afterAll(async () => {
  await mongoose.connection.db?.dropDatabase();
  await mongoose.disconnect();
});

const image = (ownerId: string, purpose: "avatar" | "cover") =>
  MediaAsset.create({ ownerId: new Types.ObjectId(ownerId), kind: "image", purpose, mime: "image/png", sizeBytes: 1024, storageKey: `public/${purpose}/${ownerId}/${Date.now()}.png`, visibility: "public", status: "ready" }).then((a) => a._id.toString());

describe("creator karşılama asistanı", () => {
  it("tüm sorular sohbetten yanıtlanınca başvuru incelemeye gider", async () => {
    const userId = await makeUser(["fan"], { termsAcceptedAt: new Date(), signupIntent: "creator" });
    await Category.create([{ slug: "seyahat", name: "Seyahat" }, { slug: "yemek", name: "Yemek" }]);
    await startCreatorOnboarding(userId);

    // Başlangıç: hiçbir soru yanıtlanmamış; ilk soru doğum tarihi.
    expect((await getCreatorAssistantView(userId))!.answered).toEqual([]);
    await expect(submitAssistantApplication(userId)).rejects.toThrow(/tüm soruları/);

    await recordSelfDeclaredAge(userId, "1995-03-10");
    expect((await getCreatorAssistantView(userId))!.answered).toEqual(["birthDate"]);

    // Alınmış kullanıcı adı reddedilir.
    const other = await makeUser(["fan", "creator"]);
    await CreatorProfile.create({ userId: new Types.ObjectId(other), username: "alinmis.ad", displayName: "Başkası" });
    await expect(answerAssistantStep(userId, "username", { username: "alinmis.ad" }, null)).rejects.toThrow(/alınmış/);

    await answerAssistantStep(userId, "displayName", { displayName: "Deniz Kreatör" }, null);
    await answerAssistantStep(userId, "username", { username: "Deniz.Kreator" }, null);
    await answerAssistantStep(userId, "avatar", { assetId: await image(userId, "avatar") }, null);
    await answerAssistantStep(userId, "cover", { assetId: null }, null);
    await expect(answerAssistantStep(userId, "categories", { categories: ["yok-boyle-kategori"] }, null)).rejects.toThrow(/geçerli değil/);
    await answerAssistantStep(userId, "categories", { categories: ["seyahat", "yemek"] }, null);
    await expect(answerAssistantStep(userId, "socials", { links: [{ platform: "website", handle: "deniz.com" }] }, null)).rejects.toThrow(/sosyal medya/);
    await answerAssistantStep(userId, "socials", { links: [{ platform: "instagram", handle: "https://instagram.com/Deniz.Kreator/", audience: "10k_50k" }], primary: "instagram" }, null);
    await expect(answerAssistantStep(userId, "bio", { bio: "Kısa", headline: "Kısa" }, null)).rejects.toThrow();
    await answerAssistantStep(userId, "bio", { bio: "Kadıköy'den seyahat ve yemek rehberleri hazırlıyorum. Uygun bütçeli rotalar paylaşırım.", headline: "Kadıköy'den seyahat ve yemek rehberleri" }, null);
    await answerAssistantStep(userId, "location", { location: "" }, null);
    await answerAssistantStep(userId, "tone", { tone: "fun", emoji: "medium" }, null);
    await answerAssistantStep(userId, "greeting", { greeting: "Heyy, selam! Hazır mısın?" }, null);
    await answerAssistantStep(userId, "topics", { blockedTopics: ["Siyaset", "siyaset", "Eski iş yerim"] }, null);
    await answerAssistantStep(userId, "contact", { country: "TR", national: "5321234567", preference: "whatsapp", consent: true }, null);
    await answerAssistantStep(userId, "legalName", { legalName: "Deniz Kreatör" }, null);
    await expect(answerAssistantStep(userId, "consents", { persona: false, knowledge: false }, null)).rejects.toThrow();
    await answerAssistantStep(userId, "consents", { persona: true, knowledge: false }, null);

    const view = (await getCreatorAssistantView(userId))!;
    expect(view.answered).toHaveLength(15);
    expect(view.values).toMatchObject({ username: "deniz.kreator", tone: "fun", emoji: "medium", blockedTopics: ["Siyaset", "Eski iş yerim"], coverUrl: null, location: "" });
    expect(view.values.links).toEqual([expect.objectContaining({ platform: "instagram", handle: "deniz.kreator", audience: "10k_50k", primary: true })]);
    expect(view.values.contact).toMatchObject({ masked: "+90 5** *** ** 67", national: "5321234567", preference: "whatsapp" });

    await submitAssistantApplication(userId);
    const profile = await CreatorProfile.findOne({ userId: new Types.ObjectId(userId) }).lean();
    expect(profile!.status).toBe("pending_review");
    expect(profile!.verification).toMatchObject({ identity: "pending", social: "pending" });
    const app = await CreatorApplication.findOne({ creatorId: profile!._id }).lean();
    expect(app!.status).toBe("submitted");
    const twin = await AiTwin.findOne({ creatorId: profile!._id }).lean();
    expect(twin!.status).toBe("pending_review");
    expect(twin!.draft.persona).toMatchObject({ displayName: "Deniz Kreatör", shortBio: "Kadıköy'den seyahat ve yemek rehberleri", greeting: "Heyy, selam! Hazır mısın?", humor: 85, emojiUsage: "medium" });

    // Gönderimden sonra sohbetten düzenleme yapılamaz.
    await expect(answerAssistantStep(userId, "location", { location: "İstanbul" }, null)).rejects.toThrow(/gönderilmiş/);
  });

  it("eski adım adım sihirbazda yarım kalan başvuru asistanda kaldığı yerden sürer", async () => {
    const userId = await makeUser(["fan"], { termsAcceptedAt: new Date(), signupIntent: "creator" });
    await startCreatorOnboarding(userId);
    await CreatorProfile.updateOne({ userId: new Types.ObjectId(userId) }, { $set: { "onboarding.completedSteps": ["account", "contact"] } });
    const view = (await getCreatorAssistantView(userId))!;
    expect(view.answered).toEqual(["displayName", "username", "categories", "bio", "location", "contact"]);
  });
});
