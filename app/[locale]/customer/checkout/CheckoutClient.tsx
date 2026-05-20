"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  CreditCard,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Zap,
  Wallet,
  Coins,
  Plus,
  MessageCircle,
} from "lucide-react";
import { useCartStore } from "@/lib/store/useCartStore";
import { toast } from "sonner";
import { checkoutSchema, type CheckoutInput } from "@/lib/validations/checkout";
import { placeOrderAction, getUserAddressesAction } from "@/app/actions/orders";
import { getWalletAction } from "@/app/actions/merchant";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Address } from "@/lib/types";

const COD_FEE = 5.0;

export default function CheckoutClient() {
  const t = useTranslations();
  const { items, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"wallet" | "cod">(
    "wallet",
  );
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [isWalletLocked, setIsWalletLocked] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [showNewAddressForm, setShowNewAddressForm] = useState(true);
  const [saveAddress, setSaveAddress] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof CheckoutInput, string>>
  >({});

  const subtotal = items.reduce(
    (sum, item) => sum + item.variant_price * item.quantity,
    0,
  );
  const shipping = subtotal > 100 ? 0 : 10;
  const tax = subtotal * 0.1;
  const currentCodFee = paymentMethod === "cod" ? COD_FEE : 0;
  const total = subtotal + shipping + tax + currentCodFee;

  useEffect(() => {
    async function fetchData() {
      const [addrRes, walletRes] = await Promise.all([
        getUserAddressesAction(),
        getWalletAction(),
      ]);

      if ("addresses" in addrRes && addrRes.addresses) {
        const userAddresses = addrRes.addresses as Address[];
        setAddresses(userAddresses);
        if (userAddresses.length > 0) {
          setShowNewAddressForm(false);
          setSelectedAddressId(userAddresses[0].id);
          setFormData(userAddresses[0]);
        }
      }

      if ("wallet" in walletRes && walletRes.wallet) {
        setWalletBalance(walletRes.wallet.balance);
        const locked = Boolean(walletRes.wallet.is_locked);
        setIsWalletLocked(locked);
        if (locked) setPaymentMethod("cod");
      }
    }
    fetchData();
  }, []);

  const handleAddressSelect = (addr: (typeof addresses)[0]) => {
    setSelectedAddressId(addr.id);
    setFormData(addr);
    setShowNewAddressForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side zod validation
    const result = checkoutSchema.safeParse(formData);
    if (!result.success) {
      const errors: Partial<Record<keyof CheckoutInput, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof CheckoutInput;
        errors[field] = issue.message;
      }
      setFieldErrors(errors);
      toast.error(t("messages.fillAllFields"));
      return;
    }
    setFieldErrors({});

    if (paymentMethod === "wallet" && isWalletLocked) {
      toast.error(t("wallet.lockedByAdmin"));
      return;
    }

    if (
      paymentMethod === "wallet" &&
      walletBalance !== null &&
      walletBalance < total
    ) {
      toast.error(t("wallet.insufficientBalance"));
      return;
    }

    setLoading(true);

    try {
      const res = await placeOrderAction({
        items: items.map((i) => ({
          id: i.id,
          product_id: i.product_id,
          quantity: i.quantity,
          variant_price: i.variant_price,
          merchant_id: i.merchant_id,
          variant_id: i.variant_id,
          variant_details: i.variant_details,
        })),
        shipping: formData,
        subtotal,
        shippingCost: shipping,
        tax,
        total,
        paymentMethod,
        codFee: currentCodFee,
        saveAddress: showNewAddressForm && saveAddress,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        setSuccess(true);
        clearCart();
        toast.success(t("order.confirmed"));
      }
    } catch {
      toast.error(t("messages.error") || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-background py-24 px-4 h-full flex items-center justify-center">
        <div className="max-w-xl w-full bg-card border border-border rounded-[3rem] p-12 text-center shadow-2xl shadow-primary/10">
          <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 size={56} className="text-green-500" />
          </div>
          <h1 className="text-4xl font-black text-foreground mb-4 tracking-tight">
            {t("order.confirmed")}
          </h1>
          <p className="text-muted-foreground mb-10 text-lg font-medium">
            {t("order.successDesc")}
          </p>
          <div className="space-y-4">
            <Link
              href="/customer/orders"
              className="block w-full bg-primary text-primary-foreground py-4 rounded-2xl font-black text-lg hover:scale-105 transition-all shadow-xl shadow-primary/20"
            >
              {t("customer.myOrders")}
            </Link>
            <Link
              href="/"
              className="block w-full text-muted-foreground hover:text-primary font-bold py-2 transition-all"
            >
              {t("common.backToHome")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (items.length === 0 && !success) {
    return (
      <main className="min-h-screen bg-background py-24 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{t("cart.empty")}</h2>
          <Link
            href="/products"
            className="text-primary font-bold hover:underline"
          >
            {t("home.browseProducts")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50/50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/cart"
          className="flex items-center gap-2 text-primary hover:text-primary/80 mb-10 font-bold transition-all w-fit"
        >
          <ArrowLeft size={20} />
          {t("common.back")}
        </Link>

        <h1 className="text-4xl font-black text-foreground tracking-tight mb-12">
          {t("cart.checkout")}
        </h1>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-3 gap-12"
        >
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Shipping Section */}
            <section className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <Truck size={24} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900">
                    {t("order.shippingAddress")}
                  </h2>
                </div>
                {addresses.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewAddressForm(true);
                      setSelectedAddressId(null);
                      setFormData({
                        fullName: "",
                        email: "",
                        phone: "",
                        address: "",
                        city: "",
                        state: "",
                        zipCode: "",
                        country: "",
                      });
                    }}
                    className="rounded-xl font-bold"
                  >
                    <Plus size={18} className="mr-2" />
                    {t("order.addNewAddress")}
                  </Button>
                )}
              </div>

              {/* Saved Addresses List */}
              {addresses.length > 0 && !showNewAddressForm && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => handleAddressSelect(addr)}
                      className={cn(
                        "p-6 rounded-3xl border-2 transition-all cursor-pointer relative group",
                        selectedAddressId === addr.id
                          ? "border-primary bg-primary/5"
                          : "border-gray-100 hover:border-primary/20 bg-gray-50/50",
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-black text-gray-900">
                            {addr.fullName}
                          </p>
                          <p className="text-sm text-gray-500 font-medium">
                            {addr.address}
                          </p>
                          <p className="text-sm text-gray-500 font-medium">
                            {addr.city}, {addr.state} {addr.zipCode}
                          </p>
                        </div>
                        {selectedAddressId === addr.id && (
                          <div className="bg-primary text-white p-1 rounded-full">
                            <CheckCircle2 size={16} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showNewAddressForm && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">
                      {t("auth.fullName")}
                    </label>
                    <input
                      required
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      className={`w-full h-14 bg-gray-50 border rounded-2xl px-6 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium ${
                        fieldErrors.fullName
                          ? "border-red-500 ring-red-500/20"
                          : "border-gray-100"
                      }`}
                      placeholder={t("auth.fullNamePlaceholder") || "John Doe"}
                    />
                    {fieldErrors.fullName && (
                      <p className="text-xs text-red-500 font-medium ml-1">
                        {fieldErrors.fullName}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">
                      {t("auth.email")}
                    </label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className={`w-full h-14 bg-gray-50 border rounded-2xl px-6 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium ${
                        fieldErrors.email
                          ? "border-red-500 ring-red-500/20"
                          : "border-gray-100"
                      }`}
                      placeholder={
                        t("auth.emailPlaceholder") || "john@example.com"
                      }
                    />
                    {fieldErrors.email && (
                      <p className="text-xs text-red-500 font-medium ml-1">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">
                      {t("auth.phone")}
                    </label>
                    <input
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className={`w-full h-14 bg-gray-50 border rounded-2xl px-6 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium ${
                        fieldErrors.phone
                          ? "border-red-500 ring-red-500/20"
                          : "border-gray-100"
                      }`}
                      placeholder={
                        t("auth.phonePlaceholder") || "+1 (555) 123-4567"
                      }
                    />
                    {fieldErrors.phone && (
                      <p className="text-xs text-red-500 font-medium ml-1">
                        {fieldErrors.phone}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">
                      {t("order.address")}
                    </label>
                    <input
                      required
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      className={`w-full h-14 bg-gray-50 border rounded-2xl px-6 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium ${
                        fieldErrors.address
                          ? "border-red-500 ring-red-500/20"
                          : "border-gray-100"
                      }`}
                      placeholder={
                        t("order.addressPlaceholder") || "123 Lighting St"
                      }
                    />
                    {fieldErrors.address && (
                      <p className="text-xs text-red-500 font-medium ml-1">
                        {fieldErrors.address}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">
                      {t("order.city")}
                    </label>
                    <input
                      required
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      className={`w-full h-14 bg-gray-50 border rounded-2xl px-6 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium ${
                        fieldErrors.city
                          ? "border-red-500 ring-red-500/20"
                          : "border-gray-100"
                      }`}
                      placeholder={t("order.cityPlaceholder") || "Neo City"}
                    />
                    {fieldErrors.city && (
                      <p className="text-xs text-red-500 font-medium ml-1">
                        {fieldErrors.city}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">
                      {t("order.state")}
                    </label>
                    <input
                      required
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      className={`w-full h-14 bg-gray-50 border rounded-2xl px-6 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium ${
                        fieldErrors.state
                          ? "border-red-500 ring-red-500/20"
                          : "border-gray-100"
                      }`}
                      placeholder={
                        t("order.statePlaceholder") || "Lumi Province"
                      }
                    />
                    {fieldErrors.state && (
                      <p className="text-xs text-red-500 font-medium ml-1">
                        {fieldErrors.state}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">
                      {t("order.zipCode")}
                    </label>
                    <input
                      required
                      value={formData.zipCode}
                      onChange={(e) =>
                        setFormData({ ...formData, zipCode: e.target.value })
                      }
                      className={`w-full h-14 bg-gray-50 border rounded-2xl px-6 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium ${
                        fieldErrors.zipCode
                          ? "border-red-500 ring-red-500/20"
                          : "border-gray-100"
                      }`}
                      placeholder={t("order.zipCodePlaceholder") || "12345"}
                    />
                    {fieldErrors.zipCode && (
                      <p className="text-xs text-red-500 font-medium ml-1">
                        {fieldErrors.zipCode}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">
                      {t("order.country")}
                    </label>
                    <input
                      required
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                      className={`w-full h-14 bg-gray-50 border rounded-2xl px-6 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium ${
                        fieldErrors.country
                          ? "border-red-500 ring-red-500/20"
                          : "border-gray-100"
                      }`}
                      placeholder={t("order.countryPlaceholder") || "Freedonia"}
                    />
                    {fieldErrors.country && (
                      <p className="text-xs text-red-500 font-medium ml-1">
                        {fieldErrors.country}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2 flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="saveAddress"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                      className="w-5 h-5 rounded-lg accent-primary"
                    />
                    <label
                      htmlFor="saveAddress"
                      className="text-sm font-bold text-gray-600"
                    >
                      {t("order.saveAddressToProfile")}
                    </label>
                  </div>

                  {addresses.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowNewAddressForm(false);
                        handleAddressSelect(addresses[0]);
                      }}
                      className="md:col-span-2 text-primary font-bold"
                    >
                      {t("order.useSavedAddress")}
                    </Button>
                  )}
                </div>
              )}
            </section>

            {/* Payment Section */}
            <section className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <CreditCard size={24} />
                </div>
                <h2 className="text-2xl font-black text-gray-900">
                  {t("order.payment")}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Wallet Payment Option */}
                <div
                  onClick={() => {
                    if (!isWalletLocked) setPaymentMethod("wallet");
                  }}
                  className={cn(
                    "p-6 rounded-3xl border-2 transition-all cursor-pointer",
                    paymentMethod === "wallet"
                      ? "border-primary bg-primary/5"
                      : "border-gray-100 bg-gray-50/50",
                    isWalletLocked && "cursor-not-allowed opacity-60",
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                      <Wallet size={24} />
                    </div>
                    {paymentMethod === "wallet" && (
                      <div className="bg-primary text-white p-1 rounded-full">
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                  </div>
                  <p className="font-black text-gray-900">
                    {t("customer.wallet")}
                  </p>
                  <p className="text-sm text-gray-500 font-medium mb-4">
                    {t("order.payFromBalance")}
                  </p>
                  <div className="flex items-center gap-2 text-primary">
                    <Coins size={16} />
                    <span className="font-black">
                      ${walletBalance?.toFixed(2) || "0.00"}
                    </span>
                  </div>
                  {walletBalance !== null && walletBalance < total && (
                    <p className="text-[10px] text-red-500 font-bold mt-2 uppercase tracking-wider">
                      {t("wallet.insufficientBalance")}
                    </p>
                  )}
                  {isWalletLocked && (
                    <p className="text-[10px] text-red-500 font-bold mt-2 uppercase tracking-wider">
                      {t("wallet.lockedByAdmin")}
                    </p>
                  )}
                </div>

                {/* COD Payment Option */}
                <div
                  onClick={() => setPaymentMethod("cod")}
                  className={cn(
                    "p-6 rounded-3xl border-2 transition-all cursor-pointer",
                    paymentMethod === "cod"
                      ? "border-primary bg-primary/5"
                      : "border-gray-100 bg-gray-50/50",
                  )}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-orange-500/10 rounded-2xl flex items-center justify-center text-orange-500">
                      <Truck size={24} />
                    </div>
                    {paymentMethod === "cod" && (
                      <div className="bg-primary text-white p-1 rounded-full">
                        <CheckCircle2 size={16} />
                      </div>
                    )}
                  </div>
                  <p className="font-black text-gray-900">{t("order.cod")}</p>
                  <p className="text-sm text-gray-500 font-medium">
                    {t("order.payOnDelivery")}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar / Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 text-white rounded-[3rem] p-8 md:p-10 sticky top-24 space-y-8 shadow-2xl shadow-gray-900/20">
              <h2 className="text-2xl font-black tracking-tight">
                {t("order.summary")}
              </h2>

              {/* Items List */}
              <div className="space-y-4 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 items-center">
                    <div className="w-16 h-16 bg-white/10 rounded-xl overflow-hidden relative shrink-0">
                      {item.product?.image_url && (
                        <Image
                          src={item.product?.image_url}
                          alt={item.product_name}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm line-clamp-1">
                        {item.product_name}
                      </p>
                      {item.variant_details && (
                        <div className="flex items-center gap-1.5 mt-0.5 mb-0.5">
                          {item.variant_details.color && (
                            <span className="text-[10px] text-white/50 font-medium bg-white/5 px-1.5 py-0.5 rounded">
                              {item.variant_details.color}
                            </span>
                          )}
                          {item.variant_details.size && (
                            <span className="text-[10px] text-white/50 font-medium bg-white/5 px-1.5 py-0.5 rounded">
                              {item.variant_details.size}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-white/60 text-xs font-medium">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="font-black text-sm">
                      ${(item.variant_price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Final Totals */}
              <div className="space-y-4 border-t border-white/10 pt-8">
                <div className="flex justify-between text-white/60 font-medium">
                  <span>{t("order.subtotal")}</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-white/60 font-medium">
                  <span>{t("order.shipping")}</span>
                  <span className={shipping === 0 ? "text-green-400" : ""}>
                    {shipping === 0
                      ? t("common.free")
                      : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-white/60 font-medium">
                  <span>{t("order.tax")}</span>
                  <span>${tax.toFixed(2)}</span>
                </div>

                {paymentMethod === "cod" && (
                  <div className="flex justify-between text-orange-400 font-bold bg-orange-400/10 px-3 py-2 rounded-lg">
                    <span>{t("order.codFee") || "COD Fee"}</span>
                    <span>+${COD_FEE.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-6 border-t border-white/10 mt-6 flex justify-between items-center">
                  <span className="text-lg font-black text-white">
                    {t("order.total")}
                  </span>
                  <span className="text-3xl font-black text-primary">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <button
                  type="submit"
                  disabled={
                    loading ||
                    (paymentMethod === "wallet" && isWalletLocked) ||
                    (paymentMethod === "wallet" &&
                      walletBalance !== null &&
                      walletBalance < total)
                  }
                  className="w-full bg-primary text-primary-foreground h-16 rounded-2xl font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <Zap size={22} fill="currentColor" />
                  )}
                  {t("order.confirm")}
                </button>

                <div className="flex flex-col items-center justify-center gap-4 text-white/40 pt-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {t("order.encryptedSecure")}
                    </span>
                  </div>
                  <Link href="/chat/support" className="w-full">
                    <Button
                      variant="ghost"
                      className="w-full text-xs font-black uppercase tracking-widest text-white/60 hover:text-primary hover:bg-white/5 h-12 rounded-xl gap-2 transition-all"
                    >
                      <MessageCircle size={16} />
                      {t("chat.chatWithMerchant")}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
