import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import mongoose, { Schema, type Model } from 'mongoose';
import type {
  BannerRecord,
  CouponRecord,
  OrderRecord,
  ProductRecord,
  StoreSettingsRecord,
  UserRecord,
} from './types.ts';

interface LocalDatabaseState {
  users: UserRecord[];
  products: ProductRecord[];
  orders: OrderRecord[];
  coupons: CouponRecord[];
  banners: BannerRecord[];
  settings: StoreSettingsRecord | null;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'radha_db.json');

let usingMongo = false;

const AddressSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    addresses: { type: [AddressSchema], default: [] },
    wishlist: { type: [String], default: [] },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

const ProductSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, enum: ['Women', 'Men', 'Kids'], required: true },
    subCategory: { type: String, default: 'Ethnic Wear' },
    fabric: { type: String, default: 'Cotton Blend' },
    price: { type: Number, required: true },
    mrp: { type: Number, required: true },
    images: { type: [String], default: [] },
    sizes: { type: [String], default: [] },
    colors: { type: [String], default: [] },
    stock: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { versionKey: false }
);

const OrderItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    image: { type: String, default: '' },
    price: { type: Number, required: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    quantity: { type: Number, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    orderNumber: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerPhone: { type: String, required: true },
    items: { type: [OrderItemSchema], required: true },
    shippingAddress: { type: AddressSchema, required: true },
    subtotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    couponCode: { type: String },
    deliveryCharge: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['COD', 'UPI_QR'], required: true },
    paymentReference: { type: String },
    paymentStatus: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
    status: {
      type: String,
      enum: ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Placed',
    },
    statusHistory: {
      type: [
        new Schema(
          {
            status: String,
            note: String,
            timestamp: String,
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { versionKey: false }
);

const CouponSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    discountType: { type: String, enum: ['percent', 'flat'], required: true },
    discountValue: { type: Number, required: true },
    minOrderAmount: { type: Number, default: 0 },
    maxDiscount: { type: Number },
    isActive: { type: Boolean, default: true },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

const BannerSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    ctaLabel: { type: String, default: 'Shop Collection' },
    categoryLink: { type: String, enum: ['All', 'Women', 'Men', 'Kids'], default: 'All' },
    imageUrl: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 1 },
    createdAt: { type: String, required: true },
  },
  { versionKey: false }
);

const StoreSettingsSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    storeName: { type: String, required: true },
    tagline: { type: String, required: true },
    brandContact: { type: String, required: true },
    proprietor: { type: String, required: true },
    phone: { type: String, required: true },
    whatsapp: { type: String, required: true },
    alternatePhone: { type: String, default: '' },
    address: { type: String, required: true },
    upiId: { type: String, default: '' },
    paymentQrUrl: { type: String, default: '' },
    freeDeliveryThreshold: { type: Number, default: 799 },
    deliveryCharge: { type: Number, default: 49 },
    theme: {
      primaryColor: { type: String, default: '#6B21A8' },
      accentColor: { type: String, default: '#DB2777' },
      softBgColor: { type: String, default: '#FDF2F8' },
    },
    updatedAt: { type: String, required: true },
  },
  { versionKey: false }
);

const UserModel = (mongoose.models.User as Model<UserRecord>) || mongoose.model<UserRecord>('User', UserSchema);
const ProductModel = (mongoose.models.Product as Model<ProductRecord>) || mongoose.model<ProductRecord>('Product', ProductSchema);
const OrderModel = (mongoose.models.Order as Model<OrderRecord>) || mongoose.model<OrderRecord>('Order', OrderSchema);
const CouponModel = (mongoose.models.Coupon as Model<CouponRecord>) || mongoose.model<CouponRecord>('Coupon', CouponSchema);
const BannerModel = (mongoose.models.Banner as Model<BannerRecord>) || mongoose.model<BannerRecord>('Banner', BannerSchema);
const StoreSettingsModel =
  (mongoose.models.StoreSettings as Model<StoreSettingsRecord>) ||
  mongoose.model<StoreSettingsRecord>('StoreSettings', StoreSettingsSchema);

