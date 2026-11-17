import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Edit3,
  Image as ImageIcon,
  Lock,
  LogOut,
  Package,
  Plus,
  QrCode,
  Settings,
  ShoppingCart,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react';
import { apiRequest, formatINR, setAuthToken, uploadImages } from '../api';
import type {
  AdminStats,
  Banner,
  Coupon,
  Order,
  OrderStatus,
  Product,
  StoreSettings,
  User,
} from '../types';
import { PaymentQrDisplay } from './PaymentQrDisplay';
import { SmartImage } from './SmartImage';

interface AdminDashboardProps {
  user: User | null;
  settings: StoreSettings | null;
  onAuthSuccess: (user: User, token: string) => void;
  onLogout: () => void;
  onBackToStore: () => void;
  onDataChanged: () => void;
}

type AdminSection = 'overview' | 'products' | 'orders' | 'banners' | 'coupons' | 'store';

const ALL_SIZES = ['Free Size', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-12Y'];
const ORDER_STATUSES: OrderStatus[] = [
  'Placed',
  'Confirmed',
  'Packed',
  'Shipped',
  'Delivered',
  'Cancelled',
];

export function AdminDashboard({
  user,
  settings,
  onAuthSuccess,
  onLogout,
  onBackToStore,
  onDataChanged,
}: AdminDashboardProps) {
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [section, setSection] = useState<AdminSection>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  // Product Form State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pCategory, setPCategory] = useState<'Women' | 'Men' | 'Kids'>('Women');
  const [pSubCategory, setPSubCategory] = useState('Kurti Sets');
  const [pFabric, setPFabric] = useState('Cotton Silk');
  const [pPrice, setPPrice] = useState('999');
  const [pMrp, setPMrp] = useState('1499');
  const [pStock, setPStock] = useState('15');
  const [pSizes, setPSizes] = useState<string[]>(['S', 'M', 'L', 'XL']);
  const [pColorsText, setPColorsText] = useState('Plum Purple, Soft Pink');
  const [pImages, setPImages] = useState<string[]>([]);
  const [pFeatured, setPFeatured] = useState(true);
  const [pActive, setPActive] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Order filter
  const [orderStatusFilter, setOrderStatusFilter] = useState<'All' | OrderStatus>('All');

  // Banner Form
  const [bTitle, setBTitle] = useState('');
  const [bSubtitle, setBSubtitle] = useState('');
  const [bCta, setBCta] = useState('Shop Now');
  const [bCategory, setBCategory] = useState<'All' | 'Women' | 'Men' | 'Kids'>('All');
  const [bImageUrl, setBImageUrl] = useState('');

  // Coupon Form
  const [cCode, setCCode] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cType, setCType] = useState<'percent' | 'flat'>('percent');
  const [cVal, setCVal] = useState('10');
  const [cMin, setCMin] = useState('999');
  const [cMax, setCMax] = useState('300');

  // Store & Theme Form
  const [storeForm, setStoreForm] = useState<StoreSettings | null>(settings);

  const isAdmin = user?.role === 'admin';

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadAdminData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [statsRes, prodRes, ordRes, bnrRes, cpnRes] = await Promise.all([
        apiRequest<{ stats: AdminStats }>('/api/admin/stats'),
        apiRequest<{ products: Product[] }>('/api/products?includeInactive=true'),
        apiRequest<{ orders: Order[] }>('/api/admin/orders'),
        apiRequest<{ banners: Banner[] }>('/api/admin/banners'),
        apiRequest<{ coupons: Coupon[] }>('/api/admin/coupons'),
      ]);
      setStats(statsRes.stats);
      setProducts(prodRes.products);
      setOrders(ordRes.orders);
      setBanners(bnrRes.banners);
      setCoupons(cpnRes.coupons);
    } catch (err) {
      notify((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (settings) {
      setStoreForm(settings);
    }
  }, [settings]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: loginIdentifier,
          password: loginPassword,
          requireAdminRole: true,
        }),
      });
      setAuthToken(res.token);
      onAuthSuccess(res.user, res.token);
    } catch (err) {
      setLoginError((err as Error).message);
    } finally {
      setLoginLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#FFF9FC] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-[#EFE4F7] bg-white p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBackToStore}
              className="text-xs font-semibold text-[#581C87] hover:underline inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Store
            </button>
            <Lock className="w-4 h-4 text-[var(--brand-primary)]" />
          </div>

          <div>
            <p className="text-xs font-medium text-[#645473]">Radha Clothes Shop</p>
            <h1 className="mt-1 text-3xl font-semibold text-[#1E1428]">Admin Dashboard Login</h1>
            <p className="mt-1 text-sm text-[#645473]">
              Only authorized store administrators can access inventory, orders, and settings.
            </p>
          </div>

          {user && user.role !== 'admin' && (
            <div className="p-3 rounded-lg bg-[#FDF2F8] border border-[#EFE4F7] text-xs text-[#581C87]">
              You are currently signed in as a customer ({user.email}). Sign in below with an
              administrator account to open the dashboard.
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E1428] mb-1">
                Admin Email or Phone
              </label>
              <input
                type="text"
                required
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="admin@radhaclothesshop.in"
                className="w-full min-h-[42px] px-3 text-sm rounded-lg border border-[#EFE4F7] focus:outline-none focus:border-[var(--brand-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E1428] mb-1">Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full min-h-[42px] px-3 text-sm rounded-lg border border-[#EFE4F7] focus:outline-none focus:border-[var(--brand-primary)]"
              />
            </div>

            {loginError && (
              <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full min-h-[44px] rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {loginLoading ? 'Verifying...' : 'Sign In to Admin Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const openAddProduct = () => {
    setEditingProduct(null);
    setPName('');
    setPDesc('');
    setPCategory('Women');
    setPSubCategory('Kurti Sets');
    setPFabric('Cotton Silk');
    setPPrice('999');
    setPMrp('1499');
    setPStock('15');
    setPSizes(['S', 'M', 'L', 'XL']);
    setPColorsText('Plum Purple, Soft Pink');
    setPImages([]);
    setPFeatured(true);
    setPActive(true);
    setShowProductForm(true);
  };

  const openEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setPName(prod.name);
    setPDesc(prod.description);
    setPCategory(prod.category);
    setPSubCategory(prod.subCategory);
    setPFabric(prod.fabric);
    setPPrice(String(prod.price));
    setPMrp(String(prod.mrp));
    setPStock(String(prod.stock));
    setPSizes(prod.sizes);
    setPColorsText(prod.colors.join(', '));
    setPImages(prod.images);
    setPFeatured(prod.isFeatured);
    setPActive(prod.isActive);
    setShowProductForm(true);
  };

  const handleProductPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploadingPhoto(true);
    try {
      const urls = await uploadImages(e.target.files);
      setPImages((prev) => [...prev, ...urls]);
      notify('Photos uploaded');
    } catch (err) {
      notify((err as Error).message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: pName.trim(),
      description: pDesc.trim(),
      category: pCategory,
      subCategory: pSubCategory.trim() || 'Ethnic Wear',
      fabric: pFabric.trim() || 'Cotton Blend',
      price: Number(pPrice),
      mrp: Number(pMrp || pPrice),
      stock: Math.max(0, Number(pStock)),
      sizes: pSizes.length ? pSizes : ['Free Size'],
      colors: pColorsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      images: pImages,
      isFeatured: pFeatured,
      isActive: pActive,
    };

    try {
      if (editingProduct) {
        await apiRequest(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        notify('Product updated permanently');
      } else {
        await apiRequest('/api/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        notify('New product added to store');
      }
      setShowProductForm(false);
      await loadAdminData();
      onDataChanged();
    } catch (err) {
      notify((err as Error).message);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await apiRequest(`/api/products/${id}`, { method: 'DELETE' });
      notify('Product deleted');
      await loadAdminData();
      onDataChanged();
    } catch (err) {
      notify((err as Error).message);
    }
  };

  const handleOrderStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      await apiRequest(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      notify(`Order updated to ${status}`);
      await loadAdminData();
    } catch (err) {
      notify((err as Error).message);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    try {
      const urls = await uploadImages(e.target.files);
      setBImageUrl(urls[0]);
      notify('Banner photo uploaded');
    } catch (err) {
      notify((err as Error).message);
    }
  };

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bTitle.trim() || !bImageUrl.trim()) {
      notify('Please enter title and upload a banner photo');
      return;
    }
    try {
      await apiRequest('/api/admin/banners', {
        method: 'POST',
        body: JSON.stringify({
          title: bTitle,
          subtitle: bSubtitle,
          ctaLabel: bCta,
          categoryLink: bCategory,
          imageUrl: bImageUrl,
          isActive: true,
          sortOrder: banners.length + 1,
        }),
      });
      setBTitle('');
      setBSubtitle('');
      setBImageUrl('');
      notify('Homepage banner saved');
      await loadAdminData();
      onDataChanged();
    } catch (err) {
      notify((err as Error).message);
    }
  };

  const handleToggleBanner = async (banner: Banner) => {
    await apiRequest(`/api/admin/banners/${banner.id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive: !banner.isActive }),
    });
    await loadAdminData();
    onDataChanged();
  };

  const handleDeleteBanner = async (id: string) => {
    await apiRequest(`/api/admin/banners/${id}`, { method: 'DELETE' });
    await loadAdminData();
    onDataChanged();
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: cCode,
          description: cDesc,
          discountType: cType,
          discountValue: Number(cVal),
          minOrderAmount: Number(cMin),
          maxDiscount: cType === 'percent' && cMax ? Number(cMax) : undefined,
        }),
      });
      setCCode('');
      setCDesc('');
      notify('Coupon created');
      await loadAdminData();
    } catch (err) {
      notify((err as Error).message);
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !storeForm) return;
    try {
      const urls = await uploadImages(e.target.files);
      setStoreForm({ ...storeForm, paymentQrUrl: urls[0] });
      notify('QR Code uploaded — click Save Store Settings to publish');
    } catch (err) {
      notify((err as Error).message);
    }
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeForm) return;
    try {
      await apiRequest('/api/admin/store', {
        method: 'PUT',
        body: JSON.stringify(storeForm),
      });
      notify('Store settings, QR code, and theme updated');
      onDataChanged();
    } catch (err) {
      notify((err as Error).message);
    }
  };

  const filteredOrders =
    orderStatusFilter === 'All'
      ? orders
      : orders.filter((o) => o.status === orderStatusFilter);

  const navItems: { id: AdminSection; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'products', label: 'Products', icon: <Package className="w-4 h-4" /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'banners', label: 'Banners', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'coupons', label: 'Coupons', icon: <Tag className="w-4 h-4" /> },
    { id: 'store', label: 'Store & QR', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#FFF9FC] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-[#EFE4F7] p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-5">
          <div className="flex items-center justify-between lg:block">
            <div>
              <p className="text-xs text-[#645473]">Admin Workspace</p>
              <h1 className="text-xl font-semibold text-[#1E1428]">Radha Clothes Shop</h1>
            </div>
            <button
              type="button"
              onClick={onBackToStore}
              className="lg:hidden text-xs font-semibold text-[var(--brand-primary)]"
            >
              View Storefront
            </button>
          </div>

          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`min-h-[40px] px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-colors whitespace-nowrap shrink-0 ${
                  section === item.id
                    ? 'bg-[var(--brand-primary)] text-white'
                    : 'text-[#645473] hover:bg-[#FDF2F8] hover:text-[#1E1428]'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="hidden lg:flex flex-col gap-2 pt-4 border-t border-[#EFE4F7]">
          <button
            type="button"
            onClick={onBackToStore}
            className="min-h-[40px] px-3 rounded-lg border border-[#EFE4F7] text-xs font-semibold text-[#1E1428] hover:bg-[#FDF2F8] flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            View Live Storefront
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="min-h-[40px] px-3 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <header className="bg-white border-b border-[#EFE4F7] px-5 sm:px-8 py-4 flex items-center justify-between gap-4">
          <div className="text-sm text-[#645473]">
            <span>Admin</span>
            <span className="mx-2">/</span>
            <span className="font-semibold text-[#1E1428] capitalize">{section}</span>
          </div>
          <div className="flex items-center gap-3">
            {toast && (
              <span className="text-xs font-semibold text-[#581C87] bg-[#FDF2F8] border border-[#EFE4F7] px-3 py-1.5 rounded-lg">
                {toast}
              </span>
            )}
            <button
              type="button"
              onClick={openAddProduct}
              className="min-h-[40px] px-4 rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>
        </header>

        <div className="p-5 sm:p-8 max-w-6xl space-y-6">
          {loading && !stats && (
            <p className="text-sm text-[#645473]">Loading dashboard records...</p>
          )}

          {/* OVERVIEW SECTION */}
          {section === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-[#EFE4F7] bg-white p-5">
                  <p className="text-xs text-[#645473]">Total Revenue</p>
                  <p className="mt-2 text-2xl font-bold text-[#1E1428] font-mono-num">
                    {formatINR(stats.totalRevenue)}
                  </p>
                </div>
                <div className="rounded-xl border border-[#EFE4F7] bg-white p-5">
                  <p className="text-xs text-[#645473]">Total Orders</p>
                  <p className="mt-2 text-2xl font-bold text-[#1E1428] font-mono-num">
                    {stats.totalOrders}
                  </p>
                </div>
                <div className="rounded-xl border border-[#EFE4F7] bg-white p-5">
                  <p className="text-xs text-[#645473]">Pending Orders</p>
                  <p className="mt-2 text-2xl font-bold text-[#DB2777] font-mono-num">
                    {stats.pendingOrders}
                  </p>
                </div>
                <div className="rounded-xl border border-[#EFE4F7] bg-white p-5">
                  <p className="text-xs text-[#645473]">Active Products</p>
                  <p className="mt-2 text-2xl font-bold text-[#581C87] font-mono-num">
                    {stats.totalProducts}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-[#EFE4F7] bg-white p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold text-[#1E1428]">
                      Business Growth (Real Database Orders)
                    </h2>
                    <p className="text-xs text-[#645473]">
                      Revenue and order volume aggregated directly from saved customer orders ·
                      Delivered: {stats.deliveredOrders} · Low Stock Items: {stats.lowStockProducts}
                    </p>
                  </div>
                </div>

                {stats.dailyGrowth.length === 0 ? (
                  <div className="py-10 text-center rounded-xl bg-[#FFF9FC] border border-[#EFE4F7]">
                    <p className="text-sm font-medium text-[#1E1428]">No real orders recorded yet</p>
                    <p className="text-xs text-[#645473] mt-1">
                      Revenue and daily growth will appear here automatically as customers place
                      orders.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#EFE4F7] text-left text-xs text-[#645473]">
                          <th className="py-2.5 pr-4">Date</th>
                          <th className="py-2.5 px-4 text-right">Orders</th>
                          <th className="py-2.5 pl-4 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.dailyGrowth.map((row) => (
                          <tr key={row.date} className="border-b border-[#EFE4F7]/60">
                            <td className="py-2.5 pr-4 font-mono-num">{row.date}</td>
                            <td className="py-2.5 px-4 text-right font-mono-num">{row.orders}</td>
                            <td className="py-2.5 pl-4 text-right font-semibold font-mono-num">
                              {formatINR(row.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PRODUCTS SECTION */}
          {section === 'products' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1E1428]">
                  Product Catalog ({products.length})
                </h2>
                <button
                  type="button"
                  onClick={openAddProduct}
                  className="min-h-[40px] px-4 rounded-lg bg-[#FDF2F8] border border-[#EFE4F7] text-xs font-semibold text-[#581C87] inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  New Clothing Item
                </button>
              </div>

              <div className="rounded-xl border border-[#EFE4F7] bg-white overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#EFE4F7] text-left text-xs text-[#645473]">
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Price</th>
                      <th className="py-3 px-4 text-right">Stock</th>
                      <th className="py-3 px-4">Sizes</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((prod) => (
                      <tr key={prod.id} className="border-b border-[#EFE4F7]/60 hover:bg-[#FFF9FC]">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <SmartImage
                              src={prod.images[0]}
                              alt={prod.name}
                              className="w-11 h-11 rounded-lg object-cover bg-[#FDF2F8] shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-[#1E1428] truncate max-w-[220px]">
                                {prod.name}
                              </p>
                              <p className="text-xs text-[#645473]">
                                {prod.colors.join(', ')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-[#645473]">
                          {prod.category} · {prod.subCategory}
                        </td>
                        <td className="py-3 px-4 text-right font-mono-num">
                          <span className="font-semibold text-[#1E1428]">{formatINR(prod.price)}</span>
                          {prod.mrp > prod.price && (
                            <span className="block text-xs text-[#645473] line-through">
                              {formatINR(prod.mrp)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono-num">
                          <span className={prod.stock <= 5 ? 'text-red-600 font-semibold' : ''}>
                            {prod.stock}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-[#645473]">
                          {prod.sizes.join(', ')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditProduct(prod)}
                              aria-label={`Edit ${prod.name}`}
                              className="w-9 h-9 rounded-lg border border-[#EFE4F7] flex items-center justify-center text-[#581C87] hover:bg-[#FDF2F8]"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(prod.id)}
                              aria-label={`Delete ${prod.name}`}
                              className="w-9 h-9 rounded-lg border border-[#EFE4F7] flex items-center justify-center text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ORDERS SECTION */}
          {section === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-[#1E1428]">
                  Customer Orders ({filteredOrders.length})
                </h2>
                <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-white border border-[#EFE4F7]">
                  {(['All', ...ORDER_STATUSES] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setOrderStatusFilter(st)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        orderStatusFilter === st
                          ? 'bg-[var(--brand-primary)] text-white'
                          : 'text-[#645473] hover:text-[#1E1428]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="rounded-xl border border-[#EFE4F7] bg-white p-10 text-center">
                  <p className="text-sm font-medium text-[#1E1428]">No customer orders found</p>
                  <p className="text-xs text-[#645473] mt-1">
                    Orders placed from the storefront will appear here for confirmation and shipping.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-xl border border-[#EFE4F7] bg-white p-5 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EFE4F7]">
                        <div>
                          <p className="text-sm font-bold text-[#1E1428] font-mono-num">
                            #{order.orderNumber} · {order.customerName} ({order.customerPhone})
                          </p>
                          <p className="text-xs text-[#645473]">
                            {new Date(order.createdAt).toLocaleString('en-IN')} ·{' '}
                            {order.paymentMethod === 'COD' ? 'Cash on Delivery' : `UPI (${order.paymentReference || 'Paid'})`}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-base font-bold font-mono-num text-[#1E1428]">
                            {formatINR(order.totalAmount)}
                          </span>
                          <select
                            value={order.status}
                            onChange={(e) =>
                              handleOrderStatusChange(order.id, e.target.value as OrderStatus)
                            }
                            aria-label={`Update status for order ${order.orderNumber}`}
                            className="min-h-[38px] px-3 text-xs font-semibold rounded-lg border border-[#EFE4F7] bg-[#FDF2F8] text-[#581C87]"
                          >
                            {ORDER_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="text-xs text-[#645473] space-y-1">
                        <p>
                          <span className="font-semibold text-[#1E1428]">Items:</span>{' '}
                          {order.items
                            .map((i) => `${i.name} (${i.size}, ${i.color}) × ${i.quantity}`)
                            .join(' | ')}
                        </p>
                        <p>
                          <span className="font-semibold text-[#1E1428]">Address:</span>{' '}
                          {order.shippingAddress.street}, {order.shippingAddress.city},{' '}
                          {order.shippingAddress.state} — {order.shippingAddress.pincode}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* BANNERS SECTION */}
          {section === 'banners' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form
                onSubmit={handleCreateBanner}
                className="rounded-xl border border-[#EFE4F7] bg-white p-5 space-y-3 h-fit"
              >
                <h2 className="text-lg font-semibold text-[#1E1428]">Add Homepage Banner</h2>
                <input
                  type="text"
                  required
                  placeholder="Banner Headline *"
                  value={bTitle}
                  onChange={(e) => setBTitle(e.target.value)}
                  className="w-full min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                />
                <textarea
                  rows={2}
                  placeholder="Subtitle / Offer details"
                  value={bSubtitle}
                  onChange={(e) => setBSubtitle(e.target.value)}
                  className="w-full p-3 text-sm rounded-lg border border-[#EFE4F7]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Button Text"
                    value={bCta}
                    onChange={(e) => setBCta(e.target.value)}
                    className="min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                  />
                  <select
                    value={bCategory}
                    onChange={(e) =>
                      setBCategory(e.target.value as 'All' | 'Women' | 'Men' | 'Kids')
                    }
                    className="min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                  >
                    <option value="All">All Categories</option>
                    <option value="Women">Women</option>
                    <option value="Men">Men</option>
                    <option value="Kids">Kids</option>
                  </select>
                </div>

                <label className="block cursor-pointer rounded-lg border border-dashed border-[#6B21A8]/40 bg-[#FFF9FC] p-3 text-center text-xs font-semibold text-[#581C87] hover:bg-[#FDF2F8]">
                  <Upload className="w-4 h-4 mx-auto mb-1" />
                  Upload Banner Photo (Mobile / PC)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    className="hidden"
                  />
                </label>
                {bImageUrl && (
                  <SmartImage
                    src={bImageUrl}
                    alt="Banner preview"
                    className="w-full h-28 object-cover rounded-lg border border-[#EFE4F7]"
                  />
                )}
                <button
                  type="submit"
                  className="w-full min-h-[42px] rounded-lg bg-[var(--brand-primary)] text-white text-xs font-semibold"
                >
                  Publish Banner
                </button>
              </form>

              <div className="lg:col-span-2 space-y-3">
                <h2 className="text-lg font-semibold text-[#1E1428]">
                  Active &amp; Saved Banners ({banners.length})
                </h2>
                {banners.map((bnr) => (
                  <div
                    key={bnr.id}
                    className="rounded-xl border border-[#EFE4F7] bg-white p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center"
                  >
                    <SmartImage
                      src={bnr.imageUrl}
                      alt={bnr.title}
                      className="w-full sm:w-40 h-24 rounded-lg object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#1E1428]">{bnr.title}</p>
                      <p className="text-xs text-[#645473] mt-0.5 line-clamp-2">{bnr.subtitle}</p>
                      <p className="text-xs text-[#581C87] mt-1">
                        Links to: {bnr.categoryLink} · {bnr.isActive ? 'Visible' : 'Hidden'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleBanner(bnr)}
                        className="min-h-[36px] px-3 rounded-lg border border-[#EFE4F7] text-xs font-semibold"
                      >
                        {bnr.isActive ? 'Hide' : 'Show'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBanner(bnr.id)}
                        aria-label="Delete banner"
                        className="w-9 h-9 rounded-lg border border-[#EFE4F7] text-red-600 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COUPONS SECTION */}
          {section === 'coupons' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form
                onSubmit={handleCreateCoupon}
                className="rounded-xl border border-[#EFE4F7] bg-white p-5 space-y-3 h-fit"
              >
                <h2 className="text-lg font-semibold text-[#1E1428]">Create Discount Coupon</h2>
                <input
                  type="text"
                  required
                  placeholder="Code (e.g. DIWALI20)"
                  value={cCode}
                  onChange={(e) => setCCode(e.target.value.toUpperCase())}
                  className="w-full min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={cDesc}
                  onChange={(e) => setCDesc(e.target.value)}
                  className="w-full min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={cType}
                    onChange={(e) => setCType(e.target.value as 'percent' | 'flat')}
                    className="min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                  >
                    <option value="percent">Percent (%)</option>
                    <option value="flat">Flat (₹)</option>
                  </select>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Value"
                    value={cVal}
                    onChange={(e) => setCVal(e.target.value)}
                    className="min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="Min Order (₹)"
                    value={cMin}
                    onChange={(e) => setCMin(e.target.value)}
                    className="min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                  />
                  {cType === 'percent' && (
                    <input
                      type="number"
                      min={0}
                      placeholder="Max Off (₹)"
                      value={cMax}
                      onChange={(e) => setCMax(e.target.value)}
                      className="min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                    />
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full min-h-[42px] rounded-lg bg-[var(--brand-primary)] text-white text-xs font-semibold"
                >
                  Create Coupon
                </button>
              </form>

              <div className="lg:col-span-2 space-y-3">
                <h2 className="text-lg font-semibold text-[#1E1428]">
                  Store Coupons ({coupons.length})
                </h2>
                {coupons.map((cpn) => (
                  <div
                    key={cpn.id}
                    className="rounded-xl border border-[#EFE4F7] bg-white p-4 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="font-bold text-[#581C87] font-mono-num">{cpn.code}</p>
                      <p className="text-xs text-[#645473]">
                        {cpn.discountType === 'percent'
                          ? `${cpn.discountValue}% off`
                          : `${formatINR(cpn.discountValue)} off`}{' '}
                        · Min Order {formatINR(cpn.minOrderAmount)} ·{' '}
                        {cpn.isActive ? 'Active' : 'Paused'}
                      </p>
                      {cpn.description && (
                        <p className="text-xs text-[#645473] mt-0.5">{cpn.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await apiRequest(`/api/admin/coupons/${cpn.id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ isActive: !cpn.isActive }),
                          });
                          loadAdminData();
                        }}
                        className="min-h-[36px] px-3 rounded-lg border border-[#EFE4F7] text-xs font-semibold"
                      >
                        {cpn.isActive ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiRequest(`/api/admin/coupons/${cpn.id}`, { method: 'DELETE' });
                          loadAdminData();
                        }}
                        aria-label={`Delete coupon ${cpn.code}`}
                        className="w-9 h-9 rounded-lg border border-[#EFE4F7] text-red-600 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STORE SETTINGS, QR CODE & THEME */}
          {section === 'store' && storeForm && (
            <form onSubmit={handleSaveStore} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-xl border border-[#EFE4F7] bg-white p-6 space-y-4">
                <h2 className="text-lg font-semibold text-[#1E1428]">
                  Store Information &amp; Theme Customization
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Store Name</label>
                    <input
                      type="text"
                      value={storeForm.storeName}
                      onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })}
                      className="w-full min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Tagline</label>
                    <input
                      type="text"
                      value={storeForm.tagline}
                      onChange={(e) => setStoreForm({ ...storeForm, tagline: e.target.value })}
                      className="w-full min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Brand Contact</label>
                    <input
                      type="text"
                      value={storeForm.brandContact}
                      onChange={(e) =>
                        setStoreForm({ ...storeForm, brandContact: e.target.value })
                      }
                      className="w-full min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Proprietor</label>
                    <input
                      type="text"
                      value={storeForm.proprietor}
                      onChange={(e) => setStoreForm({ ...storeForm, proprietor: e.target.value })}
                      className="w-full min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Primary Phone</label>
                    <input
                      type="text"
                      value={storeForm.phone}
                      onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                      className="w-full min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">WhatsApp Number</label>
                    <input
                      type="text"
                      value={storeForm.whatsapp}
                      onChange={(e) => setStoreForm({ ...storeForm, whatsapp: e.target.value })}
                      className="w-full min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold mb-1">Shop Address</label>
                    <input
                      type="text"
                      value={storeForm.address}
                      onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                      className="w-full min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Free Delivery Above (₹)
                    </label>
                    <input
                      type="number"
                      value={storeForm.freeDeliveryThreshold}
                      onChange={(e) =>
                        setStoreForm({
                          ...storeForm,
                          freeDeliveryThreshold: Number(e.target.value),
                        })
                      }
                      className="w-full min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Delivery Fee (₹)</label>
                    <input
                      type="number"
                      value={storeForm.deliveryCharge}
                      onChange={(e) =>
                        setStoreForm({
                          ...storeForm,
                          deliveryCharge: Number(e.target.value),
                        })
                      }
                      className="w-full min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                    />
                  </div>
                </div>

                {/* Theme Colors */}
                <div className="pt-4 border-t border-[#EFE4F7]">
                  <h3 className="text-sm font-semibold text-[#1E1428] mb-3">Theme Colors</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="text-xs font-medium space-y-1">
                      <span>Primary Purple</span>
                      <input
                        type="color"
                        value={storeForm.theme.primaryColor}
                        onChange={(e) =>
                          setStoreForm({
                            ...storeForm,
                            theme: { ...storeForm.theme, primaryColor: e.target.value },
                          })
                        }
                        className="block w-full h-10 rounded-lg border border-[#EFE4F7] cursor-pointer"
                      />
                    </label>
                    <label className="text-xs font-medium space-y-1">
                      <span>Accent Pink</span>
                      <input
                        type="color"
                        value={storeForm.theme.accentColor}
                        onChange={(e) =>
                          setStoreForm({
                            ...storeForm,
                            theme: { ...storeForm.theme, accentColor: e.target.value },
                          })
                        }
                        className="block w-full h-10 rounded-lg border border-[#EFE4F7] cursor-pointer"
                      />
                    </label>
                    <label className="text-xs font-medium space-y-1">
                      <span>Soft Pink Tint</span>
                      <input
                        type="color"
                        value={storeForm.theme.softBgColor}
                        onChange={(e) =>
                          setStoreForm({
                            ...storeForm,
                            theme: { ...storeForm.theme, softBgColor: e.target.value },
                          })
                        }
                        className="block w-full h-10 rounded-lg border border-[#EFE4F7] cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="min-h-[44px] px-6 rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold"
                >
                  Save Store Settings &amp; Theme
                </button>
              </div>

              {/* Payment QR Code Manager */}
              <div className="rounded-xl border border-[#EFE4F7] bg-white p-6 space-y-4 h-fit">
                <h2 className="text-lg font-semibold text-[#1E1428] flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-[var(--brand-primary)]" />
                  Payment UPI QR Code
                </h2>
                <div>
                  <label className="block text-xs font-semibold mb-1">Store UPI ID</label>
                  <input
                    type="text"
                    value={storeForm.upiId}
                    onChange={(e) => setStoreForm({ ...storeForm, upiId: e.target.value })}
                    placeholder="8081465761@upi"
                    className="w-full min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                  />
                </div>

                <PaymentQrDisplay
                  qrUrl={storeForm.paymentQrUrl}
                  upiId={storeForm.upiId}
                  storeName={storeForm.storeName}
                />

                <label className="block cursor-pointer rounded-lg border border-dashed border-[#6B21A8]/40 bg-[#FFF9FC] p-3 text-center text-xs font-semibold text-[#581C87] hover:bg-[#FDF2F8]">
                  <Upload className="w-4 h-4 mx-auto mb-1" />
                  Upload New QR Photo (Mobile / PC)
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrUpload}
                    className="hidden"
                  />
                </label>
                {storeForm.paymentQrUrl && (
                  <button
                    type="button"
                    onClick={() => setStoreForm({ ...storeForm, paymentQrUrl: '' })}
                    className="w-full text-xs text-red-600 hover:underline"
                  >
                    Remove Custom QR Image
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Add / Edit Product Modal */}
      {showProductForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-[#EFE4F7] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE4F7] pb-3">
              <h2 className="text-xl font-semibold text-[#1E1428]">
                {editingProduct ? 'Edit Clothing Product' : 'Add New Clothing Product'}
              </h2>
              <button
                type="button"
                onClick={() => setShowProductForm(false)}
                className="text-xs font-semibold text-[#645473] hover:text-[#1E1428]"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    placeholder="e.g. Banarasi Pink Silk Saree"
                    className="w-full min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Category *</label>
                  <select
                    value={pCategory}
                    onChange={(e) => setPCategory(e.target.value as 'Women' | 'Men' | 'Kids')}
                    className="w-full min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                  >
                    <option value="Women">Women</option>
                    <option value="Men">Men</option>
                    <option value="Kids">Kids</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Sub-Category</label>
                  <input
                    type="text"
                    value={pSubCategory}
                    onChange={(e) => setPSubCategory(e.target.value)}
                    placeholder="Sarees, Kurtis, Shirts, Lehengas"
                    className="w-full min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value)}
                    className="w-full min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    min={1}
                    value={pMrp}
                    onChange={(e) => setPMrp(e.target.value)}
                    className="w-full min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={pStock}
                    onChange={(e) => setPStock(e.target.value)}
                    className="w-full min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Fabric</label>
                  <input
                    type="text"
                    value={pFabric}
                    onChange={(e) => setPFabric(e.target.value)}
                    placeholder="Cotton, Silk, Georgette"
                    className="w-full min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1">
                    Colors (comma separated)
                  </label>
                  <input
                    type="text"
                    value={pColorsText}
                    onChange={(e) => setPColorsText(e.target.value)}
                    placeholder="Plum Purple, Rose Pink, Ivory"
                    className="w-full min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5">Available Sizes</label>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_SIZES.map((sz) => {
                      const active = pSizes.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() =>
                            setPSizes((prev) =>
                              active ? prev.filter((x) => x !== sz) : [...prev, sz]
                            )
                          }
                          className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border ${
                            active
                              ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                              : 'bg-white text-[#1E1428] border-[#EFE4F7]'
                          }`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={pDesc}
                    onChange={(e) => setPDesc(e.target.value)}
                    placeholder="Describe fabric, work, occasion, and fit..."
                    className="w-full p-3 text-sm rounded-lg border border-[#EFE4F7]"
                  />
                </div>

                {/* Mobile & Desktop Photo Upload */}
                <div className="sm:col-span-2 space-y-2">
                  <label className="block text-xs font-semibold">
                    Product Photos (Upload from Mobile Camera or Gallery)
                  </label>
                  <label className="block cursor-pointer rounded-lg border border-dashed border-[#6B21A8]/40 bg-[#FFF9FC] p-4 text-center text-xs font-semibold text-[#581C87] hover:bg-[#FDF2F8]">
                    <Upload className="w-5 h-5 mx-auto mb-1" />
                    {uploadingPhoto ? 'Uploading photos...' : 'Tap to Choose or Capture Photos'}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleProductPhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {pImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {pImages.map((img, idx) => (
                        <div key={`${img}-${idx}`} className="relative w-16 h-16">
                          <SmartImage
                            src={img}
                            alt={`Upload ${idx + 1}`}
                            className="w-16 h-16 rounded-lg object-cover border border-[#EFE4F7]"
                          />
                          <button
                            type="button"
                            onClick={() => setPImages((prev) => prev.filter((_, i) => i !== idx))}
                            aria-label="Remove photo"
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={pFeatured}
                    onChange={(e) => setPFeatured(e.target.checked)}
                    className="accent-[#6B21A8]"
                  />
                  Featured on Homepage
                </label>
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={pActive}
                    onChange={(e) => setPActive(e.target.checked)}
                    className="accent-[#6B21A8]"
                  />
                  Visible to Customers
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-[#EFE4F7]">
                <button
                  type="button"
                  onClick={() => setShowProductForm(false)}
                  className="min-h-[42px] px-4 rounded-lg border border-[#EFE4F7] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] px-6 rounded-lg bg-[var(--brand-primary)] text-white text-xs font-semibold"
                >
                  {editingProduct ? 'Save Changes' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
