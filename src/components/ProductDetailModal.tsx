import { useState } from 'react';
import { Heart, MessageCircle, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { formatINR } from '../api';
import type { Product, StoreSettings } from '../types';
import { SmartImage } from './SmartImage';

interface ProductDetailModalProps {
  product: Product;
  settings: StoreSettings | null;
  isWishlisted: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, size: string, color: string, quantity: number) => void;
  onToggleWishlist: (productId: string) => void;
}

export function ProductDetailModal({
  product,
  settings,
  isWishlisted,
  onClose,
  onAddToCart,
  onToggleWishlist,
}: ProductDetailModalProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || 'Free Size');
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || 'Default');
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const discountPct =
    product.mrp > product.price
      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
      : 0;

  const whatsappNumber = settings?.whatsapp || '8853380138';
  const whatsappText = encodeURIComponent(
    `Namaste ${settings?.storeName || 'Radha Clothes Shop'}, I want to know more about "${product.name}" (Size: ${selectedSize}, Color: ${selectedColor}, Price: ${formatINR(product.price)}).`
  );

  const handleAdd = () => {
    if (product.stock <= 0) return;
    onAddToCart(product, selectedSize, selectedColor, quantity);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-title"
    >
      <div className="relative w-full max-w-4xl max-h-[100dvh] sm:max-h-[90vh] overflow-y-auto bg-white sm:rounded-2xl border border-[#EFE4F7] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close product details"
          className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white/95 border border-[#EFE4F7] flex items-center justify-center text-[#1E1428] hover:bg-[#FDF2F8] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 sm:p-6 md:p-8 items-start">
          {/* Left Gallery */}
          <div className="space-y-3">
            <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#FDF2F8] border border-[#EFE4F7]">
              <SmartImage
                src={product.images[selectedImage] || product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {product.images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    type="button"
                    onClick={() => setSelectedImage(idx)}
                    className={`w-16 h-14 rounded-lg overflow-hidden border transition-all shrink-0 ${
                      selectedImage === idx
                        ? 'border-[var(--brand-primary)] ring-2 ring-[var(--brand-primary)]/25'
                        : 'border-[#EFE4F7] opacity-75 hover:opacity-100'
                    }`}
                  >
                    <SmartImage
                      src={img}
                      alt={`${product.name} view ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Contiguous Purchase Module */}
          <div className="flex flex-col space-y-5">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#645473]">
                <span>{product.category}</span>
                <span aria-hidden="true">·</span>
                <span>{product.subCategory}</span>
                <span aria-hidden="true">·</span>
                <span>{product.fabric}</span>
              </div>
              <h2
                id="pdp-title"
                className="mt-1.5 text-2xl sm:text-3xl font-semibold text-[#1E1428] leading-tight"
              >
                {product.name}
              </h2>
            </div>

            <div className="flex items-baseline gap-3 pb-4 border-b border-[#EFE4F7]">
              <span className="text-2xl font-bold text-[#1E1428] font-mono-num">
                {formatINR(product.price)}
              </span>
              {product.mrp > product.price && (
                <>
                  <span className="text-sm text-[#645473] line-through font-mono-num">
                    {formatINR(product.mrp)}
                  </span>
                  <span className="text-sm font-semibold text-[#DB2777]">
                    {discountPct}% off
                  </span>
                </>
              )}
              <span className="ml-auto text-xs font-medium text-[#581C87]">
                {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
              </span>
            </div>

            <p className="text-sm text-[#645473] leading-relaxed">{product.description}</p>

            {/* Size Selector */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-[#1E1428] mb-2">
                <span>Select Size</span>
                <span className="text-[#645473] font-normal">{selectedSize}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      selectedSize === size
                        ? 'bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]'
                        : 'bg-white text-[#1E1428] border-[#EFE4F7] hover:border-[var(--brand-primary)]'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selector */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-[#1E1428] mb-2">
                <span>Select Color</span>
                <span className="text-[#645473] font-normal">{selectedColor}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      selectedColor === color
                        ? 'bg-[#FDF2F8] text-[#581C87] border-[var(--brand-primary)]'
                        : 'bg-white text-[#1E1428] border-[#EFE4F7] hover:border-[var(--brand-primary)]'
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity & Primary Actions */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center border border-[#EFE4F7] rounded-lg bg-[#FFF9FC]">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-11 flex items-center justify-center text-[#1E1428] hover:bg-[#FDF2F8]"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold font-mono-num">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQuantity((q) => Math.min(Math.max(1, product.stock), q + 1))}
                    className="w-10 h-11 flex items-center justify-center text-[#1E1428] hover:bg-[#FDF2F8]"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={product.stock <= 0}
                  onClick={handleAdd}
                  className="flex-1 min-h-[44px] px-5 py-2.5 rounded-lg bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {product.stock <= 0
                    ? 'Out of Stock'
                    : addedFeedback
                    ? 'Added to Bag'
                    : 'Add to Bag'}
                </button>

                <button
                  type="button"
                  onClick={() => onToggleWishlist(product.id)}
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                  className={`w-11 h-11 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                    isWishlisted
                      ? 'bg-[#FDF2F8] border-[#DB2777] text-[#DB2777]'
                      : 'bg-white border-[#EFE4F7] text-[#645473] hover:text-[#DB2777]'
                  }`}
                >
                  <Heart className="w-4 h-4" fill={isWishlisted ? 'currentColor' : 'none'} />
                </button>
              </div>

              <a
                href={`https://wa.me/91${whatsappNumber}?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[42px] px-4 py-2 rounded-lg border border-[#EFE4F7] bg-[#FDF2F8] hover:bg-[#FCE7F3] text-[#581C87] text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-[#DB2777]" />
                Ask on WhatsApp ({whatsappNumber})
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
