import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  hashPassword,
  requireAdmin,
  requireAuth,
  sanitizeUser,
  signAuthToken,
  verifyPassword,
  type AuthenticatedRequest,
} from './server/auth.ts';
import { connectDatabase, db, generateId, getDatabaseEngine } from './server/db.ts';
import { seedInitialData } from './server/seed.ts';
import type {
  Address,
  BannerRecord,
  CouponRecord,
  OrderItem,
  OrderRecord,
  OrderStatus,
  ProductRecord,
} from './server/types.ts';

const PORT = Number(process.env.PORT || 3000);
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
    cb(null, `radha_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WebP) are allowed.'));
    }
  },
});

function calculateCouponDiscount(coupon: CouponRecord, subtotal: number): number {
  if (!coupon.isActive || subtotal < coupon.minOrderAmount) return 0;
  if (coupon.discountType === 'flat') {
    return Math.min(coupon.discountValue, subtotal);
  }
  const raw = Math.round((subtotal * coupon.discountValue) / 100);
  return coupon.maxDiscount ? Math.min(raw, coupon.maxDiscount, subtotal) : Math.min(raw, subtotal);
}

async function startServer() {
  const { engine } = await connectDatabase();
  await seedInitialData();
  console.log(`Database ready (${engine})`);

  const app = express();
  app.use(express.json({ limit: '5mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Health & Store Bootstrap
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, dbEngine: getDatabaseEngine() });
  });

  app.get('/api/store', async (_req: Request, res: Response) => {
    const [settings, banners] = await Promise.all([
      db.settings.get(),
      db.banners.findAll(false),
    ]);
    res.json({ settings, banners });
  });

  // Authentication Routes
  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const { name, email, phone, password } = req.body as {
        name?: string;
        email?: string;
        phone?: string;
        password?: string;
      };

      if (!name?.trim() || !phone?.trim() || !email?.trim() || !password) {
        res.status(400).json({ error: 'Name, email, phone, and password are required.' });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters.' });
        return;
      }

      const existingByEmail = await db.users.findByEmailOrPhone(email.trim().toLowerCase());
      if (existingByEmail) {
        res.status(409).json({ error: 'An account with this email already exists.' });
        return;
      }
      const existingByPhone = await db.users.findByEmailOrPhone(phone.trim());
      if (existingByPhone) {
        res.status(409).json({ error: 'An account with this phone number already exists.' });
        return;
      }

      const passwordHash = await hashPassword(password);
      const user = await db.users.create({
        id: generateId('usr'),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        passwordHash,
        role: 'customer',
        addresses: [],
        wishlist: [],
        createdAt: new Date().toISOString(),
      });

      const token = signAuthToken({ userId: user.id, role: user.role });
      res.status(201).json({ token, user: sanitizeUser(user) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message || 'Registration failed.' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { identifier, password, requireAdminRole } = req.body as {
        identifier?: string;
        password?: string;
        requireAdminRole?: boolean;
      };
      if (!identifier?.trim() || !password) {
        res.status(400).json({ error: 'Email/phone and password are required.' });
        return;
      }

      const user = await db.users.findByEmailOrPhone(identifier.trim());
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials.' });
        return;
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: 'Invalid credentials.' });
        return;
      }

      if (requireAdminRole && user.role !== 'admin') {
        res.status(403).json({ error: 'Only authorized administrators can access the dashboard.' });
        return;
      }

      const token = signAuthToken({ userId: user.id, role: user.role });
      res.json({ token, user: sanitizeUser(user) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message || 'Login failed.' });
    }
  });

  app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: sanitizeUser(req.user!) });
  });

  app.put('/api/auth/addresses', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { addresses } = req.body as { addresses?: Address[] };
    if (!Array.isArray(addresses)) {
      res.status(400).json({ error: 'Addresses must be an array.' });
      return;
    }
    const sanitizedAddresses = addresses.map((a) => ({
      id: a.id || generateId('addr'),
      label: String(a.label || 'Home').trim(),
      fullName: String(a.fullName || '').trim(),
      phone: String(a.phone || '').trim(),
      street: String(a.street || '').trim(),
      city: String(a.city || '').trim(),
      state: String(a.state || 'Uttar Pradesh').trim(),
      pincode: String(a.pincode || '').trim(),
      isDefault: Boolean(a.isDefault),
    }));
    const updated = await db.users.updateById(req.user!.id, { addresses: sanitizedAddresses });
    res.json({ user: sanitizeUser(updated!) });
  });

  app.post('/api/auth/wishlist', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const { productId } = req.body as { productId?: string };
    if (!productId) {
      res.status(400).json({ error: 'productId is required.' });
      return;
    }
    const current = req.user!.wishlist || [];
    const exists = current.includes(productId);
    const nextWishlist = exists
      ? current.filter((id) => id !== productId)
      : [...current, productId];
    const updated = await db.users.updateById(req.user!.id, { wishlist: nextWishlist });
    res.json({ wishlist: updated!.wishlist, user: sanitizeUser(updated!) });
  });

  // Public Product Catalog
  app.get('/api/products', async (req: Request, res: Response) => {
    const { category, search, size, maxPrice, sort, includeInactive } = req.query as Record<string, string>;
    let items = await db.products.findAll(includeInactive === 'true');

    if (category && category !== 'All') {
      items = items.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }
    if (search?.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.subCategory.toLowerCase().includes(q) ||
          p.fabric.toLowerCase().includes(q) ||
          p.colors.some((c) => c.toLowerCase().includes(q))
      );
    }
    if (size && size !== 'All') {
      items = items.filter((p) => p.sizes.includes(size));
    }
    if (maxPrice && !Number.isNaN(Number(maxPrice))) {
      items = items.filter((p) => p.price <= Number(maxPrice));
    }

    if (sort === 'price_asc') {
      items.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_desc') {
      items.sort((a, b) => b.price - a.price);
    } else if (sort === 'featured') {
      items.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    }

    res.json({ products: items });
  });

  app.get('/api/products/:id', async (req: Request, res: Response) => {
    const product = await db.products.findById(String(req.params.id));
    if (!product) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    res.json({ product });
  });

  // Coupon Validation
  app.post('/api/coupons/validate', async (req: Request, res: Response) => {
    const { code, subtotal } = req.body as { code?: string; subtotal?: number };
    if (!code?.trim()) {
      res.status(400).json({ error: 'Please enter a coupon code.' });
      return;
    }
    const coupon = await db.coupons.findByCode(code);
    if (!coupon || !coupon.isActive) {
      res.status(404).json({ error: 'Coupon code is invalid or expired.' });
      return;
    }
    const orderSub = Number(subtotal || 0);
    if (orderSub < coupon.minOrderAmount) {
      res.status(400).json({
        error: `Minimum order of ₹${coupon.minOrderAmount} required for ${coupon.code}.`,
      });
      return;
    }
    const discountAmount = calculateCouponDiscount(coupon, orderSub);
    res.json({ coupon, discountAmount });
  });

  // Customer Order Checkout & History
  app.post('/api/orders', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { items, shippingAddress, couponCode, paymentMethod, paymentReference } = req.body as {
        items?: { productId: string; size: string; color: string; quantity: number }[];
        shippingAddress?: Address;
        couponCode?: string;
        paymentMethod?: 'COD' | 'UPI_QR';
        paymentReference?: string;
      };

      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'Your shopping bag is empty.' });
        return;
      }
      if (
        !shippingAddress?.fullName?.trim() ||
        !shippingAddress?.phone?.trim() ||
        !shippingAddress?.street?.trim() ||
        !shippingAddress?.city?.trim() ||
        !shippingAddress?.pincode?.trim()
      ) {
        res.status(400).json({ error: 'Complete shipping address is required.' });
        return;
      }

      const verifiedItems: OrderItem[] = [];
      let subtotal = 0;

      for (const reqItem of items) {
        const product = await db.products.findById(reqItem.productId);
        if (!product || !product.isActive) {
          res.status(400).json({ error: 'One of the products in your bag is unavailable.' });
          return;
        }
        const qty = Math.max(1, Math.floor(Number(reqItem.quantity || 1)));
        if (product.stock < qty) {
          res.status(400).json({
            error: `Insufficient stock for ${product.name}. Only ${product.stock} left.`,
          });
          return;
        }
        subtotal += product.price * qty;
        verifiedItems.push({
          productId: product.id,
          name: product.name,
          image: product.images[0] || '',
          price: product.price,
          size: reqItem.size || product.sizes[0] || 'Free Size',
          color: reqItem.color || product.colors[0] || 'Default',
          quantity: qty,
        });
      }

      let discountAmount = 0;
      let appliedCode: string | undefined;
      if (couponCode?.trim()) {
        const coupon = await db.coupons.findByCode(couponCode);
        if (coupon && coupon.isActive && subtotal >= coupon.minOrderAmount) {
          discountAmount = calculateCouponDiscount(coupon, subtotal);
          appliedCode = coupon.code;
        }
      }

      const settings = await db.settings.get();
      const freeThreshold = settings?.freeDeliveryThreshold ?? 799;
      const baseDelivery = settings?.deliveryCharge ?? 49;
      const afterDiscount = Math.max(0, subtotal - discountAmount);
      const deliveryCharge = afterDiscount >= freeThreshold ? 0 : baseDelivery;
      const totalAmount = afterDiscount + deliveryCharge;

      const method = paymentMethod === 'UPI_QR' ? 'UPI_QR' : 'COD';
      if (method === 'UPI_QR' && !paymentReference?.trim()) {
        res.status(400).json({ error: 'Please enter the UPI Transaction / UTR Reference ID.' });
        return;
      }

      // Decrement product stock
      for (const item of verifiedItems) {
        const prod = await db.products.findById(item.productId);
        if (prod) {
          await db.products.updateById(prod.id, {
            stock: Math.max(0, prod.stock - item.quantity),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      const now = new Date().toISOString();
      const existingOrders = await db.orders.findAll();
      const orderNumber = `RCS-${1001 + existingOrders.length}`;

      const order: OrderRecord = {
        id: generateId('ord'),
        orderNumber,
        userId: req.user!.id,
        customerName: shippingAddress.fullName.trim(),
        customerPhone: shippingAddress.phone.trim(),
        items: verifiedItems,
        shippingAddress: {
          ...shippingAddress,
          id: shippingAddress.id || generateId('addr'),
          label: shippingAddress.label || 'Delivery',
        },
        subtotal,
        discountAmount,
        couponCode: appliedCode,
        deliveryCharge,
        totalAmount,
        paymentMethod: method,
        paymentReference: paymentReference?.trim() || undefined,
        paymentStatus: method === 'UPI_QR' ? 'Paid' : 'Pending',
        status: 'Placed',
        statusHistory: [
          {
            status: 'Placed',
            note: 'Order placed by customer',
            timestamp: now,
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      await db.orders.create(order);
      res.status(201).json({ order });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message || 'Could not place order.' });
    }
  });

  app.get('/api/orders/my', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const orders = await db.orders.findByUserId(req.user!.id);
    res.json({ orders });
  });

  app.get('/api/orders/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    const order = await db.orders.findById(String(req.params.id));
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }
    // Strict security check: customer can only view their own order
    if (order.userId !== req.user!.id && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: You cannot access another customer order.' });
      return;
    }
    res.json({ order });
  });

  // ============================================================================
  // ADMIN ONLY ROUTES (Strict RBAC protected by requireAdmin)
  // ============================================================================

  app.post(
    '/api/upload',
    requireAdmin,
    upload.array('images', 6),
    (req: AuthenticatedRequest, res: Response) => {
      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length === 0) {
        res.status(400).json({ error: 'No image files uploaded.' });
        return;
      }
      const urls = files.map((f) => `/uploads/${f.filename}`);
      res.status(201).json({ urls, url: urls[0] });
    }
  );

  app.get('/api/admin/stats', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
    const [orders, products, coupons, banners] = await Promise.all([
      db.orders.findAll(),
      db.products.findAll(true),
      db.coupons.findAll(),
      db.banners.findAll(true),
    ]);

    const nonCancelledOrders = orders.filter((o) => o.status !== 'Cancelled');
    const totalRevenue = nonCancelledOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalOrders = orders.length;
    const deliveredOrders = orders.filter((o) => o.status === 'Delivered').length;
    const pendingOrders = orders.filter((o) =>
      ['Placed', 'Confirmed', 'Packed', 'Shipped'].includes(o.status)
    ).length;
    const lowStockProducts = products.filter((p) => p.stock <= 5).length;

    // Real daily business growth grouped by date (YYYY-MM-DD)
    const dailyMap = new Map<string, { date: string; orders: number; revenue: number }>();
    for (const order of nonCancelledOrders) {
      const dateKey = order.createdAt.slice(0, 10);
      const existing = dailyMap.get(dateKey) || { date: dateKey, orders: 0, revenue: 0 };
      existing.orders += 1;
      existing.revenue += order.totalAmount;
      dailyMap.set(dateKey, existing);
    }
    const dailyGrowth = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      stats: {
        totalRevenue,
        totalOrders,
        deliveredOrders,
        pendingOrders,
        totalProducts: products.length,
        lowStockProducts,
        activeCoupons: coupons.filter((c) => c.isActive).length,
        activeBanners: banners.filter((b) => b.isActive).length,
        dailyGrowth,
        dbEngine: getDatabaseEngine(),
      },
    });
  });

  // Admin Product Management
  app.post('/api/products', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = req.body as Partial<ProductRecord>;
      if (!body.name?.trim() || !body.category || body.price === undefined) {
        res.status(400).json({ error: 'Product name, category, and price are required.' });
        return;
      }
      const now = new Date().toISOString();
      const product: ProductRecord = {
        id: generateId('prd'),
        name: body.name.trim(),
        description: String(body.description || '').trim(),
        category: body.category,
        subCategory: String(body.subCategory || 'Ethnic Wear').trim(),
        fabric: String(body.fabric || 'Cotton Blend').trim(),
        price: Number(body.price),
        mrp: Number(body.mrp || body.price),
        images: Array.isArray(body.images) && body.images.length > 0 ? body.images : [],
        sizes: Array.isArray(body.sizes) && body.sizes.length > 0 ? body.sizes : ['Free Size'],
        colors: Array.isArray(body.colors) && body.colors.length > 0 ? body.colors : ['Purple'],
        stock: Math.max(0, Number(body.stock ?? 10)),
        isFeatured: Boolean(body.isFeatured),
        isActive: body.isActive !== false,
        createdAt: now,
        updatedAt: now,
      };
      const created = await db.products.create(product);
      res.status(201).json({ product: created });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message || 'Failed to add product.' });
    }
  });

  app.put('/api/products/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id);
    const existing = await db.products.findById(id);
    if (!existing) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    const body = req.body as Partial<ProductRecord>;
    const updated = await db.products.updateById(id, {
      ...body,
      price: body.price !== undefined ? Number(body.price) : existing.price,
      mrp: body.mrp !== undefined ? Number(body.mrp) : existing.mrp,
      stock: body.stock !== undefined ? Math.max(0, Number(body.stock)) : existing.stock,
      updatedAt: new Date().toISOString(),
    });
    res.json({ product: updated });
  });

  app.delete('/api/products/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const deleted = await db.products.deleteById(String(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }
    res.json({ ok: true });
  });

  // Admin Order Management
  app.get('/api/admin/orders', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
    const orders = await db.orders.findAll();
    res.json({ orders });
  });

  app.patch('/api/admin/orders/:id/status', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id);
    const { status, note, paymentStatus } = req.body as {
      status?: OrderStatus;
      note?: string;
      paymentStatus?: 'Pending' | 'Paid';
    };

    const validStatuses: OrderStatus[] = [
      'Placed',
      'Confirmed',
      'Packed',
      'Shipped',
      'Delivered',
      'Cancelled',
    ];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid order status.' });
      return;
    }

    const order = await db.orders.findById(id);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    const now = new Date().toISOString();
    const updatedHistory = [
      ...(order.statusHistory || []),
      {
        status,
        note: note?.trim() || `Status updated to ${status} by admin`,
        timestamp: now,
      },
    ];

    const updated = await db.orders.updateById(id, {
      status,
      paymentStatus: paymentStatus || (status === 'Delivered' ? 'Paid' : order.paymentStatus),
      statusHistory: updatedHistory,
      updatedAt: now,
    });

    res.json({ order: updated });
  });

  // Admin Coupon Management
  app.get('/api/admin/coupons', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
    const coupons = await db.coupons.findAll();
    res.json({ coupons });
  });

  app.post('/api/admin/coupons', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const body = req.body as Partial<CouponRecord>;
    if (!body.code?.trim() || !body.discountValue) {
      res.status(400).json({ error: 'Coupon code and discount value are required.' });
      return;
    }
    const existing = await db.coupons.findByCode(body.code);
    if (existing) {
      res.status(409).json({ error: 'A coupon with this code already exists.' });
      return;
    }
    const coupon: CouponRecord = {
      id: generateId('cpn'),
      code: body.code.trim().toUpperCase(),
      description: String(body.description || '').trim(),
      discountType: body.discountType === 'flat' ? 'flat' : 'percent',
      discountValue: Number(body.discountValue),
      minOrderAmount: Number(body.minOrderAmount || 0),
      maxDiscount: body.maxDiscount ? Number(body.maxDiscount) : undefined,
      isActive: body.isActive !== false,
      createdAt: new Date().toISOString(),
    };
    const created = await db.coupons.create(coupon);
    res.status(201).json({ coupon: created });
  });

  app.patch('/api/admin/coupons/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const updated = await db.coupons.updateById(String(req.params.id), req.body);
    if (!updated) {
      res.status(404).json({ error: 'Coupon not found.' });
      return;
    }
    res.json({ coupon: updated });
  });

  app.delete('/api/admin/coupons/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const deleted = await db.coupons.deleteById(String(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: 'Coupon not found.' });
      return;
    }
    res.json({ ok: true });
  });

  // Admin Banner Management
  app.get('/api/admin/banners', requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
    const banners = await db.banners.findAll(true);
    res.json({ banners });
  });

  app.post('/api/admin/banners', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const body = req.body as Partial<BannerRecord>;
    if (!body.title?.trim() || !body.imageUrl?.trim()) {
      res.status(400).json({ error: 'Banner title and image are required.' });
      return;
    }
    const banner: BannerRecord = {
      id: generateId('bnr'),
      title: body.title.trim(),
      subtitle: String(body.subtitle || '').trim(),
      ctaLabel: String(body.ctaLabel || 'Shop Collection').trim(),
      categoryLink: body.categoryLink || 'All',
      imageUrl: body.imageUrl.trim(),
      isActive: body.isActive !== false,
      sortOrder: Number(body.sortOrder || 1),
      createdAt: new Date().toISOString(),
    };
    const created = await db.banners.create(banner);
    res.status(201).json({ banner: created });
  });

  app.put('/api/admin/banners/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const updated = await db.banners.updateById(String(req.params.id), req.body);
    if (!updated) {
      res.status(404).json({ error: 'Banner not found.' });
      return;
    }
    res.json({ banner: updated });
  });

  app.delete('/api/admin/banners/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const deleted = await db.banners.deleteById(String(req.params.id));
    if (!deleted) {
      res.status(404).json({ error: 'Banner not found.' });
      return;
    }
    res.json({ ok: true });
  });

  // Admin Store Settings, Payment QR & Theme
  app.put('/api/admin/store', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
    const current = await db.settings.get();
    if (!current) {
      res.status(404).json({ error: 'Store settings not found.' });
      return;
    }
    const body = req.body;
    const updated = await db.settings.upsert({
      ...current,
      ...body,
      id: 'store_default',
      theme: {
        ...current.theme,
        ...(body.theme || {}),
      },
      freeDeliveryThreshold:
        body.freeDeliveryThreshold !== undefined
          ? Number(body.freeDeliveryThreshold)
          : current.freeDeliveryThreshold,
      deliveryCharge:
        body.deliveryCharge !== undefined ? Number(body.deliveryCharge) : current.deliveryCharge,
      updatedAt: new Date().toISOString(),
    });
    res.json({ settings: updated });
  });

  // Vite / Static Frontend Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Radha Clothes Shop running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
