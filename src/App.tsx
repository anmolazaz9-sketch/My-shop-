import { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Search,
  ShoppingBag,
  User as UserIcon,
  X,
} from 'lucide-react';
import { apiRequest, formatINR, getAuthToken, setAuthToken } from './api';
import { AdminDashboard } from './components/AdminDashboard';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer';
import { CustomerAccountView } from './components/CustomerAccountView';
import { ProductDetailModal } from './components/ProductDetailModal';
import { SmartImage } from './components/SmartImage';
import type { Banner, CartItem, Product, StoreSettings, User } from './types';

type ActiveView = 'store' | 'account' | 'admin';
type CategoryFilter = 'All' | 'Women' | 'Men' | 'Kids';

const CART_STORAGE_KEY = 'radha_clothes_cart';

export default function App() {
  const [view, setView] = useState<ActiveView>(() => {
    if (window.location.hash === '#/admin' || window.location.pathname === '/admin') {
      return 'admin';
    }
    return 'store';
  });

  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingStore, setLoadingStore] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const [showPromoStrip, setShowPromoStrip] = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);

  // Filters
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sizeFilter, setSizeFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc'>('featured');

  // Modals / Drawers
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [bagOpen, setBagOpen] = useState(false);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const loadStorefront = async () => {
    try {
      const [storeRes, prodRes] = await Promise.all([
        apiRequest<{ settings: StoreSettings; banners: Banner[] }>('/api/store'),
        apiRequest<{ products: Product[] }>('/api/products'),
      ]);
      setSettings(storeRes.settings);
      setBanners(storeRes.banners);
      setProducts(prodRes.products);
    } finally {
      setLoadingStore(false);
    }
  };

  useEffect(() => {
    loadStorefront();
    const token = getAuthToken();
    if (token) {
      apiRequest<{ user: User }>('/api/auth/me')
        .then((res) => setUser(res.user))
        .catch(() => setAuthToken(null));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (settings?.theme) {
      const root = document.documentElement;
      root.style.setProperty('--brand-primary', settings.theme.primaryColor || '#6B21A8');
      root.style.setProperty('--brand-accent', settings.theme.accentColor || '#DB2777');
      root.style.setProperty('--brand-soft-pink', settings.theme.softBgColor || '#FDF2F8');
    }
  }, [settings]);

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (category !== 'All') {
      list = list.filter((p) => p.category === category);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.subCategory.toLowerCase().includes(q) ||
          p.fabric.toLowerCase().includes(q) ||
          p.colors.some((c) => c.toLowerCase().includes(q))
      );
    }
    if (sizeFilter !== 'All') {
      list = list.filter((p) => p.sizes.includes(sizeFilter));
    }
    if (sortBy === 'price_asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.price - a.price);
    } else {
      list.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
    }
    return list;
  }, [products, category, searchQuery, sizeFilter, sortBy]);

  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.sizes.forEach((s) => set.add(s)));
    return ['All', ...Array.from(set)];
  }, [products]);

  const handleAddToCart = (product: Product, size: string, color: string, quantity: number) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (i) => i.productId === product.id && i.size === size && i.color === color
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: Math.min(product.stock, updated[existingIdx].quantity + quantity),
        };
        return updated;
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          image: product.images[0] || '',
          price: product.price,
          mrp: product.mrp,
          size,
          color,
          quantity,
          maxStock: product.stock,
        },
      ];
    });
  };

  const handleToggleWishlist = async (productId: string) => {
    if (!user) {
      setSelectedProduct(null);
      setView('account');
      return;
    }
    try {
      const res = await apiRequest<{ user: User }>('/api/auth/wishlist', {
        method: 'POST',
        body: JSON.stringify({ productId }),
      });
      setUser(res.user);
    } catch {
      // ignore transient error
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    setView('store');
  };

  const totalBagCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (view === 'admin') {
    return (
      <AdminDashboard
        user={user}
        settings={settings}
        onAuthSuccess={(u) => setUser(u)}
        onLogout={handleLogout}
        onBackToStore={() => {
          window.location.hash = '';
          setView('store');
        }}
        onDataChanged={loadStorefront}
      />
    );
  }

  const currentBanner = banners[activeSlide % Math.max(1, banners.length)];
  const whatsappNum = settings?.whatsapp || '8853380138';
  const phoneNum = settings?.phone || '8081465761';

  return (
    <div className="min-h-screen bg-white text-[#1E1428] pb-16 md:pb-0 flex flex-col">
      {/* Slim Dismissible Delivery Strip (<= 36px) */}
      {showPromoStrip && (
        <div className="bg-[var(--brand-primary)] text-white text-xs h-9 px-4 flex items-center justify-center relative">
          <p className="truncate pr-6">
            Free delivery on orders above {formatINR(settings?.freeDeliveryThreshold ?? 799)} · Use
            code <span className="font-semibold font-mono-num">RADHA10</span> for 10% off
          </p>
          <button
            type="button"
            onClick={() => setShowPromoStrip(false)}
            aria-label="Dismiss notice"
            className="absolute right-3 w-7 h-7 flex items-center justify-center opacity-80 hover:opacity-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Strict 3-Zone Top Bar Contract */}
      <header className="border-b border-[#EFE4F7] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => {
              setView('store');
              setCategory('All');
            }}
            className="font-display text-2xl sm:text-[26px] font-bold tracking-tight text-[#1E1428] whitespace-nowrap shrink-0 text-left"
          >
            {settings?.storeName || 'Radha Clothes Shop'}
          </button>

          {/* Zone 2: 5 concise single-line text links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#645473]">
            {(['All', 'Women', 'Men', 'Kids'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setView('store');
                  setCategory(cat);
                }}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  view === 'store' && category === cat
                    ? 'border-[var(--brand-primary)] text-[#1E1428] font-semibold'
                    : 'border-transparent hover:text-[#1E1428]'
                }`}
              >
                {cat === 'All' ? 'Shop' : cat}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setView('account')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                view === 'account'
                  ? 'border-[var(--brand-primary)] text-[#1E1428] font-semibold'
                  : 'border-transparent hover:text-[#1E1428]'
              }`}
            >
              {user ? 'My Orders' : 'Login / Orders'}
            </button>
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setBagOpen(true)}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Bag ({totalBagCount})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {view === 'account' ? (
        <main className="flex-1">
          <CustomerAccountView
            user={user}
            products={products}
            onAuthSuccess={(u) => setUser(u)}
            onLogout={handleLogout}
            onUserUpdated={(u) => setUser(u)}
            onSelectProduct={(p) => setSelectedProduct(p)}
            onToggleWishlist={handleToggleWishlist}
          />
        </main>
      ) : (
        <main className="flex-1">
          {/* Section 1: Storefront Hero */}
          <section className="bg-[var(--brand-soft-pink)] border-b border-[#EFE4F7]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
              {currentBanner ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch rounded-2xl overflow-hidden bg-white border border-[#EFE4F7]">
                  <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-center space-y-5">
                    <p className="text-xs font-medium text-[#645473]">
                      {settings?.storeName || 'Radha Clothes Shop'} ·{' '}
                      {settings?.tagline || 'Your Style, Your Choice.'}
                    </p>
                    <h1 className="text-3xl sm:text-5xl font-semibold text-[#1E1428] leading-[1.1] [text-wrap:balance]">
                      {currentBanner.title}
                    </h1>
                    <p className="text-sm sm:text-base text-[#645473] leading-relaxed max-w-md">
                      {currentBanner.subtitle}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCategory(currentBanner.categoryLink);
                          document.getElementById('catalog-section')?.scrollIntoView({
                            behavior: 'smooth',
                          });
                        }}
                        className="min-h-[44px] px-6 py-2.5 rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold transition-colors whitespace-nowrap"
                      >
                        {currentBanner.ctaLabel || 'Shop Collection'}
                      </button>
                      {banners.length > 1 && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            aria-label="Previous banner"
                            onClick={() =>
                              setActiveSlide((s) => (s - 1 + banners.length) % banners.length)
                            }
                            className="w-10 h-10 rounded-lg border border-[#EFE4F7] flex items-center justify-center hover:bg-[#FDF2F8]"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            aria-label="Next banner"
                            onClick={() => setActiveSlide((s) => (s + 1) % banners.length)}
                            className="w-10 h-10 rounded-lg border border-[#EFE4F7] flex items-center justify-center hover:bg-[#FDF2F8]"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-7 relative min-h-[240px] sm:min-h-[340px]">
                    <SmartImage
                      src={currentBanner.imageUrl}
                      alt={currentBanner.title}
                      className="w-full h-full lg:h-full object-cover"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {/* Section 2: Categories, Search & Product Grid */}
          <section id="catalog-section" className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-semibold text-[#1E1428]">Curated Clothing Catalog</h2>
                <p className="text-sm text-[#645473] mt-1">
                  Handpicked Women, Men, and Kids wear with transparent pricing and easy home delivery.
                </p>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#FDF2F8] border border-[#EFE4F7] w-fit">
                {(['All', 'Women', 'Men', 'Kids'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`min-h-[38px] px-4 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      category === cat
                        ? 'bg-white text-[#581C87] shadow-xs'
                        : 'text-[#645473] hover:text-[#1E1428]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Search & Secondary Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6 relative">
                <Search className="w-4 h-4 text-[#645473] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sarees, kurtis, kurta jacket, kids lehenga..."
                  className="w-full min-h-[42px] pl-10 pr-4 text-sm rounded-lg border border-[#EFE4F7] bg-white focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  aria-label="Filter by size"
                  value={sizeFilter}
                  onChange={(e) => setSizeFilter(e.target.value)}
                  className="w-full min-h-[42px] px-3 text-sm rounded-lg border border-[#EFE4F7] bg-white"
                >
                  {availableSizes.map((sz) => (
                    <option key={sz} value={sz}>
                      {sz === 'All' ? 'All Sizes' : `Size: ${sz}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <select
                  aria-label="Sort products"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as 'featured' | 'price_asc' | 'price_desc')
                  }
                  className="w-full min-h-[42px] px-3 text-sm rounded-lg border border-[#EFE4F7] bg-white"
                >
                  <option value="featured">Sort: Featured</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* Product Grid */}
            {loadingStore ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="rounded-xl border border-[#EFE4F7] bg-[#FFF9FC] h-80 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-[#EFE4F7] bg-[#FFF9FC] p-12 text-center space-y-3">
                <p className="text-base font-semibold text-[#1E1428]">
                  No clothing items match your filter
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCategory('All');
                    setSearchQuery('');
                    setSizeFilter('All');
                  }}
                  className="min-h-[40px] px-4 rounded-lg bg-[var(--brand-primary)] text-white text-xs font-semibold"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredProducts.map((product) => {
                  const wishlisted = Boolean(user?.wishlist.includes(product.id));
                  const discount =
                    product.mrp > product.price
                      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
                      : 0;
                  return (
                    <article
                      key={product.id}
                      className="group rounded-xl border border-[#EFE4F7] bg-white overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="relative aspect-[4/3] bg-[#FDF2F8] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setSelectedProduct(product)}
                          className="w-full h-full block text-left"
                        >
                          <SmartImage
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleWishlist(product.id)}
                          aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                          className={`absolute top-2.5 right-2.5 w-9 h-9 rounded-full bg-white/95 border border-[#EFE4F7] flex items-center justify-center transition-colors ${
                            wishlisted ? 'text-[#DB2777]' : 'text-[#645473] hover:text-[#DB2777]'
                          }`}
                        >
                          <Heart className="w-4 h-4" fill={wishlisted ? 'currentColor' : 'none'} />
                        </button>
                      </div>

                      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-3">
                        <div>
                          <p className="text-[11px] sm:text-xs text-[#645473] truncate">
                            {product.category} · {product.subCategory}
                          </p>
                          <button
                            type="button"
                            onClick={() => setSelectedProduct(product)}
                            className="mt-1 text-left w-full"
                          >
                            <h3 className="text-sm sm:text-base font-semibold text-[#1E1428] line-clamp-1 group-hover:text-[var(--brand-primary)] transition-colors">
                              {product.name}
                            </h3>
                          </button>
                          <p className="mt-1 text-xs text-[#645473] truncate">
                            Sizes: {product.sizes.slice(0, 4).join(', ')}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#EFE4F7]/70">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-sm sm:text-base font-bold text-[#1E1428] font-mono-num">
                              {formatINR(product.price)}
                            </span>
                            {product.mrp > product.price && (
                              <span className="text-xs text-[#645473] line-through font-mono-num">
                                {formatINR(product.mrp)}
                              </span>
                            )}
                            {discount > 0 && (
                              <span className="text-[11px] font-semibold text-[#DB2777]">
                                {discount}% off
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={product.stock <= 0}
                            onClick={() =>
                              handleAddToCart(
                                product,
                                product.sizes[0] || 'Free Size',
                                product.colors[0] || 'Default',
                                1
                              )
                            }
                            className="min-h-[36px] px-3 rounded-lg bg-[#FDF2F8] hover:bg-[var(--brand-primary)] text-[#581C87] hover:text-white border border-[#EFE4F7] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
                          >
                            {product.stock > 0 ? 'Add' : 'Sold Out'}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section 3: Kushinagar Store & WhatsApp Support */}
          <section className="bg-[var(--brand-soft-pink)] border-t border-[#EFE4F7]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-3">
                <p className="text-xs font-medium text-[#645473]">
                  Visit Our Store · Direct Family Support
                </p>
                <h2 className="text-3xl font-semibold text-[#1E1428] [text-wrap:balance]">
                  {settings?.storeName || 'Radha Clothes Shop'} —{' '}
                  {settings?.tagline || 'Your Style, Your Choice.'}
                </h2>
                <p className="text-sm text-[#645473] leading-relaxed">
                  Managed by Brand Contact{' '}
                  <span className="font-semibold text-[#1E1428]">
                    {settings?.brandContact || 'Aman Singh'}
                  </span>{' '}
                  and Proprietor{' '}
                  <span className="font-semibold text-[#1E1428]">
                    {settings?.proprietor || 'Arjun Singh'}
                  </span>
                  . Shop online with Cash on Delivery or UPI QR, or visit our showroom in Kushinagar.
                </p>
                <div className="pt-2 space-y-2 text-sm text-[#1E1428]">
                  <p className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[var(--brand-primary)] mt-0.5 shrink-0" />
                    <span>
                      {settings?.address ||
                        'Asana Mahui Chauraha, Kushinagar, Uttar Pradesh 274149, India.'}
                    </span>
                  </p>
                  <p className="flex items-center gap-2 font-mono-num">
                    <Phone className="w-4 h-4 text-[var(--brand-primary)] shrink-0" />
                    <a href={`tel:${phoneNum}`} className="hover:underline">
                      {phoneNum}
                    </a>
                    {settings?.alternatePhone && (
                      <>
                        <span className="text-[#645473]">· Alt:</span>
                        <a href={`tel:${settings.alternatePhone}`} className="hover:underline">
                          {settings.alternatePhone}
                        </a>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#EFE4F7] bg-white p-6 sm:p-8 space-y-4">
                <h3 className="text-xl font-semibold text-[#1E1428]">
                  Need Help Choosing Sizes or Colors?
                </h3>
                <p className="text-sm text-[#645473]">
                  Message us directly on WhatsApp for fabric photos, fitting guidance, or bulk festive
                  orders.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={`https://wa.me/91${whatsappNum}?text=${encodeURIComponent(
                      'Namaste Radha Clothes Shop! I would like help with an order.'
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] px-5 py-2.5 rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat on WhatsApp ({whatsappNum})
                  </a>
                  <a
                    href={`tel:${phoneNum}`}
                    className="min-h-[44px] px-5 py-2.5 rounded-lg border border-[#EFE4F7] bg-white hover:bg-[#FDF2F8] text-[#1E1428] text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
                  >
                    <Phone className="w-4 h-4 text-[#DB2777]" />
                    Call {phoneNum}
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* Quiet Footer */}
      <footer className="border-t border-[#EFE4F7] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#645473]">
          <p>
            © {new Date().getFullYear()} {settings?.storeName || 'Radha Clothes Shop'} · Kushinagar,
            Uttar Pradesh
          </p>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => {
                setView('store');
                setCategory('Women');
              }}
              className="hover:text-[#1E1428]"
            >
              Women
            </button>
            <button
              type="button"
              onClick={() => {
                setView('store');
                setCategory('Men');
              }}
              className="hover:text-[#1E1428]"
            >
              Men
            </button>
            <button
              type="button"
              onClick={() => {
                setView('store');
                setCategory('Kids');
              }}
              className="hover:text-[#1E1428]"
            >
              Kids
            </button>
            <button
              type="button"
              onClick={() => setView('account')}
              className="hover:text-[#1E1428]"
            >
              Track Orders
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#/admin';
                setView('admin');
              }}
              className="font-semibold text-[#581C87] hover:underline"
            >
              Admin Dashboard
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation (<= 54px height, well under 15% viewport cap) */}
      <nav
        aria-label="Mobile quick navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-[54px] bg-white border-t border-[#EFE4F7] grid grid-cols-4"
      >
        <button
          type="button"
          onClick={() => {
            setView('store');
            setCategory('All');
          }}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            view === 'store' ? 'text-[var(--brand-primary)]' : 'text-[#645473]'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Shop</span>
        </button>
        <button
          type="button"
          onClick={() => setView('account')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
            view === 'account' ? 'text-[var(--brand-primary)]' : 'text-[#645473]'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Orders</span>
        </button>
        <button
          type="button"
          onClick={() => setView('account')}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-[#645473]"
        >
          <UserIcon className="w-4 h-4" />
          <span>{user ? 'Account' : 'Login'}</span>
        </button>
        <button
          type="button"
          onClick={() => setBagOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-[#581C87]"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Bag ({totalBagCount})</span>
        </button>
      </nav>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          settings={settings}
          isWishlisted={Boolean(user?.wishlist.includes(selectedProduct.id))}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          onToggleWishlist={handleToggleWishlist}
        />
      )}

      {/* Shopping Bag & Checkout Drawer */}
      <CartCheckoutDrawer
        isOpen={bagOpen}
        cart={cart}
        user={user}
        settings={settings}
        onClose={() => setBagOpen(false)}
        onUpdateQty={(idx, delta) => {
          setCart((prev) =>
            prev
              .map((item, i) =>
                i === idx
                  ? { ...item, quantity: Math.min(item.maxStock, item.quantity + delta) }
                  : item
              )
              .filter((item) => item.quantity > 0)
          );
        }}
        onRemoveItem={(idx) => setCart((prev) => prev.filter((_, i) => i !== idx))}
        onClearCart={() => setCart([])}
        onOpenAuth={() => {
          setBagOpen(false);
          setView('account');
        }}
        onOrderCreated={() => {
          loadStorefront();
        }}
        onUserUpdated={(u) => setUser(u)}
      />
    </div>
  );
}
