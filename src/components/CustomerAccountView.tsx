import { useEffect, useState } from 'react';
import { Heart, LogOut, MapPin, Package, Plus, Trash2, User as UserIcon } from 'lucide-react';
import { apiRequest, formatINR, setAuthToken } from '../api';
import type { Address, Order, OrderStatus, Product, User } from '../types';
import { SmartImage } from './SmartImage';

interface CustomerAccountViewProps {
  user: User | null;
  products: Product[];
  onAuthSuccess: (user: User, token: string) => void;
  onLogout: () => void;
  onUserUpdated: (user: User) => void;
  onSelectProduct: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
}

const TRACKING_STEPS: OrderStatus[] = ['Placed', 'Confirmed', 'Packed', 'Shipped', 'Delivered'];

export function CustomerAccountView({
  user,
  products,
  onAuthSuccess,
  onLogout,
  onUserUpdated,
  onSelectProduct,
  onToggleWishlist,
}: CustomerAccountViewProps) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [tab, setTab] = useState<'orders' | 'wishlist' | 'addresses'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [addrForm, setAddrForm] = useState<Omit<Address, 'id'>>({
    label: 'Home',
    fullName: user?.name || '',
    phone: user?.phone || '',
    street: '',
    city: 'Kushinagar',
    state: 'Uttar Pradesh',
    pincode: '274149',
  });
  const [savingAddr, setSavingAddr] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoadingOrders(true);
    apiRequest<{ orders: Order[] }>('/api/orders/my')
      .then((res) => setOrders(res.orders))
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  }, [user?.id]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (authMode === 'register') {
        const res = await apiRequest<{ token: string; user: User }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, phone, password }),
        });
        setAuthToken(res.token);
        onAuthSuccess(res.user, res.token);
      } else {
        const res = await apiRequest<{ token: string; user: User }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ identifier, password }),
        });
        setAuthToken(res.token);
        onAuthSuccess(res.user, res.token);
      }
    } catch (err) {
      setAuthError((err as Error).message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingAddr(true);
    try {
      const next: Address[] = [
        ...user.addresses,
        { ...addrForm, id: `addr_${Date.now()}` },
      ];
      const res = await apiRequest<{ user: User }>('/api/auth/addresses', {
        method: 'PUT',
        body: JSON.stringify({ addresses: next }),
      });
      onUserUpdated(res.user);
      setAddrForm({
        label: 'Home',
        fullName: user.name,
        phone: user.phone,
        street: '',
        city: 'Kushinagar',
        state: 'Uttar Pradesh',
        pincode: '274149',
      });
    } finally {
      setSavingAddr(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!user) return;
    const next = user.addresses.filter((a) => a.id !== id);
    const res = await apiRequest<{ user: User }>('/api/auth/addresses', {
      method: 'PUT',
      body: JSON.stringify({ addresses: next }),
    });
    onUserUpdated(res.user);
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="rounded-2xl border border-[#EFE4F7] bg-white p-6 sm:p-8 space-y-6">
          <div>
            <p className="text-xs font-medium text-[#645473]">Customer Account</p>
            <h2 className="mt-1 text-3xl font-semibold text-[#1E1428]">
              {authMode === 'login' ? 'Welcome Back' : 'Create Your Account'}
            </h2>
            <p className="mt-1 text-sm text-[#645473]">
              Sign in to track your orders, save delivery addresses, and manage your wishlist.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#FDF2F8]">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthError('');
              }}
              className={`min-h-[40px] text-xs font-semibold rounded-md transition-colors ${
                authMode === 'login'
                  ? 'bg-white text-[#581C87] shadow-xs'
                  : 'text-[#645473] hover:text-[#1E1428]'
              }`}
            >
              Customer Login
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setAuthError('');
              }}
              className={`min-h-[40px] text-xs font-semibold rounded-md transition-colors ${
                authMode === 'register'
                  ? 'bg-white text-[#581C87] shadow-xs'
                  : 'text-[#645473] hover:text-[#1E1428]'
              }`}
            >
              New Registration
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'register' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#1E1428] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Verma"
                    className="w-full min-h-[42px] px-3 text-sm rounded-lg border border-[#EFE4F7] focus:outline-none focus:border-[var(--brand-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1E1428] mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full min-h-[42px] px-3 text-sm rounded-lg border border-[#EFE4F7] focus:outline-none focus:border-[var(--brand-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1E1428] mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full min-h-[42px] px-3 text-sm rounded-lg border border-[#EFE4F7] focus:outline-none focus:border-[var(--brand-primary)]"
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-[#1E1428] mb-1">
                  Email or Mobile Number
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter email or phone number"
                  className="w-full min-h-[42px] px-3 text-sm rounded-lg border border-[#EFE4F7] focus:outline-none focus:border-[var(--brand-primary)]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#1E1428] mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full min-h-[42px] px-3 text-sm rounded-lg border border-[#EFE4F7] focus:outline-none focus:border-[var(--brand-primary)]"
              />
            </div>

            {authError && (
              <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full min-h-[44px] rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {authLoading
                ? 'Please wait...'
                : authMode === 'login'
                ? 'Sign In'
                : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const wishlistProducts = products.filter((p) => user.wishlist.includes(p.id));

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#EFE4F7]">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#FDF2F8] border border-[#EFE4F7] flex items-center justify-center text-[var(--brand-primary)]">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-[#1E1428]">{user.name}</h2>
            <p className="text-xs text-[#645473]">
              {user.phone} · {user.email}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="min-h-[40px] px-4 py-2 rounded-lg border border-[#EFE4F7] text-xs font-semibold text-[#1E1428] hover:bg-[#FDF2F8] inline-flex items-center gap-2 whitespace-nowrap"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-lg bg-[#FDF2F8] w-fit">
        <button
          type="button"
          onClick={() => setTab('orders')}
          className={`min-h-[40px] px-4 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            tab === 'orders' ? 'bg-white text-[#581C87] shadow-xs' : 'text-[#645473]'
          }`}
        >
          Order History ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('wishlist')}
          className={`min-h-[40px] px-4 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            tab === 'wishlist' ? 'bg-white text-[#581C87] shadow-xs' : 'text-[#645473]'
          }`}
        >
          Wishlist ({wishlistProducts.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('addresses')}
          className={`min-h-[40px] px-4 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
            tab === 'addresses' ? 'bg-white text-[#581C87] shadow-xs' : 'text-[#645473]'
          }`}
        >
          Saved Addresses ({user.addresses.length})
        </button>
      </div>

      {tab === 'orders' && (
        <div className="space-y-4">
          {loadingOrders ? (
            <p className="text-sm text-[#645473] py-8">Loading your orders...</p>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-[#EFE4F7] bg-[#FFF9FC] p-10 text-center space-y-2">
              <Package className="w-9 h-9 mx-auto text-[#6B21A8]/40" />
              <p className="text-base font-semibold text-[#1E1428]">No orders placed yet</p>
              <p className="text-sm text-[#645473]">
                Once you place an order, you can track delivery status here in real time.
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const currentIdx = TRACKING_STEPS.indexOf(order.status);
              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-[#EFE4F7] bg-white p-5 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EFE4F7]">
                    <div>
                      <p className="text-sm font-bold text-[#1E1428] font-mono-num">
                        Order #{order.orderNumber}
                      </p>
                      <p className="text-xs text-[#645473]">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        · {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'UPI QR'} (
                        {order.paymentStatus})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-[#1E1428] font-mono-num">
                        {formatINR(order.totalAmount)}
                      </p>
                      <p
                        className={`text-xs font-semibold ${
                          order.status === 'Cancelled'
                            ? 'text-red-600'
                            : order.status === 'Delivered'
                            ? 'text-emerald-700'
                            : 'text-[var(--brand-primary)]'
                        }`}
                      >
                        Status: {order.status}
                      </p>
                    </div>
                  </div>

                  {/* Visual 5-step Tracking */}
                  {order.status !== 'Cancelled' && (
                    <div className="grid grid-cols-5 gap-2 py-2">
                      {TRACKING_STEPS.map((stepName, idx) => {
                        const completed = currentIdx >= idx;
                        return (
                          <div key={stepName} className="space-y-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                completed ? 'bg-[var(--brand-primary)]' : 'bg-[#EFE4F7]'
                              }`}
                            />
                            <p
                              className={`text-[11px] font-medium truncate ${
                                completed ? 'text-[#581C87]' : 'text-[#645473]'
                              }`}
                            >
                              {stepName}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="space-y-2">
                    {order.items.map((item, i) => (
                      <div key={`${item.productId}-${i}`} className="flex items-center gap-3 text-sm">
                        <SmartImage
                          src={item.image}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover bg-[#FDF2F8] shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#1E1428] truncate">{item.name}</p>
                          <p className="text-xs text-[#645473]">
                            Size: {item.size} · Color: {item.color} · Qty: {item.quantity}
                          </p>
                        </div>
                        <span className="font-semibold font-mono-num">
                          {formatINR(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-[#645473] pt-2 border-t border-[#EFE4F7]">
                    Delivery Address: {order.shippingAddress.fullName}, {order.shippingAddress.street},{' '}
                    {order.shippingAddress.city}, {order.shippingAddress.state} —{' '}
                    {order.shippingAddress.pincode}
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'wishlist' && (
        <div>
          {wishlistProducts.length === 0 ? (
            <div className="rounded-2xl border border-[#EFE4F7] bg-[#FFF9FC] p-10 text-center space-y-2">
              <Heart className="w-9 h-9 mx-auto text-[#DB2777]/40" />
              <p className="text-base font-semibold text-[#1E1428]">Your wishlist is empty</p>
              <p className="text-sm text-[#645473]">
                Tap the heart icon on any clothing item to save it here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {wishlistProducts.map((product) => (
                <div
                  key={product.id}
                  className="rounded-xl border border-[#EFE4F7] bg-white overflow-hidden flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() => onSelectProduct(product)}
                    className="aspect-[4/3] w-full overflow-hidden bg-[#FDF2F8]"
                  >
                    <SmartImage
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <p className="text-xs text-[#645473]">
                        {product.category} · {product.subCategory}
                      </p>
                      <h3 className="text-sm font-semibold text-[#1E1428] mt-0.5 line-clamp-1">
                        {product.name}
                      </h3>
                      <p className="text-sm font-bold text-[#1E1428] font-mono-num mt-1">
                        {formatINR(product.price)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectProduct(product)}
                        className="flex-1 min-h-[40px] rounded-lg bg-[var(--brand-primary)] text-white text-xs font-semibold"
                      >
                        View &amp; Buy
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleWishlist(product.id)}
                        aria-label="Remove from wishlist"
                        className="w-10 h-10 rounded-lg border border-[#EFE4F7] text-[#DB2777] flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'addresses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-base font-semibold text-[#1E1428]">Your Delivery Addresses</h3>
            {user.addresses.length === 0 ? (
              <p className="text-sm text-[#645473]">No saved addresses yet.</p>
            ) : (
              user.addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="p-4 rounded-xl border border-[#EFE4F7] bg-white flex items-start justify-between gap-3"
                >
                  <div className="text-sm space-y-0.5">
                    <p className="font-semibold text-[#1E1428] flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[var(--brand-primary)]" />
                      {addr.label} · {addr.fullName}
                    </p>
                    <p className="text-xs text-[#645473]">Phone: {addr.phone}</p>
                    <p className="text-xs text-[#645473]">
                      {addr.street}, {addr.city}, {addr.state} — {addr.pincode}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(addr.id)}
                    aria-label="Delete address"
                    className="w-9 h-9 rounded-lg text-[#645473] hover:text-red-600 flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={handleAddAddress}
            className="rounded-xl border border-[#EFE4F7] bg-[#FFF9FC] p-5 space-y-3 h-fit"
          >
            <h3 className="text-base font-semibold text-[#1E1428] flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[var(--brand-primary)]" />
              Add New Address
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                placeholder="Label (Home / Office)"
                value={addrForm.label}
                onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })}
                className="min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7] bg-white"
              />
              <input
                type="text"
                required
                placeholder="Full Name"
                value={addrForm.fullName}
                onChange={(e) => setAddrForm({ ...addrForm, fullName: e.target.value })}
                className="min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7] bg-white"
              />
              <input
                type="tel"
                required
                placeholder="Phone"
                value={addrForm.phone}
                onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })}
                className="min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7] bg-white"
              />
              <input
                type="text"
                required
                placeholder="PIN Code"
                value={addrForm.pincode}
                onChange={(e) => setAddrForm({ ...addrForm, pincode: e.target.value })}
                className="min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7] bg-white"
              />
              <input
                type="text"
                required
                placeholder="Street / Village / Landmark"
                value={addrForm.street}
                onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })}
                className="col-span-2 min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7] bg-white"
              />
              <input
                type="text"
                required
                placeholder="City"
                value={addrForm.city}
                onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                className="min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7] bg-white"
              />
              <input
                type="text"
                required
                placeholder="State"
                value={addrForm.state}
                onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })}
                className="min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7] bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={savingAddr}
              className="w-full min-h-[42px] rounded-lg bg-[var(--brand-primary)] text-white text-xs font-semibold hover:bg-[var(--brand-primary-hover)]"
            >
              {savingAddr ? 'Saving...' : 'Save Address'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