function ensureLocalFile(): LocalDatabaseState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const empty: LocalDatabaseState = {
      users: [],
      products: [],
      orders: [],
      coupons: [],
      banners: [],
      settings: null,
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(empty, null, 2), 'utf-8');
    return empty;
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw) as LocalDatabaseState;
}

function writeLocalFile(state: LocalDatabaseState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DATA_FILE);
}

function stripMongoInternal<T>(doc: unknown): T {
  const obj = typeof (doc as { toObject?: () => Record<string, unknown> })?.toObject === 'function'
    ? (doc as { toObject: () => Record<string, unknown> }).toObject()
    : ({ ...(doc as Record<string, unknown>) });
  delete obj._id;
  return obj as T;
}

export function generateId(prefix = ''): string {
  return prefix ? `${prefix}_${crypto.randomUUID().slice(0, 12)}` : crypto.randomUUID();
}

export async function connectDatabase(): Promise<{ engine: 'mongodb' | 'local-document-store' }> {
  const uri = process.env.MONGODB_URI?.trim();
  if (uri) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      usingMongo = true;
      return { engine: 'mongodb' };
    } catch (err) {
      console.warn('MongoDB connection failed, falling back to persistent local document store:', (err as Error).message);
    }
  }
  ensureLocalFile();
  usingMongo = false;
  return { engine: 'local-document-store' };
}

export function getDatabaseEngine(): 'mongodb' | 'local-document-store' {
  return usingMongo ? 'mongodb' : 'local-document-store';
}

