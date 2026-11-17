export type UserRole = 'customer' | 'admin';

export type OrderStatus =
  | 'Placed'
  | 'Confirmed'
  | 'Packed'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  addresses: Address[];
  wishlist: string[];
  createdAt: string;
}

export interface ProductRecord {
  id: string;
  name: string;
  description: string;
  category: 'Women' | 'Men' | 'Kids';
  subCategory: string;
  fabric: string;
  price: number;
  mrp: number;
  images: string[];
  sizes: string[];
  colors: string[];
  stock: number;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  size: string;
  color: string;
  quantity: number;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  shippingAddress: Address;
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  deliveryCharge: number;
  totalAmount: number;
  paymentMethod: 'COD' | 'UPI_QR';
  paymentReference?: string;
  paymentStatus: 'Pending' | 'Paid';
  status: OrderStatus;
  statusHistory: { status: OrderStatus; note: string; timestamp: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface CouponRecord {
  id: string;
  code: string;
  description: string;
  discountType: 'percent' | 'flat';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  isActive: boolean;
  createdAt: string;
}

export interface BannerRecord {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  categoryLink: 'All' | 'Women' | 'Men' | 'Kids';
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface StoreSettingsRecord {
  id: string;
  storeName: string;
  tagline: string;
  brandContact: string;
  proprietor: string;
  phone: string;
  whatsapp: string;
  alternatePhone: string;
  address: string;
  upiId: string;
  paymentQrUrl: string;
  freeDeliveryThreshold: number;
  deliveryCharge: number;
  theme: {
    primaryColor: string;
    accentColor: string;
    softBgColor: string;
  };
  updatedAt: string;
}
