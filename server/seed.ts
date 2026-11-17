import { hashPassword } from './auth.ts';
import { db, generateId } from './db.ts';
import type { BannerRecord, CouponRecord, ProductRecord, StoreSettingsRecord } from './types.ts';

export async function seedInitialData(): Promise<void> {
  const now = new Date().toISOString();

  // 1. Seed initial Admin user if no users exist
  const userCount = await db.users.count();
  if (userCount === 0) {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@radhaclothesshop.in').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'RadhaAdmin@2026';
    const passwordHash = await hashPassword(adminPassword);

    await db.users.create({
      id: generateId('usr'),
      name: 'Aman Singh (Admin)',
      email: adminEmail,
      phone: '8081465761',
      passwordHash,
      role: 'admin',
      addresses: [],
      wishlist: [],
      createdAt: now,
    });
  }

  // 2. Seed Store Settings with Radha Clothes Shop details
  const existingSettings = await db.settings.get();
  if (!existingSettings) {
    const defaultSettings: StoreSettingsRecord = {
      id: 'store_default',
      storeName: 'Radha Clothes Shop',
      tagline: 'Your Style, Your Choice.',
      brandContact: 'Aman Singh',
      proprietor: 'Arjun Singh',
      phone: '8081465761',
      whatsapp: '8853380138',
      alternatePhone: '8423588891',
      address: 'Asana Mahui Chauraha, Kushinagar, Uttar Pradesh 274149, India.',
      upiId: '8081465761@upi',
      paymentQrUrl: '',
      freeDeliveryThreshold: 799,
      deliveryCharge: 49,
      theme: {
        primaryColor: '#6B21A8',
        accentColor: '#DB2777',
        softBgColor: '#FDF2F8',
      },
      updatedAt: now,
    };
    await db.settings.upsert(defaultSettings);
  }

  // 3. Seed Homepage Banners
  const bannerCount = await db.banners.count();
  if (bannerCount === 0) {
    const banners: BannerRecord[] = [
      {
        id: generateId('bnr'),
        title: 'Festive Silk & Everyday Indian Wear',
        subtitle: 'Curated sarees, embroidered kurtis, menswear & kids festive sets directly from Kushinagar.',
        ctaLabel: 'Explore Collection',
        categoryLink: 'All',
        imageUrl: '/src/assets/images/hero_radha_festive_1794946073586.jpg',
        isActive: true,
        sortOrder: 1,
        createdAt: now,
      },
      {
        id: generateId('bnr'),
        title: 'Wedding & Celebration Lehengas',
        subtitle: 'Handcrafted mirror work & pastel georgette silhouettes tailored for grace and comfort.',
        ctaLabel: 'Shop Women',
        categoryLink: 'Women',
        imageUrl: '/src/assets/images/product_women_lehenga_1794946076768.jpg',
        isActive: true,
        sortOrder: 2,
        createdAt: now,
      },
    ];
    for (const banner of banners) {
      await db.banners.create(banner);
    }
  }

  // 4. Seed Initial Product Catalog (Women, Men, Kids)
  const productCount = await db.products.count();
  if (productCount === 0) {
    const products: ProductRecord[] = [
      {
        id: generateId('prd'),
        name: 'Plum Chanderi Zari Kurti & Pant Set',
        description:
          'Rich plum-purple Chanderi silk straight kurti with delicate blush-pink floral yoke embroidery, golden zari border, and matching tailored trousers.',
        category: 'Women',
        subCategory: 'Kurti Sets',
        fabric: 'Chanderi Silk Blend',
        price: 1299,
        mrp: 1899,
        images: ['/src/assets/images/product_women_kurti_1794946074853.jpg'],
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        colors: ['Plum Purple', 'Rose Pink'],
        stock: 24,
        isFeatured: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: generateId('prd'),
        name: 'Mulberry Banarasi Brocade Silk Saree',
        description:
          'Classic woven mulberry-purple Banarasi soft silk saree accented with fine gold-silver floral motifs and an ornate pallu with unstitched blouse piece.',
        category: 'Women',
        subCategory: 'Sarees',
        fabric: 'Banarasi Soft Silk',
        price: 2499,
        mrp: 3499,
        images: ['/src/assets/images/product_women_saree_1794946075070.jpg'],
        sizes: ['Free Size'],
        colors: ['Mulberry Purple', 'Wine Gold'],
        stock: 15,
        isFeatured: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: generateId('prd'),
        name: 'Rose & Wine Mirror-Work Festive Lehenga',
        description:
          'Graceful paneled rose-pink and wine-purple georgette lehenga choli finished with intricate resham embroidery, mirror border, and matching scalloped dupatta.',
        category: 'Women',
        subCategory: 'Lehengas',
        fabric: 'Georgette & Silk',
        price: 3299,
        mrp: 4599,
        images: ['/src/assets/images/product_women_lehenga_1794946076768.jpg'],
        sizes: ['S', 'M', 'L', 'XL'],
        colors: ['Rose Pink', 'Wine Purple'],
        stock: 10,
        isFeatured: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: generateId('prd'),
        name: 'Ivory Cotton Kurta with Plum Nehru Jacket',
        description:
          'Breathable ivory cotton-silk kurta paired with a textured royal-plum Nehru waistcoat and antique brass buttons — ideal for weddings and family gatherings.',
        category: 'Men',
        subCategory: 'Kurta & Jackets',
        fabric: 'Cotton Silk',
        price: 1799,
        mrp: 2499,
        images: ['/src/assets/images/product_men_kurta_1794946074477.jpg'],
        sizes: ['M', 'L', 'XL', 'XXL'],
        colors: ['Plum & Ivory', 'Ivory'],
        stock: 20,
        isFeatured: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: generateId('prd'),
        name: 'Kids Festive Blush Lehenga & Kurta Collection',
        description:
          'Soft, skin-friendly festive ethnic wear for children featuring fine zari border work on breathable cotton-silk fabric for all-day celebration comfort.',
        category: 'Kids',
        subCategory: 'Festive Sets',
        fabric: 'Soft Cotton Silk',
        price: 899,
        mrp: 1299,
        images: ['/src/assets/images/product_kids_ethnic_1794946076264.jpg'],
        sizes: ['2-3Y', '4-5Y', '6-7Y', '8-9Y'],
        colors: ['Blush Pink', 'Cream Ivory'],
        stock: 30,
        isFeatured: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: generateId('prd'),
        name: 'Boys Ivory Embroidered Cotton Kurta Pajama',
        description:
          'Crisp cream-ivory cotton kurta with subtle neckline embroidery and relaxed elastic-waist pajama designed for effortless movement at festive occasions.',
        category: 'Kids',
        subCategory: 'Boys Kurta',
        fabric: 'Pure Cotton',
        price: 699,
        mrp: 999,
        images: ['/src/assets/images/product_kids_ethnic_1794946076264.jpg'],
        sizes: ['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-12Y'],
        colors: ['Cream Ivory', 'Soft Pink'],
        stock: 28,
        isFeatured: false,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const product of products) {
      await db.products.create(product);
    }
  }

  // 5. Seed Initial Coupons
  const couponCount = await db.coupons.count();
  if (couponCount === 0) {
    const coupons: CouponRecord[] = [
      {
        id: generateId('cpn'),
        code: 'RADHA10',
        description: '10% off on orders above ₹999 (up to ₹300)',
        discountType: 'percent',
        discountValue: 10,
        minOrderAmount: 999,
        maxDiscount: 300,
        isActive: true,
        createdAt: now,
      },
      {
        id: generateId('cpn'),
        code: 'FESTIVE100',
        description: 'Flat ₹100 off on orders above ₹1,299',
        discountType: 'flat',
        discountValue: 100,
        minOrderAmount: 1299,
        isActive: true,
        createdAt: now,
      },
    ];
    for (const coupon of coupons) {
      await db.coupons.create(coupon);
    }
  }
}
