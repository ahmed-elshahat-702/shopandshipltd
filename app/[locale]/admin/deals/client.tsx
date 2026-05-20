"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Deal } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { deleteAdminDealAction } from "@/app/actions/admin";
import { toast } from "sonner";
import DealDialog from "@/components/admin/DealDialog";

interface DealsClientProps {
  initialDeals: Deal[];
}

export default function DealsClient({ initialDeals }: DealsClientProps) {
  const t = useTranslations();
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const handleAddDeal = () => {
    setEditingDeal(null);
    setIsDialogOpen(true);
  };

  const handleEditDeal = (deal: Deal) => {
    setEditingDeal(deal);
    setIsDialogOpen(true);
  };

  const handleDeleteDeal = async (id: string) => {
    try {
      const result = await deleteAdminDealAction(id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setDeals(deals.filter((d) => d.id !== id));
        toast.success(t("admin.dealDeleted"));
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : t("admin.dealDeletionFailed");
      toast.error(message);
    }
  };

  const handleSave = (savedDeal: Deal) => {
    if (editingDeal) {
      setDeals(deals.map((d) => (d.id === savedDeal.id ? savedDeal : d)));
    } else {
      setDeals([...deals, savedDeal]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="text-primary" />
            {t("admin.deals")}
          </h1>
          <p className="text-muted-foreground">{t("admin.dealsList")}</p>
        </div>
        <Button onClick={handleAddDeal} className="h-14 px-6 rounded-2xl font-black gap-2 shadow-xl shadow-primary/20">
          <Plus size={20} />
          <span className="hidden sm:inline">{t("admin.addDeal")}</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {deals.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
            {t("admin.noGlobalProducts")} {/* Reusing translation for "no data" */}
          </div>
        ) : (
          deals.map((deal) => (
            <Card key={deal.id} className={!deal.is_active ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold">{deal.title_en}</CardTitle>
                    <CardDescription>{deal.subtitle_en}</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={() => handleEditDeal(deal)}
                    >
                      <Edit2 size={14} />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("admin.areYouSure")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("admin.deleteDealWarning") ||
                              "This action cannot be undone and will permanently delete this deal."}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => handleDeleteDeal(deal.id)}
                          >
                            {t("common.delete")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p className="line-clamp-2 text-muted-foreground italic">
                    {deal.description_en}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">
                      {t("admin.order")}: {deal.sort_order}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        deal.is_active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {deal.is_active ? t("admin.active") : t("admin.inactive")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <DealDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        deal={editingDeal}
        onSave={handleSave}
      />
    </div>
  );
}
