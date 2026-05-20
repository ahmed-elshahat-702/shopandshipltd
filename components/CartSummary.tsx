'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { CartItem } from "@/lib/types";

interface CartSummaryProps {
  items: CartItem[];
  onCheckout?: () => void;
  checkoutLoading?: boolean;
}

export default function CartSummary({
  items,
  onCheckout,
  checkoutLoading = false,
}: CartSummaryProps) {
  const t = useTranslations();

  const subtotal = items.reduce(
    (sum, item) => sum + item.variant_price * item.quantity,
    0
  );

  const shipping = subtotal > 100 ? 0 : 10; // Free shipping over $100
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + shipping + tax;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 sticky top-4 h-fit">
      <h2 className="text-xl font-bold text-gray-900 mb-6">{t('cart.title')}</h2>

      <div className="space-y-4 mb-6">
        <div className="flex justify-between text-gray-700">
          <span>{t('order.subtotal')}</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-gray-700">
          <span>{t('order.shipping')}</span>
          <span>{shipping === 0 ? t('common.free') : `$${shipping.toFixed(2)}`}</span>
        </div>

        <div className="flex justify-between text-gray-700">
          <span>{t('order.tax')}</span>
          <span>${tax.toFixed(2)}</span>
        </div>

        {shipping === 0 && (
          <div className="text-sm text-green-600 font-semibold">
            ✓ {t('cart.freeShippingQualified')}
          </div>
        )}
      </div>

      <div className="border-t-2 border-gray-200 pt-4 mb-6">
        <div className="flex justify-between text-lg font-bold text-gray-900">
          <span>{t('order.total')}</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>

      <button
        onClick={onCheckout}
        disabled={checkoutLoading || items.length === 0}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {checkoutLoading ? t('common.loading') : t('cart.checkout')}
      </button>

      <Link
        href="/products"
        className="block w-full text-center mt-4 text-blue-600 hover:text-blue-700 font-semibold"
      >
        {t('cart.continueShopping')}
      </Link>
    </div>
  );
}
