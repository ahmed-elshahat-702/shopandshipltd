"use client";

import { useTranslations } from "next-intl";
import useSWR, { useSWRConfig } from "swr";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Star, MessageSquare, ThumbsUp, X, Loader2, Send } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Review } from "@/lib/types";
import { reviewSchema, type ReviewInput } from "@/lib/validations/review";

import {
  getProductByIdAction,
  checkUserReviewEligibilityAction,
  submitProductReviewAction,
} from "@/app/actions/products";

interface ReviewsSectionProps {
  productId: string;
  averageRating: number;
  totalReviews: number;
}

export default function ReviewsSection({
  productId,
  averageRating,
  totalReviews,
}: ReviewsSectionProps) {
  const t = useTranslations();
  const { mutate: globalMutate } = useSWRConfig();
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ReviewInput, string>>
  >({});

  const {
    data: reviewsData,
    isLoading,
    mutate,
  } = useSWR(
    ["product-reviews", productId],
    () => getProductByIdAction(productId, true),
    { revalidateOnFocus: false },
  );

  const { data: eligibilityData } = useSWR(
    ["review-eligibility", productId],
    () => checkUserReviewEligibilityAction(productId),
    { revalidateOnFocus: false },
  );

  const reviews = (reviewsData as { reviews?: Review[] })?.reviews || [];
  const distribution = (
    reviewsData as { distribution?: Record<number, number> }
  )?.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const canReview = eligibilityData?.canReview || false;
  const reviewsLocked = eligibilityData?.reason === "reviews_locked";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side zod validation
    const result = reviewSchema.safeParse({ productId, rating, comment });
    if (!result.success) {
      const errors: Partial<Record<keyof ReviewInput, string>> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ReviewInput;
        errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    try {
      const res = await submitProductReviewAction(result.data);

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(
          t("messages.success") || "Review submitted successfully!",
        );
        setComment("");
        setRating(5);
        setShowForm(false);
        mutate(); // Refresh reviews
        globalMutate(["review-eligibility", productId]); // Refresh eligibility
      }
    } catch {
      toast.error("Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm p-8 space-y-10 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-border pb-6">
        <h2 className="text-2xl font-extrabold text-foreground flex items-center gap-3">
          <MessageSquare className="text-primary" size={24} />
          {t("product.reviews")}
        </h2>
        {reviewsLocked ? (
          <span className="rounded-xl bg-orange-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-orange-600">
            {t("product.reviewsLocked")}
          </span>
        ) : (
          canReview &&
          !showForm && (
            <Button
              onClick={() => setShowForm(true)}
              className="rounded-xl font-bold bg-primary/10 text-primary hover:bg-primary/20 border-none"
            >
              {t("product.writeReview") || "Write a Review"}
            </Button>
          )
        )}
      </div>

      {/* Review Form ... (unchanged) */}
      {reviewsLocked && (
        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 text-sm font-bold text-orange-700">
          {t("product.reviewsLockedDesc")}
        </div>
      )}

      {showForm && !reviewsLocked && (
        <div className="bg-primary/5 rounded-[2rem] p-8 border-2 border-primary/20 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-gray-900">
              {t("product.yourExperience")}
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-900"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">
                {t("product.rating")}
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="transition-all hover:scale-110 active:scale-95"
                  >
                    <Star
                      size={32}
                      className={cn(
                        "transition-colors",
                        star <= rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-200 fill-gray-100 hover:text-yellow-200",
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-gray-500 ml-1">
                {t("product.comment")}
              </label>
              <Textarea
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  if (fieldErrors.comment)
                    setFieldErrors((prev) => ({ ...prev, comment: undefined }));
                }}
                placeholder={
                  t("product.commentPlaceholder") ||
                  "Share your thoughts about the product..."
                }
                className={cn(
                  "min-h-32 rounded-2xl bg-white focus:ring-primary/20 transition-all font-medium text-gray-900",
                  fieldErrors.comment
                    ? "border-destructive focus:border-destructive"
                    : "border-gray-200 focus:border-primary",
                )}
                required
              />
              {fieldErrors.comment && (
                <p className="text-xs text-destructive mt-1">
                  {fieldErrors.comment}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 rounded-2xl font-black text-lg bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all gap-3"
            >
              {isSubmitting ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <>
                  <Send size={20} />
                  {t("common.submitReview")}
                </>
              )}
            </Button>
          </form>
        </div>
      )}

      {/* Rating Summary */}
      <div className="flex flex-col md:flex-row items-center gap-12 bg-muted/20 p-8 rounded-3xl border border-border/40">
        <div className="flex flex-col items-center shrink-0">
          <div className="text-6xl font-extrabold text-foreground leading-none">
            {averageRating.toFixed(1)}
          </div>
          <div className="flex gap-1 my-4">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={24}
                className={
                  i < Math.round(averageRating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/30 fill-muted-foreground/10"
                }
              />
            ))}
          </div>
          <div className="text-sm font-bold text-muted-foreground uppercase tracking-widest text-center">
            {totalReviews} {t("common.ratings")}
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="flex-1 w-full space-y-3">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = distribution[stars as keyof typeof distribution] || 0;
            const percentage =
              totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            return (
              <div key={stars} className="flex items-center gap-4 group">
                <span className="text-xs font-extrabold text-muted-foreground w-10 flex items-center gap-1">
                  {stars}{" "}
                  <Star
                    size={10}
                    className="fill-muted-foreground text-muted-foreground"
                  />
                </span>
                <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden border border-border/50">
                  <div
                    className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)] transition-all duration-1000 ease-out"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-bold text-foreground w-12 text-right opacity-60">
                  {Math.round(percentage)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <LoadingSpinner />
          <span className="text-sm font-bold text-primary animate-pulse">
            {" "}
            {t("product.gatheringFeedback")}
          </span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-20 bg-muted/10 rounded-3xl border border-dashed border-border/60">
          <p className="text-muted-foreground font-medium">
            {t("product.noReviews")}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {t("product.beTheFirst")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((review: Review) => {
            const reviewerName =
              review.profiles?.full_name ||
              (review.users
                ? `${review.users.first_name} ${review.users.last_name}`
                : "Verified Customer");
            const reviewerImage = review.profiles?.profile_image_url;

            return (
              <div
                key={review.id}
                className="bg-background border border-border/60 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/20 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-extrabold uppercase ring-4 ring-background overflow-hidden relative text-center">
                        {reviewerImage ? (
                          <Image
                            src={reviewerImage}
                            alt={reviewerName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          reviewerName.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="font-extrabold text-foreground text-sm">
                          {reviewerName}
                        </div>
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                          {new Date(review.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={10}
                          className={
                            i < review.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/30 fill-muted-foreground/10"
                          }
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-muted-foreground text-sm leading-relaxed line-clamp-4 italic group-hover:line-clamp-none transition-all">
                      &quot;{review.comment}&quot;
                    </p>
                  </div>

                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
                      {review.images.map((image: string, idx: number) => (
                        <div
                          key={idx}
                          className="relative w-16 h-16 rounded-lg border border-border overflow-hidden shrink-0 group/img cursor-zoom-in"
                        >
                          <Image
                            src={image}
                            alt={`Review image ${idx + 1}`}
                            fill
                            className="object-cover transition-transform group-hover/img:scale-110"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border/40 flex items-center justify-between mt-auto">
                  <button className="flex items-center gap-1.5 text-[10px] font-extrabold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">
                    <ThumbsUp size={12} />
                    {t("product.helpful")} ({review.helpful_count || 0})
                  </button>
                  <div className="text-[10px] font-bold text-green-600 bg-green-100/50 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-tighter">
                    {t("product.verifiedPurchase")}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
