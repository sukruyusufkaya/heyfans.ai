import "server-only";
import { connectDb, getNativeDb } from "@/lib/db/mongo";
import { oid } from "@/lib/validation/common";
import { User } from "@/models/identity";

/**
 * 2FA durumu veritabanından okunur (oturum çerez önbelleği en çok 5 dk eski olabilir).
 * `hasPassword`: parola doğrulaması gerektiren işlemler (etkinleştir/kapat) için hesabın şifresi var mı?
 */
export async function getMfaState(userId: string) {
  await connectDb();
  const id = oid(userId);
  const [user, credential] = await Promise.all([
    User.findById(id, { twoFactorEnabled: 1 }).lean(),
    getNativeDb().then((db) => db.collection("accounts").findOne({ userId: { $in: [id, id.toHexString()] }, providerId: "credential" } as never, { projection: { _id: 1 } })),
  ]);
  return { enabled: !!user?.twoFactorEnabled, hasPassword: !!credential };
}
