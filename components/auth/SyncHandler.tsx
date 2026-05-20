"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@/hooks/use-auth";
import { useCartStore } from "@/lib/store/useCartStore";
import { useWishlistStore } from "@/lib/store/useWishlistStore";
import { syncCartAction } from "@/app/actions/cart";
import { syncWishlistAction } from "@/app/actions/wishlist";

export function SyncHandler() {
  const { user } = useUser();
  const prevUserRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    async function performSync() {
      const currentUserId = user?.id || null;
      
      // If user just logged in (prev was null, now has id)
      if (currentUserId && !prevUserRef.current && !isSyncingRef.current) {
        isSyncingRef.current = true;
        console.log("User logged in, syncing stores with DB...");
        
        try {
          // 1. Sync Cart
          const cartState = useCartStore.getState();
          const localCartItems = cartState.items;
          if (localCartItems.length > 0) {
            // Only sync items that don't have a DB ID (if we had a way to distinguish)
            // Or just sync everything once and the DB handles it.
            await syncCartAction(localCartItems.map(item => ({
              product_id: item.product_id,
              merchant_id: item.merchant_id,
              quantity: item.quantity,
              variant_price: item.variant_price,
              variant_id: item.variant_id,
              variant_details: item.variant_details,
            })));
            // After successful sync, we can clear the local storage part 
            // or just rely on syncWithDB to overwrite.
          }
          await cartState.syncWithDB();

          // 2. Sync Wishlist
          const wishlistState = useWishlistStore.getState();
          const localWishlistItems = wishlistState.items;
          if (localWishlistItems.length > 0) {
            await syncWishlistAction(localWishlistItems.map(i => i.id));
          }
          await wishlistState.syncWithDB();
        } catch (error) {
          console.error("Sync failed:", error);
        } finally {
          isSyncingRef.current = false;
        }
      } 
      // If user just logged out
      else if (!currentUserId && prevUserRef.current) {
        console.log("User logged out, clearing stores...");
        useCartStore.getState().clearCart();
        useWishlistStore.getState().clearWishlist();
      }

      prevUserRef.current = currentUserId;
    }

    performSync();
  }, [user?.id]); // Only re-run when user ID changes

  return null;
}