export const db = {
  users: {
    async count(): Promise<number> {
      if (usingMongo) return UserModel.countDocuments();
      return ensureLocalFile().users.length;
    },
    async findById(id: string): Promise<UserRecord | null> {
      if (usingMongo) {
        const doc = await UserModel.findOne({ id });
        return doc ? stripMongoInternal<UserRecord>(doc) : null;
      }
      return ensureLocalFile().users.find((u) => u.id === id) || null;
    },
    async findByEmailOrPhone(identifier: string): Promise<UserRecord | null> {
      const normalized = identifier.trim().toLowerCase();
      if (usingMongo) {
        const doc = await UserModel.findOne({
          $or: [{ email: normalized }, { phone: identifier.trim() }],
        });
        return doc ? stripMongoInternal<UserRecord>(doc) : null;
      }
      return (
        ensureLocalFile().users.find(
          (u) => u.email.toLowerCase() === normalized || u.phone === identifier.trim()
        ) || null
      );
    },
    async create(user: UserRecord): Promise<UserRecord> {
      if (usingMongo) {
        const created = await UserModel.create(user);
        return stripMongoInternal<UserRecord>(created);
      }
      const state = ensureLocalFile();
      state.users.push(user);
      writeLocalFile(state);
      return user;
    },
    async updateById(id: string, patch: Partial<UserRecord>): Promise<UserRecord | null> {
      if (usingMongo) {
        const updated = await UserModel.findOneAndUpdate({ id }, { $set: patch }, { new: true });
        return updated ? stripMongoInternal<UserRecord>(updated) : null;
      }
      const state = ensureLocalFile();
      const idx = state.users.findIndex((u) => u.id === id);
      if (idx === -1) return null;
      state.users[idx] = { ...state.users[idx], ...patch };
      writeLocalFile(state);
      return state.users[idx];
    },
  },

  products: {
    async count(): Promise<number> {
      if (usingMongo) return ProductModel.countDocuments();
      return ensureLocalFile().products.length;
    },
    async findAll(includeInactive = false): Promise<ProductRecord[]> {
      if (usingMongo) {
        const filter = includeInactive ? {} : { isActive: true };
        const docs = await ProductModel.find(filter).sort({ createdAt: -1 });
        return docs.map((d) => stripMongoInternal<ProductRecord>(d));
      }
      const items = ensureLocalFile().products.filter((p) => includeInactive || p.isActive);
      return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async findById(id: string): Promise<ProductRecord | null> {
      if (usingMongo) {
        const doc = await ProductModel.findOne({ id });
        return doc ? stripMongoInternal<ProductRecord>(doc) : null;
      }
      return ensureLocalFile().products.find((p) => p.id === id) || null;
    },
    async create(product: ProductRecord): Promise<ProductRecord> {
      if (usingMongo) {
        const created = await ProductModel.create(product);
        return stripMongoInternal<ProductRecord>(created);
      }
      const state = ensureLocalFile();
      state.products.unshift(product);
      writeLocalFile(state);
      return product;
    },
    async updateById(id: string, patch: Partial<ProductRecord>): Promise<ProductRecord | null> {
      if (usingMongo) {
        const updated = await ProductModel.findOneAndUpdate({ id }, { $set: patch }, { new: true });
        return updated ? stripMongoInternal<ProductRecord>(updated) : null;
      }
      const state = ensureLocalFile();
      const idx = state.products.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      state.products[idx] = { ...state.products[idx], ...patch };
      writeLocalFile(state);
      return state.products[idx];
    },
    async deleteById(id: string): Promise<boolean> {
      if (usingMongo) {
        const res = await ProductModel.deleteOne({ id });
        return (res.deletedCount ?? 0) > 0;
      }
      const state = ensureLocalFile();
      const prevLen = state.products.length;
      state.products = state.products.filter((p) => p.id !== id);
      if (state.products.length === prevLen) return false;
      writeLocalFile(state);
      return true;
    },
  },

  orders: {
    async findAll(): Promise<OrderRecord[]> {
      if (usingMongo) {
        const docs = await OrderModel.find({}).sort({ createdAt: -1 });
        return docs.map((d) => stripMongoInternal<OrderRecord>(d));
      }
      return [...ensureLocalFile().orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async findByUserId(userId: string): Promise<OrderRecord[]> {
      if (usingMongo) {
        const docs = await OrderModel.find({ userId }).sort({ createdAt: -1 });
        return docs.map((d) => stripMongoInternal<OrderRecord>(d));
      }
      return ensureLocalFile()
        .orders.filter((o) => o.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async findById(id: string): Promise<OrderRecord | null> {
      if (usingMongo) {
        const doc = await OrderModel.findOne({ id });
        return doc ? stripMongoInternal<OrderRecord>(doc) : null;
      }
      return ensureLocalFile().orders.find((o) => o.id === id) || null;
    },
    async create(order: OrderRecord): Promise<OrderRecord> {
      if (usingMongo) {
        const created = await OrderModel.create(order);
        return stripMongoInternal<OrderRecord>(created);
      }
      const state = ensureLocalFile();
      state.orders.unshift(order);
      writeLocalFile(state);
      return order;
    },
    async updateById(id: string, patch: Partial<OrderRecord>): Promise<OrderRecord | null> {
      if (usingMongo) {
        const updated = await OrderModel.findOneAndUpdate({ id }, { $set: patch }, { new: true });
        return updated ? stripMongoInternal<OrderRecord>(updated) : null;
      }
      const state = ensureLocalFile();
      const idx = state.orders.findIndex((o) => o.id === id);
      if (idx === -1) return null;
      state.orders[idx] = { ...state.orders[idx], ...patch };
      writeLocalFile(state);
      return state.orders[idx];
    },
  },

  coupons: {
    async count(): Promise<number> {
      if (usingMongo) return CouponModel.countDocuments();
      return ensureLocalFile().coupons.length;
    },
    async findAll(): Promise<CouponRecord[]> {
      if (usingMongo) {
        const docs = await CouponModel.find({}).sort({ createdAt: -1 });
        return docs.map((d) => stripMongoInternal<CouponRecord>(d));
      }
      return [...ensureLocalFile().coupons].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async findByCode(code: string): Promise<CouponRecord | null> {
      const normalized = code.trim().toUpperCase();
      if (usingMongo) {
        const doc = await CouponModel.findOne({ code: normalized });
        return doc ? stripMongoInternal<CouponRecord>(doc) : null;
      }
      return ensureLocalFile().coupons.find((c) => c.code.toUpperCase() === normalized) || null;
    },
    async create(coupon: CouponRecord): Promise<CouponRecord> {
      if (usingMongo) {
        const created = await CouponModel.create(coupon);
        return stripMongoInternal<CouponRecord>(created);
      }
      const state = ensureLocalFile();
      state.coupons.unshift(coupon);
      writeLocalFile(state);
      return coupon;
    },
    async updateById(id: string, patch: Partial<CouponRecord>): Promise<CouponRecord | null> {
      if (usingMongo) {
        const updated = await CouponModel.findOneAndUpdate({ id }, { $set: patch }, { new: true });
        return updated ? stripMongoInternal<CouponRecord>(updated) : null;
      }
      const state = ensureLocalFile();
      const idx = state.coupons.findIndex((c) => c.id === id);
      if (idx === -1) return null;
      state.coupons[idx] = { ...state.coupons[idx], ...patch };
      writeLocalFile(state);
      return state.coupons[idx];
    },
    async deleteById(id: string): Promise<boolean> {
      if (usingMongo) {
        const res = await CouponModel.deleteOne({ id });
        return (res.deletedCount ?? 0) > 0;
      }
      const state = ensureLocalFile();
      const prevLen = state.coupons.length;
      state.coupons = state.coupons.filter((c) => c.id !== id);
      if (state.coupons.length === prevLen) return false;
      writeLocalFile(state);
      return true;
    },
  },

  banners: {
    async count(): Promise<number> {
      if (usingMongo) return BannerModel.countDocuments();
      return ensureLocalFile().banners.length;
    },
    async findAll(includeInactive = false): Promise<BannerRecord[]> {
      if (usingMongo) {
        const filter = includeInactive ? {} : { isActive: true };
        const docs = await BannerModel.find(filter).sort({ sortOrder: 1, createdAt: -1 });
        return docs.map((d) => stripMongoInternal<BannerRecord>(d));
      }
      return ensureLocalFile()
        .banners.filter((b) => includeInactive || b.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async create(banner: BannerRecord): Promise<BannerRecord> {
      if (usingMongo) {
        const created = await BannerModel.create(banner);
        return stripMongoInternal<BannerRecord>(created);
      }
      const state = ensureLocalFile();
      state.banners.push(banner);
      writeLocalFile(state);
      return banner;
    },
    async updateById(id: string, patch: Partial<BannerRecord>): Promise<BannerRecord | null> {
      if (usingMongo) {
        const updated = await BannerModel.findOneAndUpdate({ id }, { $set: patch }, { new: true });
        return updated ? stripMongoInternal<BannerRecord>(updated) : null;
      }
      const state = ensureLocalFile();
      const idx = state.banners.findIndex((b) => b.id === id);
      if (idx === -1) return null;
      state.banners[idx] = { ...state.banners[idx], ...patch };
      writeLocalFile(state);
      return state.banners[idx];
    },
    async deleteById(id: string): Promise<boolean> {
      if (usingMongo) {
        const res = await BannerModel.deleteOne({ id });
        return (res.deletedCount ?? 0) > 0;
      }
      const state = ensureLocalFile();
      const prevLen = state.banners.length;
      state.banners = state.banners.filter((b) => b.id !== id);
      if (state.banners.length === prevLen) return false;
      writeLocalFile(state);
      return true;
    },
  },

  settings: {
    async get(): Promise<StoreSettingsRecord | null> {
      if (usingMongo) {
        const doc = await StoreSettingsModel.findOne({ id: 'store_default' });
        return doc ? stripMongoInternal<StoreSettingsRecord>(doc) : null;
      }
      return ensureLocalFile().settings;
    },
    async upsert(settings: StoreSettingsRecord): Promise<StoreSettingsRecord> {
      if (usingMongo) {
        const doc = await StoreSettingsModel.findOneAndUpdate(
          { id: 'store_default' },
          { $set: settings },
          { upsert: true, new: true }
        );
        return stripMongoInternal<StoreSettingsRecord>(doc);
      }
      const state = ensureLocalFile();
      state.settings = settings;
      writeLocalFile(state);
      return settings;
    },
  },
};
