import { useState } from 'react';
import { CheckCircle2, MapPin, Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import { apiRequest, formatINR } from '../api';
import type { Address, CartItem, Order, StoreSettings, User } from '../types';
import { PaymentQrDisplay } from './PaymentQrDisplay';
import { SmartImage } from './SmartImage';

interface CartCheckoutDrawerProps {
  isOpen: boolean;
  cart: CartItem[];
  user: User | null;
  settings: StoreSettings | null;
  onClose: () => void;
  onUpdateQty: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onClearCart: () => void;
  onOpenAuth: () => void;
  onOrderCreated: (order: Order) => void;
  onUserUpdated: (user: User) => void;
}

export function CartCheckoutDrawer({
  isOpen,
  cart,
  user,
  settings,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onOpenAuth,
  onOrderCreated,
  onUserUpdated,
}: CartCheckoutDrawerProps) {
  const [step, setStep] = useState<'bag' | 'checkout' | 'success'>('bag');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponMessage, setCouponMessage] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    user?.addresses?.[0]?.id || 'new'
  );
  const [newAddress, setNewAddress] = useState<Omit<Address, 'id'>>({
    label: 'Home',
    fullName: user?.name || '',
    phone: user?.phone || '',
    street: '',
    city: 'Kushinagar',
    state: 'Uttar Pradesh',
    pincode: '274149',
  });
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'UPI_QR'>('COD');
  const [paymentReference, setPaymentReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = appliedCoupon ? Math.min(appliedCoupon.discount, subtotal) : 0;
  const freeThreshold = settings?.freeDeliveryThreshold ?? 799;
  const baseDelivery = settings?.deliveryCharge ?? 49;
  const afterDiscount = Math.max(0, subtotal - discount);
  const deliveryCharge = cart.length === 0 ? 0 : afterDiscount >= freeThreshold ? 0 : baseDelivery;
  const totalAmount = afterDiscount + deliveryCharge;

  const handleApplyCoupon = async () => {
    setCouponMessage('');
    if (!couponInput.trim()) return;
    try {
      const res = await apiRequest<{ coupon: { code: string }; discountAmount: number }>(
        '/api/coupons/validate',
        {
          method: 'POST',
          body: JSON.stringify({ code: couponInput.trim(), subtotal }),
        }
      );
      setAppliedCoupon({ code: res.coupon.code, discount: res.discountAmount });
      setCouponMessage(`Applied ${res.coupon.code}: -${formatINR(res.discountAmount)}`);
    } catch (err) {
      setAppliedCoupon(null);
      setCouponMessage((err as Error).message);
    }
  };

  const handleProceedToCheckout = () => {
    setErrorMsg('');
    if (!user) {
      onOpenAuth();
      return;
    }
    if (user.addresses.length > 0 && selectedAddressId === 'new') {
      setSelectedAddressId(user.addresses[0].id);
    }
    setNewAddress((prev) => ({
      ...prev,
      fullName: prev.fullName || user.name,
      phone: prev.phone || user.phone,
    }));
    setStep('checkout');
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenAuth();
      return;
    }
    setErrorMsg('');

    let shippingAddress: Address;
    if (selectedAddressId !== 'new') {
      const found = user.addresses.find((a) => a.id === selectedAddressId);
      if (!found) {
        setErrorMsg('Please select a delivery address.');
        return;
      }
      shippingAddress = found;
    } else {
      if (
        !newAddress.fullName.trim() ||
        !newAddress.phone.trim() ||
        !newAddress.street.trim() ||
        !newAddress.city.trim() ||
        !newAddress.pincode.trim()
      ) {
        setErrorMsg('Please fill in all required delivery address fields.');
        return;
      }
      shippingAddress = {
        ...newAddress,
        id: `addr_${Date.now()}`,
      };
    }

    if (paymentMethod === 'UPI_QR' && !paymentReference.trim()) {
      setErrorMsg('Please enter your UPI UTR / Transaction Reference ID after scanning.');
      return;
    }

    setSubmitting(true);
    try {
      if (selectedAddressId === 'new' && saveAddressToProfile) {
        const updatedRes = await apiRequest<{ user: User }>('/api/auth/addresses', {
          method: 'PUT',
          body: JSON.stringify({ addresses: [...user.addresses, shippingAddress] }),
        });
        onUserUpdated(updatedRes.user);
      }

      const res = await apiRequest<{ order: Order }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.productId,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
          })),
          shippingAddress,
          couponCode: appliedCoupon?.code,
          paymentMethod,
          paymentReference: paymentMethod === 'UPI_QR' ? paymentReference.trim() : undefined,
        }),
      });

      setPlacedOrder(res.order);
      onClearCart();
      onOrderCreated(res.order);
      setStep('success');
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setStep('bag');
    setErrorMsg('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg bg-white h-full flex flex-col border-l border-[#EFE4F7] shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EFE4F7]">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[var(--brand-primary)]" />
            <h2 className="text-xl font-semibold text-[#1E1428]">
              {step === 'bag'
                ? `Shopping Bag (${cart.reduce((s, i) => s + i.quantity, 0)})`
                : step === 'checkout'
                ? 'Delivery & Payment'
                : 'Order Confirmed'}
            </h2>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Close shopping bag"
            className="w-10 h-10 rounded-lg border border-[#EFE4F7] flex items-center justify-center text-[#1E1428] hover:bg-[#FDF2F8]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {step === 'success' && placedOrder ? (
            <div className="py-6 space-y-5">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-[#F5F3FF] text-[var(--brand-primary)] flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-semibold text-[#1E1428]">
                  Order {placedOrder.orderNumber} Confirmed
                </h3>
                <p className="text-sm text-[#645473]">
                  Thank you, {placedOrder.customerName}. Your order has been saved and is currently{' '}
                  <span className="font-semibold text-[#581C87]">{placedOrder.status}</span>.
                </p>
              </div>

              <div className="rounded-xl border border-[#EFE4F7] bg-[#FFF9FC] p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#645473]">Total Amount</span>
                  <span className="font-bold font-mono-num">{formatINR(placedOrder.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#645473]">Payment</span>
                  <span className="font-medium">
                    {placedOrder.paymentMethod === 'COD' ? 'Cash on Delivery' : 'UPI QR'} ({placedOrder.paymentStatus})
                  </span>
                </div>
                <div className="pt-2 border-t border-[#EFE4F7] text-xs text-[#645473]">
                  Delivering to: {placedOrder.shippingAddress.street}, {placedOrder.shippingAddress.city},{' '}
                  {placedOrder.shippingAddress.state} — {placedOrder.shippingAddress.pincode}
                </div>
              </div>

              <button
                type="button"
                onClick={resetAndClose}
                className="w-full min-h-[44px] rounded-lg bg-[var(--brand-primary)] text-white text-sm font-semibold hover:bg-[var(--brand-primary-hover)]"
              >
                Continue Shopping
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <ShoppingBag className="w-10 h-10 mx-auto text-[#6B21A8]/40" />
              <p className="text-base font-medium text-[#1E1428]">Your shopping bag is empty</p>
              <p className="text-sm text-[#645473]">
                Browse sarees, kurtis, menswear, and kids festive outfits to add items.
              </p>
            </div>
          ) : step === 'bag' ? (
            <>
              <div className="space-y-3">
                {cart.map((item, idx) => (
                  <div
                    key={`${item.productId}-${item.size}-${item.color}`}
                    className="flex gap-3 p-3 rounded-xl border border-[#EFE4F7] bg-white"
                  >
                    <SmartImage
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 rounded-lg object-cover shrink-0 bg-[#FDF2F8]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1E1428] truncate">{item.name}</p>
                      <p className="text-xs text-[#645473] mt-0.5">
                        Size: {item.size} · Color: {item.color}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-[#1E1428] font-mono-num">
                          {formatINR(item.price * item.quantity)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label="Decrease item quantity"
                            onClick={() => onUpdateQty(idx, -1)}
                            className="w-8 h-8 rounded-md border border-[#EFE4F7] flex items-center justify-center hover:bg-[#FDF2F8]"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center text-xs font-semibold font-mono-num">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase item quantity"
                            onClick={() => onUpdateQty(idx, 1)}
                            className="w-8 h-8 rounded-md border border-[#EFE4F7] flex items-center justify-center hover:bg-[#FDF2F8]"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Remove item"
                            onClick={() => onRemoveItem(idx)}
                            className="w-8 h-8 rounded-md text-[#645473] hover:text-red-600 flex items-center justify-center ml-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Box */}
              <div className="p-4 rounded-xl border border-[#EFE4F7] bg-[#FFF9FC] space-y-2">
                <label className="text-xs font-semibold text-[#1E1428] flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-[#DB2777]" />
                  Apply Promo / Coupon Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Try RADHA10 or FESTIVE100"
                    className="flex-1 min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7] bg-white focus:outline-none focus:border-[var(--brand-primary)]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="min-h-[40px] px-4 rounded-lg bg-[#581C87] text-white text-xs font-semibold hover:bg-[#6B21A8] whitespace-nowrap"
                  >
                    Apply
                  </button>
                </div>
                {couponMessage && (
                  <p
                    className={`text-xs ${
                      appliedCoupon ? 'text-emerald-700 font-medium' : 'text-red-600'
                    }`}
                  >
                    {couponMessage}
                  </p>
                )}
              </div>
            </>
          ) : (
            <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-5">
              <button
                type="button"
                onClick={() => setStep('bag')}
                className="text-xs font-semibold text-[var(--brand-primary)] hover:underline"
              >
                ← Back to Bag
              </button>

              {/* Delivery Address */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#1E1428] flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[var(--brand-primary)]" />
                  Delivery Address
                </h3>

                {user && user.addresses.length > 0 && (
                  <div className="space-y-2">
                    {user.addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`block p-3 rounded-xl border cursor-pointer transition-colors ${
                          selectedAddressId === addr.id
                            ? 'border-[var(--brand-primary)] bg-[#FDF2F8]'
                            : 'border-[#EFE4F7] bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="radio"
                            name="savedAddress"
                            checked={selectedAddressId === addr.id}
                            onChange={() => setSelectedAddressId(addr.id)}
                            className="mt-1 accent-[#6B21A8]"
                          />
                          <div className="text-xs space-y-0.5">
                            <p className="font-semibold text-[#1E1428]">
                              {addr.label} · {addr.fullName} ({addr.phone})
                            </p>
                            <p className="text-[#645473]">
                              {addr.street}, {addr.city}, {addr.state} — {addr.pincode}
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                    <label className="flex items-center gap-2 text-xs font-medium text-[#581C87] cursor-pointer pt-1">
                      <input
                        type="radio"
                        name="savedAddress"
                        checked={selectedAddressId === 'new'}
                        onChange={() => setSelectedAddressId('new')}
                        className="accent-[#6B21A8]"
                      />
                      Deliver to a new address
                    </label>
                  </div>
                )}

                {(selectedAddressId === 'new' || !user?.addresses.length) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-[#EFE4F7] bg-[#FFF9FC]">
                    <input
                      type="text"
                      required
                      placeholder="Full Name *"
                      value={newAddress.fullName}
                      onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                      className="min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7] bg-white"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Mobile Number *"
                      value={newAddress.phone}
                      onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                      className="min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7] bg-white"
                    />
                    <input
                      type="text"
                      required
                      placeholder="House / Street / Chauraha *"
                      value={newAddress.street}
                      onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                      className="sm:col-span-2 min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7] bg-white"
                    />
                    <input
                      type="text"
                      required
                      placeholder="City / District *"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                      className="min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7] bg-white"
                    />
                    <input
                      type="text"
                      required
                      placeholder="PIN Code *"
                      value={newAddress.pincode}
                      onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value })}
                      className="min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7] bg-white"
                    />
                    <input
                      type="text"
                      required
                      placeholder="State *"
                      value={newAddress.state}
                      onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                      className="sm:col-span-2 min-h-[40px] px-3 text-sm rounded-lg border border-[#EFE4F7] bg-white"
                    />
                    <label className="sm:col-span-2 flex items-center gap-2 text-xs text-[#645473]">
                      <input
                        type="checkbox"
                        checked={saveAddressToProfile}
                        onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                        className="accent-[#6B21A8]"
                      />
                      Save this address for future orders
                    </label>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#1E1428]">Payment Option</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('COD')}
                    className={`min-h-[44px] px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                      paymentMethod === 'COD'
                        ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                        : 'bg-white text-[#1E1428] border-[#EFE4F7]'
                    }`}
                  >
                    Cash on Delivery (COD)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI_QR')}
                    className={`min-h-[44px] px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                      paymentMethod === 'UPI_QR'
                        ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                        : 'bg-white text-[#1E1428] border-[#EFE4F7]'
                    }`}
                  >
                    Pay via Store UPI QR
                  </button>
                </div>

                {paymentMethod === 'UPI_QR' && (
                  <div className="space-y-3">
                    <PaymentQrDisplay
                      qrUrl={settings?.paymentQrUrl}
                      upiId={settings?.upiId || '8081465761@upi'}
                      storeName={settings?.storeName || 'Radha Clothes Shop'}
                      amount={totalAmount}
                    />
                    <input
                      type="text"
                      required
                      placeholder="Enter 12-digit UPI UTR / Reference Number *"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full min-h-[42px] px-3 text-sm rounded-lg border border-[#EFE4F7] bg-white focus:outline-none focus:border-[var(--brand-primary)]"
                    />
                  </div>
                )}
              </div>

              {errorMsg && (
                <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {errorMsg}
                </p>
              )}
            </form>
          )}
        </div>

        {/* Sticky Drawer Footer Summary */}
        {cart.length > 0 && step !== 'success' && (
          <div className="border-t border-[#EFE4F7] bg-[#FFF9FC] p-5 space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#645473]">
                <span>Subtotal</span>
                <span className="font-mono-num">{formatINR(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon Discount ({appliedCoupon?.code})</span>
                  <span className="font-mono-num">-{formatINR(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#645473]">
                <span>Delivery</span>
                <span className="font-mono-num">
                  {deliveryCharge === 0 ? 'FREE' : formatINR(deliveryCharge)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#1E1428] pt-2 border-t border-[#EFE4F7]">
                <span>Total Payable</span>
                <span className="font-mono-num">{formatINR(totalAmount)}</span>
              </div>
            </div>

            {step === 'bag' ? (
              <button
                type="button"
                onClick={handleProceedToCheckout}
                className="w-full min-h-[46px] rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold transition-colors"
              >
                {user ? 'Proceed to Checkout' : 'Login / Register to Checkout'}
              </button>
            ) : (
              <button
                type="submit"
                form="checkout-form"
                disabled={submitting}
                className="w-full min-h-[46px] rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] disabled:opacity-60 text-white text-sm font-semibold transition-colors"
              >
                {submitting ? 'Placing Order...' : `Confirm Order · ${formatINR(totalAmount)}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
