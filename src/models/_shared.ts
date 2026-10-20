import mongoose, { Schema, type Model } from "mongoose";
import { m } from "@/i18n/m";

export const { Types } = mongoose;
export type ObjectId = mongoose.Types.ObjectId;

/** Hot-reload ve serverless yeniden kullanımında OverwriteModelError'u önler. */
export function defineModel<T>(name: string, schema: Schema<T>, collection: string): Model<T> {
  return (mongoose.models[name] as Model<T> | undefined) ?? mongoose.model<T>(name, schema, collection);
}

export const baseOptions = {
  timestamps: true,
  versionKey: "__v",
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
} as const;

/** Para: küçük birim (kuruş) + ISO 4217 para birimi. Kayan nokta yok. */
export interface Money {
  amountMinor: number;
  currency: string;
}
export const MoneySchema = new Schema<Money>(
  {
    amountMinor: {
      type: Number,
      required: true,
      validate: { validator: Number.isInteger, message: m("Tutar tamsayı (küçük birim) olmalı") },
    },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3, default: "TRY" },
  },
  { _id: false },
);

export const intValidator = {
  validator: (v: number) => Number.isInteger(v),
  message: m("Değer tamsayı olmalı"),
};

/** Defter koleksiyonları için: güncelleme ve silme yasak, düzeltme ters kayıtla yapılır. */
export function immutable<T>(schema: Schema<T>, label: string) {
  const blocked = [
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "replaceOne",
    "findOneAndReplace",
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
  ] as const;
  for (const op of blocked) {
    schema.pre(op, function () {
      // i18n-ignore (geliştirici hatası; kullanıcıya gösterilmez)
      throw new Error(`${label} değişmez bir defterdir; ${op} yapılamaz. Ters kayıt oluşturun.`);
    });
  }
  schema.pre("save", function () {
    // i18n-ignore
    if (!this.isNew) throw new Error(`${label} kaydı oluşturulduktan sonra değiştirilemez.`);
  });
  return schema;
}

/** Durum geçmişi alt belgesi (state machine izleri). */
export interface StatusEvent {
  from: string | null;
  to: string;
  by: ObjectId | null;
  note?: string;
  at: Date;
}
export const StatusEventSchema = new Schema<StatusEvent>(
  {
    from: { type: String, default: null },
    to: { type: String, required: true },
    by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    note: { type: String, maxlength: 2000 },
    at: { type: Date, default: () => new Date() },
  },
  { _id: false },
);
