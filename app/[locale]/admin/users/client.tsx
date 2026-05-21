"use client";

import { useTranslations } from "next-intl";
import useSWR from "swr";
import { useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  ArrowLeft,
  ArrowRight,
  Users,
  User,
  Store,
  ShieldCheck,
  Mail,
  Calendar,
  Search,
  Plus,
  Trash2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getAdminUsersAction,
  createAdminUserAction,
  deleteAdminUserAction,
  updateAdminUserAction,
  adminRechargeWalletAction,
} from "@/app/actions/admin";
import { UsersResponse } from "@/lib/types";
import { toast } from "sonner";
import { useUser } from "@/hooks/use-auth";

import { Skeleton } from "@/components/ui/skeleton";
import { z } from "zod";

const userSchema = z.object({
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  full_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .optional()
    .or(z.literal("")),
  role: z.string().min(1, "Role is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional()
    .or(z.literal("")),
});
type UserInput = z.infer<typeof userSchema>;

const TableSkeleton = () => (
  <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
    <div className="p-8 space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 py-4 border-b border-border last:border-0"
        >
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-8 w-20 rounded-xl" />
          <Skeleton className="h-8 w-10 rounded-xl" />
        </div>
      ))}
    </div>
  </div>
);

export default function UsersClient({
  initialData,
}: {
  initialData: UsersResponse;
}) {
  const { user: currentUser } = useUser();
  const t = useTranslations();
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [managingUser, setManagingUser] = useState<{
    id: string;
    email: string;
    role: string;
    full_name: string;
    is_active: boolean;
    wallet_locked: boolean;
    password?: string;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [rechargingUser, setRechargingUser] = useState<{ id: string; name: string } | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [rechargeDescription, setRechargeDescription] = useState("");
  const [isRecharging, setIsRecharging] = useState(false);

  const [newUser, setNewUser] = useState({
    email: "",
    full_name: "",
    role: "customer",
    password: "",
  });
  const [newFieldErrors, setNewFieldErrors] = useState<
    Partial<Record<keyof UserInput, string>>
  >({});
  const [manageFieldErrors, setManageFieldErrors] = useState<
    Partial<Record<keyof UserInput, string>>
  >({});

  const { data, isLoading, mutate } = useSWR(
    ["admin-users", page, roleFilter, search],
    () => getAdminUsersAction({ page, role: roleFilter, search }),
    {
      revalidateOnFocus: false,
      fallbackData:
        page === 1 && !roleFilter && !search ? initialData : undefined,
    },
  );

  const handleCreateUser = async () => {
    const result = userSchema.safeParse(newUser);
    if (!result.success) {
      const errors: Partial<Record<keyof UserInput, string>> = {};
      for (const issue of result.error.issues) {
        if (issue.path[0]) {
          errors[issue.path[0] as keyof UserInput] = issue.message;
        }
      }
      setNewFieldErrors(errors);
      return;
    }
    setNewFieldErrors({});
    setIsCreating(true);
    try {
      const res = await createAdminUserAction(newUser);
      if ("error" in res) {
        toast.error(t(`messages.${res.error}`) || res.error);
      } else {
        toast.success(t("messages.userCreateSuccess"));
        setIsAddModalOpen(false);
        setNewUser({
          email: "",
          full_name: "",
          role: "customer",
          password: "",
        });
        mutate();
      }
    } catch {
      toast.error(t("messages.operationFailed"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?.id) {
      toast.error(t("messages.cannotDeleteSelf"));
      return;
    }
    setIsDeleting(true);
    try {
      const res = await deleteAdminUserAction(userId);
      if ("error" in res) {
        toast.error(t(`messages.${res.error}`) || res.error);
      } else {
        toast.success(t("messages.userDeleteSuccess"));
        setUserToDelete(null);
        mutate();
      }
    } catch {
      toast.error(t("messages.operationFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!managingUser) return;
    if (managingUser.id === currentUser?.id) {
      toast.error(t("messages.cannotUpdateSelf"));
      return;
    }
    const { email, full_name, role, password } = managingUser;
    const result = userSchema.safeParse({
      email: email || "",
      full_name: full_name || "",
      role,
      password,
    });
    if (!result.success) {
      const errors: Partial<Record<keyof UserInput, string>> = {};
      for (const issue of result.error.issues) {
        if (issue.path[0]) {
          errors[issue.path[0] as keyof UserInput] = issue.message;
        }
      }
      setManageFieldErrors(errors);
      return;
    }
    setManageFieldErrors({});
    setIsUpdating(true);
    try {
      const res = await updateAdminUserAction(managingUser.id, {
        email: managingUser.email,
        role: managingUser.role,
        full_name: managingUser.full_name,
        is_active: managingUser.is_active,
        wallet_locked: managingUser.wallet_locked,
        ...(managingUser.password ? { password: managingUser.password } : {}),
      });
      if ("error" in res) {
        toast.error(t(`messages.${res.error}`) || res.error);
      } else {
        toast.success(t("messages.userUpdateSuccess"));
        setManagingUser(null);
        mutate();
      }
    } catch {
      toast.error(t("messages.operationFailed"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRechargeWallet = async () => {
    if (!rechargingUser) return;
    const amount = Number(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t("admin.invalidAmount") || "Invalid amount");
      return;
    }
    setIsRecharging(true);
    try {
      const res = await adminRechargeWalletAction(
        rechargingUser.id,
        amount,
        rechargeDescription
      );
      if ("error" in res) {
        toast.error(t(`messages.${res.error}`) || res.error);
      } else {
        toast.success(t("messages.rechargeSuccess") || "Wallet recharged successfully");
        setRechargingUser(null);
        setRechargeAmount("");
        setRechargeDescription("");
        mutate();
      }
    } catch {
      toast.error(t("messages.operationFailed"));
    } finally {
      setIsRecharging(false);
    }
  };

  const users = data?.users || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.total || 0;

  const roles = [
    { id: null, label: t("common.all"), icon: Users },
    { id: "customer", label: t("admin.customers"), icon: User },
    { id: "merchant", label: t("admin.merchants"), icon: Store },
    ...(currentUser?.role === "superadmin"
      ? [
          { id: "admin", label: t("admin.admins"), icon: ShieldCheck },
          { id: "superadmin", label: t("admin.superadmin"), icon: ShieldCheck },
        ]
      : []),
  ];

  return (
    <main className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">
              <Users size={12} />
              {t("admin.userGovernance")}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
              {t("admin.manageUsers")}
            </h1>
            <p className="text-muted-foreground font-medium text-lg max-w-xl">
              {t("admin.totalUsers")}: {totalCount}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder={t("common.search")}
                className="pl-12 h-14 rounded-2xl bg-card border-2 focus:ring-primary/20 font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="h-14 px-6 rounded-2xl font-black gap-2 shadow-xl shadow-primary/20">
                  <Plus size={20} />
                  <span className="hidden sm:inline">{t("admin.addUser")}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl p-8 max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black italic">
                    {t("admin.addUser")}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("admin.fullName")}
                    </label>
                    <Input
                      placeholder={t("admin.fullName")}
                      className={cn(
                        "h-14 rounded-2xl border-2 font-medium",
                        newFieldErrors.full_name
                          ? "border-destructive focus-visible:ring-destructive"
                          : "",
                      )}
                      value={newUser.full_name}
                      onChange={(e) => {
                        setNewUser({ ...newUser, full_name: e.target.value });
                        if (newFieldErrors.full_name)
                          setNewFieldErrors((prev) => ({
                            ...prev,
                            full_name: undefined,
                          }));
                      }}
                      disabled={isCreating}
                    />
                    {newFieldErrors.full_name && (
                      <p className="text-xs text-destructive">
                        {newFieldErrors.full_name}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("admin.emailAddress")}
                    </label>
                    <Input
                      type="email"
                      placeholder={t("admin.emailAddress")}
                      className={cn(
                        "h-14 rounded-2xl border-2 font-medium",
                        newFieldErrors.email
                          ? "border-destructive focus-visible:ring-destructive"
                          : "",
                      )}
                      value={newUser.email}
                      onChange={(e) => {
                        setNewUser({ ...newUser, email: e.target.value });
                        if (newFieldErrors.email)
                          setNewFieldErrors((prev) => ({
                            ...prev,
                            email: undefined,
                          }));
                      }}
                      disabled={isCreating}
                    />
                    {newFieldErrors.email && (
                      <p className="text-xs text-destructive">
                        {newFieldErrors.email}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("admin.role")}
                    </label>
                    <Select
                      value={newUser.role}
                      onValueChange={(val) =>
                        setNewUser({ ...newUser, role: val })
                      }
                      disabled={isCreating}
                    >
                      <SelectTrigger className="h-14 rounded-2xl border-2 font-medium">
                        <SelectValue placeholder={t("admin.selectRole")} />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="customer">
                          {t("admin.customer")}
                        </SelectItem>
                        <SelectItem value="merchant">
                          {t("admin.merchant")}
                        </SelectItem>
                        {currentUser?.role === "superadmin" && (
                          <>
                            <SelectItem value="admin">
                              {t("admin.admin")}
                            </SelectItem>
                            <SelectItem value="superadmin">
                              {t("admin.superadmin")}
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {t("admin.password")}
                    </label>
                    <div className="relative">
                      <Lock
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                        size={18}
                      />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className={cn(
                          "h-14 pl-12 rounded-2xl border-2 font-medium",
                          newFieldErrors.password
                            ? "border-destructive focus-visible:ring-destructive"
                            : "",
                        )}
                        value={newUser.password}
                        onChange={(e) => {
                          setNewUser({ ...newUser, password: e.target.value });
                          if (newFieldErrors.password)
                            setNewFieldErrors((prev) => ({
                              ...prev,
                              password: undefined,
                            }));
                        }}
                        disabled={isCreating}
                      />
                    </div>
                    {newFieldErrors.password && (
                      <p className="text-xs text-destructive">
                        {newFieldErrors.password}
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter className="mt-8">
                  <Button
                    variant="outline"
                    className="h-12 rounded-xl font-black"
                    onClick={() => setIsAddModalOpen(false)}
                    disabled={isCreating}
                  >
                    {t("admin.cancel")}
                  </Button>
                  <Button
                    className="h-12 rounded-xl font-black"
                    onClick={handleCreateUser}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <div className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        {t("admin.creating")}
                      </div>
                    ) : (
                      t("admin.createUser")
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Role Filters (Chips) */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          {roles.map((role) => (
            <button
              key={role.id || "all"}
              onClick={() => {
                setRoleFilter(role.id);
                setPage(1);
              }}
              className={cn(
                "flex items-center gap-3 px-6 h-14 rounded-2xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap border-2",
                roleFilter === role.id
                  ? "bg-primary border-primary text-primary-foreground shadow shadow-primary/20 scale-105"
                  : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:bg-primary/5",
              )}
            >
              <role.icon size={18} />
              {role.label}
            </button>
          ))}
        </div>

        {/* Users Content */}
        {isLoading ? (
          <TableSkeleton />
        ) : users.length === 0 ? (
          <div className="text-center py-24 bg-card rounded-[2.5rem] border-2 border-dashed border-border flex flex-col items-center">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6 text-muted-foreground/20">
              <Users size={48} />
            </div>
            <h2 className="text-2xl font-black text-foreground mb-1">
              {t("messages.noResults")}
            </h2>
            <p className="text-muted-foreground font-medium">
              {t("admin.noUsersMatch")}
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="px-4 md:px-6 lg:px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {t("common.name")}
                  </th>
                  <th className="px-4 md:px-6 lg:px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {t("common.email")}
                  </th>
                  <th className="px-4 md:px-6 lg:px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {t("common.role")}
                  </th>
                  <th className="px-4 md:px-6 lg:px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {t("common.status")}
                  </th>
                  <th className="px-4 md:px-6 lg:px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {t("admin.walletBalance")}
                  </th>
                  <th className="px-4 md:px-6 lg:px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {t("admin.walletStatus")}
                  </th>
                  <th className="px-4 md:px-6 lg:px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground">
                    {t("common.date")}
                  </th>
                  <th className="px-4 md:px-6 lg:px-8 py-6 text-xs font-black uppercase tracking-widest text-muted-foreground text-center">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="group hover:bg-muted/30 transition-all"
                  >
                    <td className="px-4 md:px-6 lg:px-8 py-6 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black uppercase shadow-sm">
                          {(user.full_name || user.email || "U")[0]}
                        </div>
                        <span className="font-black text-foreground">
                          {user.full_name || "N/A"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 lg:px-8 py-6">
                      <div className="flex items-center gap-2 text-muted-foreground font-medium">
                        <Mail size={14} className="opacity-50" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 lg:px-8 py-6">
                      <span
                        className={cn(
                          "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
                          user.role === "merchant"
                            ? "bg-blue-500/10 text-blue-600 border-blue-200"
                            : user.role === "admin" ||
                                user.role === "superadmin"
                              ? "bg-purple-500/10 text-purple-600 border-purple-200"
                              : "bg-card text-muted-foreground border-border",
                        )}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 lg:px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-2 h-2 rounded-full",
                            user.is_active
                              ? "bg-green-500 shadow-lg shadow-green-500/30"
                              : "bg-red-500",
                          )}
                        />
                        <span className="text-xs font-black text-foreground uppercase tracking-widest">
                          {user.is_active
                            ? t("admin.activeStatus")
                            : t("admin.inactiveStatus")}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 lg:px-8 py-6">
                      <div className="font-black text-foreground">
                        ${(user.wallet_balance || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 lg:px-8 py-6">
                      <span
                        className={cn(
                          "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          user.wallet_locked
                            ? "bg-red-500/10 text-red-600 border-red-200"
                            : "bg-green-500/10 text-green-600 border-green-200",
                        )}
                      >
                        {user.wallet_locked
                          ? t("admin.walletLocked")
                          : t("admin.walletUnlocked")}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 lg:px-8 py-6">
                      <div className="flex items-center gap-2 text-muted-foreground font-medium whitespace-nowrap">
                        <Calendar size={14} className="opacity-50" />
                        {new Date(user.created_at).toLocaleDateString(
                          undefined,
                          { year: "numeric", month: "short", day: "numeric" },
                        )}
                      </div>
                    </td>
                    <td className="px-4 md:px-6 lg:px-8 py-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {user.id !== currentUser?.id && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRechargingUser({ id: user.id, name: user.full_name || user.email || "" })}
                              className="rounded-xl h-10 px-4 font-black text-[10px] uppercase tracking-wider bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-primary-foreground transition-all"
                              disabled={isDeleting || !!user.wallet_locked}
                            >
                              {t("admin.rechargeWallet")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setManagingUser({
                                  id: user.id,
                                  email: user.email || "",
                                  role: user.role || "customer",
                                  full_name: user.full_name || "",
                                  is_active: user.is_active ?? false,
                                  wallet_locked: user.wallet_locked ?? false,
                                  password: "",
                                })
                              }
                              className="rounded-xl h-10 px-4 font-black text-[10px] uppercase tracking-wider bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                              disabled={isDeleting}
                            >
                              {t("admin.manageUser")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setUserToDelete(user.id)}
                              className="rounded-xl h-10 w-10 text-destructive hover:bg-destructive/10 transition-all"
                              disabled={isDeleting}
                            >
                              <Trash2 size={18} />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Section */}
            <div className="p-8 border-t border-border flex items-center justify-between bg-muted/10">
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="rounded-2xl h-12 px-6 font-black gap-2 border-2 transition-all hover:bg-card disabled:opacity-30"
              >
                <ArrowLeft size={18} />
                {t("common.previous")}
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                  {t("common.page")}
                </span>
                <div className="w-10 h-10 rounded-xl bg-card border-2 border-primary flex items-center justify-center font-black text-primary shadow-lg shadow-primary/10">
                  {page}
                </div>
                <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                  {t("common.of")} {totalPages}
                </span>
              </div>

              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="rounded-2xl h-12 px-6 font-black gap-2 border-2 transition-all hover:bg-card disabled:opacity-30"
              >
                {t("common.next")}
                <ArrowRight size={18} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && !isDeleting && setUserToDelete(null)}
      >
        <AlertDialogContent className="rounded-[2.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.areYouSure")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.thisActionCannotBeUndone")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={isDeleting}>
              {t("admin.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (userToDelete) handleDeleteUser(userToDelete);
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  {t("common.deleting")}
                </div>
              ) : (
                t("admin.deleteUser")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage User Modal */}
      <Dialog
        open={!!managingUser}
        onOpenChange={(open) => !open && !isUpdating && setManagingUser(null)}
      >
        <DialogContent className="rounded-[2.5rem] p-8 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic">
              {t("admin.manageUser")}
            </DialogTitle>
          </DialogHeader>
          {managingUser && (
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  {t("admin.emailAddress")}
                </label>
                <Input
                  type="email"
                  className={cn(
                    "h-14 rounded-2xl border-2 font-medium",
                    manageFieldErrors.email
                      ? "border-destructive focus-visible:ring-destructive"
                      : "",
                  )}
                  value={managingUser.email || ""}
                  onChange={(e) => {
                    setManagingUser({ ...managingUser, email: e.target.value });
                    if (manageFieldErrors.email)
                      setManageFieldErrors((prev) => ({
                        ...prev,
                        email: undefined,
                      }));
                  }}
                  disabled={isUpdating}
                />
                {manageFieldErrors.email && (
                  <p className="text-xs text-destructive">
                    {manageFieldErrors.email}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  {t("admin.fullName")}
                </label>
                <Input
                  className={cn(
                    "h-14 rounded-2xl border-2 font-medium",
                    manageFieldErrors.full_name
                      ? "border-destructive focus-visible:ring-destructive"
                      : "",
                  )}
                  value={managingUser.full_name || ""}
                  onChange={(e) => {
                    setManagingUser({
                      ...managingUser,
                      full_name: e.target.value,
                    });
                    if (manageFieldErrors.full_name)
                      setManageFieldErrors((prev) => ({
                        ...prev,
                        full_name: undefined,
                      }));
                  }}
                  disabled={isUpdating}
                />
                {manageFieldErrors.full_name && (
                  <p className="text-xs text-destructive">
                    {manageFieldErrors.full_name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  {t("admin.role")}
                </label>
                <Select
                  value={managingUser.role}
                  onValueChange={(val) =>
                    setManagingUser({ ...managingUser, role: val })
                  }
                  disabled={isUpdating}
                >
                  <SelectTrigger className="h-14 rounded-2xl border-2 font-medium">
                    <SelectValue placeholder={t("admin.selectRole")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="customer">
                      {t("admin.customer")}
                    </SelectItem>
                    <SelectItem value="merchant">
                      {t("admin.merchant")}
                    </SelectItem>
                    {currentUser?.role === "superadmin" && (
                      <>
                        <SelectItem value="admin">
                          {t("admin.admin")}
                        </SelectItem>
                        <SelectItem value="superadmin">
                          {t("admin.superadmin")}
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  {t("admin.status")}
                </label>
                <Select
                  value={managingUser.is_active ? "active" : "inactive"}
                  onValueChange={(val) =>
                    setManagingUser({
                      ...managingUser,
                      is_active: val === "active",
                    })
                  }
                  disabled={isUpdating}
                >
                  <SelectTrigger className="h-14 rounded-2xl border-2 font-medium">
                    <SelectValue placeholder={t("admin.selectStatus")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="active">{t("admin.active")}</SelectItem>
                    <SelectItem value="inactive">
                      {t("admin.inactive")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  {t("admin.walletStatus")}
                </label>
                <Select
                  value={managingUser.wallet_locked ? "locked" : "unlocked"}
                  onValueChange={(val) =>
                    setManagingUser({
                      ...managingUser,
                      wallet_locked: val === "locked",
                    })
                  }
                  disabled={isUpdating}
                >
                  <SelectTrigger className="h-14 rounded-2xl border-2 font-medium">
                    <SelectValue placeholder={t("admin.walletStatus")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="unlocked">
                      {t("admin.walletUnlocked")}
                    </SelectItem>
                    <SelectItem value="locked">
                      {t("admin.walletLocked")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  {t("admin.newPassword")}
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                    size={18}
                  />
                  <Input
                    type="password"
                    placeholder={t("admin.leaveBlankToKeep")}
                    className={cn(
                      "h-14 pl-12 rounded-2xl border-2 font-medium",
                      manageFieldErrors.password
                        ? "border-destructive focus-visible:ring-destructive"
                        : "",
                    )}
                    value={managingUser.password || ""}
                    onChange={(e) => {
                      setManagingUser({
                        ...managingUser,
                        password: e.target.value,
                      });
                      if (manageFieldErrors.password)
                        setManageFieldErrors((prev) => ({
                          ...prev,
                          password: undefined,
                        }));
                    }}
                    disabled={isUpdating}
                  />
                </div>
                {manageFieldErrors.password && (
                  <p className="text-xs text-destructive">
                    {manageFieldErrors.password}
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="mt-8">
            <Button
              variant="outline"
              className="h-12 rounded-xl font-black"
              onClick={() => setManagingUser(null)}
              disabled={isUpdating}
            >
              {t("admin.cancel")}
            </Button>
            <Button
              className="h-12 rounded-xl font-black"
              onClick={handleUpdateUser}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  {t("admin.saving")}
                </div>
              ) : (
                t("settings.saveChanges")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Recharge Wallet Modal */}
      <Dialog
        open={!!rechargingUser}
        onOpenChange={(open) => !open && !isRecharging && setRechargingUser(null)}
      >
        <DialogContent className="rounded-[2.5rem] p-8 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic">
              {t("admin.rechargeWallet")} - {rechargingUser?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                {t("admin.amount")}
              </label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                className="h-14 rounded-2xl border-2 font-medium"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                disabled={isRecharging}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                {t("admin.description")}
              </label>
              <Input
                placeholder={t("admin.descriptionOptional") || "Description (optional)"}
                className="h-14 rounded-2xl border-2 font-medium"
                value={rechargeDescription}
                onChange={(e) => setRechargeDescription(e.target.value)}
                disabled={isRecharging}
              />
            </div>
          </div>
          <DialogFooter className="mt-8">
            <Button
              variant="outline"
              className="h-12 rounded-xl font-black"
              onClick={() => setRechargingUser(null)}
              disabled={isRecharging}
            >
              {t("admin.cancel")}
            </Button>
            <Button
              className="h-12 rounded-xl font-black"
              onClick={handleRechargeWallet}
              disabled={isRecharging}
            >
              {isRecharging ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  {t("common.processing") || "Processing..."}
                </div>
              ) : (
                t("admin.rechargeWallet")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
