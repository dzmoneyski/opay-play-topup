import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Upload,
  Gamepad2,
  Package,
  ShoppingCart,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  Search
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GamePlatform, GamePackage } from "@/hooks/useGamePlatforms";
import { 
  useAdminGameTopupOrders,
  useApproveGameTopupOrder,
  useRejectGameTopupOrder
} from "@/hooks/useGamePlatforms";

const GameManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [platformDialogOpen, setPlatformDialogOpen] = useState(false);
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<GamePlatform | null>(null);
  const [editingPackage, setEditingPackage] = useState<GamePackage | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [proofImageFile, setProofImageFile] = useState<File | null>(null);
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "completed" | "rejected">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all platforms (including inactive)
  const { data: platforms } = useQuery({
    queryKey: ["admin-game-platforms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_platforms")
        .select("*")
        .order("display_order");
      if (error) throw error;
      return data as GamePlatform[];
    },
  });

  // Fetch all packages
  const { data: packages } = useQuery({
    queryKey: ["admin-game-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_packages")
        .select("*, platform:game_platforms(*)")
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all orders
  const { data: orders, isLoading: ordersLoading } = useAdminGameTopupOrders();
  const approveOrder = useApproveGameTopupOrder();
  const rejectOrder = useRejectGameTopupOrder();

  // Filter orders
  const filteredOrders = orders?.filter(order => {
    const matchesStatus = orderFilter === "all" || order.status === orderFilter;
    const matchesSearch = !searchQuery || 
      order.player_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user?.phone?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  const pendingOrdersCount = orders?.filter(o => o.status === "pending").length || 0;

  const handlePlatformSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    let logoUrl = formData.get("logo_url") as string;
    const logoFile = formData.get("logo_file") as File;

    try {
      // Upload logo if file is provided
      if (logoFile && logoFile.size > 0) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('game-logos')
          .upload(filePath, logoFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('game-logos')
          .getPublicUrl(filePath);

        logoUrl = publicUrl;
      }

      const platformData = {
        name: formData.get("name") as string,
        name_ar: formData.get("name_ar") as string,
        slug: formData.get("slug") as string,
        category: formData.get("category") as string,
        logo_url: logoUrl,
        is_active: formData.get("is_active") === "on",
        display_order: parseInt(formData.get("display_order") as string) || 0,
      };

      if (editingPlatform) {
        const { error } = await supabase
          .from("game_platforms")
          .update(platformData)
          .eq("id", editingPlatform.id);
        if (error) throw error;
        toast({ title: "تم تحديث المنصة بنجاح" });
      } else {
        const { error } = await supabase
          .from("game_platforms")
          .insert(platformData);
        if (error) throw error;
        toast({ title: "تم إضافة المنصة بنجاح" });
      }
      
      queryClient.invalidateQueries({ queryKey: ["admin-game-platforms"] });
      queryClient.invalidateQueries({ queryKey: ["game-platforms"] });
      setPlatformDialogOpen(false);
      setEditingPlatform(null);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handlePackageSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const packageData = {
      platform_id: formData.get("platform_id") as string,
      name: formData.get("name") as string,
      name_ar: formData.get("name_ar") as string,
      price: parseFloat(formData.get("price") as string),
      description: formData.get("description") as string,
      is_active: formData.get("is_active") === "on",
      display_order: parseInt(formData.get("display_order") as string) || 0,
    };

    try {
      if (editingPackage) {
        const { error } = await supabase
          .from("game_packages")
          .update(packageData)
          .eq("id", editingPackage.id);
        if (error) throw error;
        toast({ title: "تم تحديث الباقة بنجاح" });
      } else {
        const { error } = await supabase
          .from("game_packages")
          .insert(packageData);
        if (error) throw error;
        toast({ title: "تم إضافة الباقة بنجاح" });
      }
      
      queryClient.invalidateQueries({ queryKey: ["admin-game-packages"] });
      setPackageDialogOpen(false);
      setEditingPackage(null);
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePlatform = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه المنصة؟")) return;
    
    try {
      const { error } = await supabase
        .from("game_platforms")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({ title: "تم حذف المنصة بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["admin-game-platforms"] });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الباقة؟")) return;
    
    try {
      const { error } = await supabase
        .from("game_packages")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast({ title: "تم حذف الباقة بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["admin-game-packages"] });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTogglePlatformActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("game_platforms")
        .update({ is_active: !currentStatus })
        .eq("id", id);
      if (error) throw error;
      toast({ 
        title: !currentStatus ? "تم إظهار المنصة" : "تم إخفاء المنصة",
        description: !currentStatus 
          ? "المنصة الآن مرئية للمستخدمين" 
          : "المنصة الآن مخفية عن المستخدمين"
      });
      queryClient.invalidateQueries({ queryKey: ["admin-game-platforms"] });
      queryClient.invalidateQueries({ queryKey: ["game-platforms"] });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleTogglePackageActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("game_packages")
        .update({ is_active: !currentStatus })
        .eq("id", id);
      if (error) throw error;
      toast({ 
        title: !currentStatus ? "تم إظهار الباقة" : "تم إخفاء الباقة" 
      });
      queryClient.invalidateQueries({ queryKey: ["admin-game-packages"] });
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">إدارة الألعاب والمنصات</h2>
          <p className="text-muted-foreground">إضافة وتعديل الألعاب والباقات المتاحة</p>
        </div>
      </div>

      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList>
          <TabsTrigger value="orders">
            <ShoppingCart className="ml-2 h-4 w-4" />
            طلبات الشحن
            {pendingOrdersCount > 0 && (
              <Badge variant="destructive" className="mr-2">
                {pendingOrdersCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="platforms">
            <Gamepad2 className="ml-2 h-4 w-4" />
            المنصات والألعاب
          </TabsTrigger>
          <TabsTrigger value="packages">
            <Package className="ml-2 h-4 w-4" />
            الباقات
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>طلبات شحن الألعاب</CardTitle>
              <CardDescription>
                إدارة ومراجعة طلبات شحن حسابات الألعاب
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث برقم اللاعب، الاسم أو الهاتف..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={orderFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrderFilter("all")}
                  >
                    الكل
                  </Button>
                  <Button
                    variant={orderFilter === "pending" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrderFilter("pending")}
                  >
                    معلق ({pendingOrdersCount})
                  </Button>
                  <Button
                    variant={orderFilter === "completed" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrderFilter("completed")}
                  >
                    مكتمل
                  </Button>
                  <Button
                    variant={orderFilter === "rejected" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setOrderFilter("rejected")}
                  >
                    مرفوض
                  </Button>
                </div>
              </div>

              {/* Orders Table */}
              {ordersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "لا توجد نتائج للبحث" : "لا توجد طلبات"}
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المستخدم</TableHead>
                        <TableHead>رقم الهاتف</TableHead>
                        <TableHead>اللعبة</TableHead>
                        <TableHead>الباقة</TableHead>
                        <TableHead>معرف اللاعب</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            {order.user?.full_name || "غير محدد"}
                          </TableCell>
                          <TableCell className="font-mono">
                            {order.user?.phone || "غير محدد"}
                          </TableCell>
                          <TableCell>{order.platform?.name_ar || "غير محدد"}</TableCell>
                          <TableCell>{order.package?.name_ar || "غير محدد"}</TableCell>
                          <TableCell className="font-mono font-bold">
                            {order.player_id}
                          </TableCell>
                          <TableCell className="font-bold text-primary">
                            {order.amount} دج
                          </TableCell>
                          <TableCell>
                            {order.status === "pending" && (
                              <Badge variant="secondary">قيد الانتظار</Badge>
                            )}
                            {order.status === "completed" && (
                              <Badge className="bg-green-500 text-white">مكتمل</Badge>
                            )}
                            {order.status === "rejected" && (
                              <Badge variant="destructive">مرفوض</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(order.created_at).toLocaleDateString("ar-DZ", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Eye className="h-4 w-4 ml-1" />
                              عرض
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-4">
          <Dialog open={platformDialogOpen} onOpenChange={setPlatformDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary" onClick={() => setEditingPlatform(null)}>
                <Plus className="ml-2 h-4 w-4" />
                إضافة منصة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingPlatform ? "تعديل المنصة" : "إضافة منصة جديدة"}
                </DialogTitle>
                <DialogDescription>
                  أدخل معلومات المنصة أو اللعبة
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePlatformSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">الاسم (English)</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={editingPlatform?.name}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name_ar">الاسم (العربية)</Label>
                    <Input
                      id="name_ar"
                      name="name_ar"
                      defaultValue={editingPlatform?.name_ar}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug (معرف فريد)</Label>
                    <Input
                      id="slug"
                      name="slug"
                      defaultValue={editingPlatform?.slug}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">التصنيف</Label>
                    <Select name="category" defaultValue={editingPlatform?.category || "game"}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="game">لعبة</SelectItem>
                        <SelectItem value="betting">منصة مراهنة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo_file">الشعار</Label>
                  <div className="space-y-2">
                    <Input
                      id="logo_file"
                      name="logo_file"
                      type="file"
                      accept="image/*"
                      className="cursor-pointer"
                    />
                    {editingPlatform?.logo_url && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>الشعار الحالي:</span>
                        <img 
                          src={editingPlatform.logo_url} 
                          alt="Current logo" 
                          className="h-8 w-8 object-contain rounded"
                        />
                      </div>
                    )}
                    <Input
                      id="logo_url"
                      name="logo_url"
                      type="hidden"
                      defaultValue={editingPlatform?.logo_url || ""}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    اختر صورة من جهازك (PNG, JPG, WebP)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="display_order">ترتيب العرض</Label>
                    <Input
                      id="display_order"
                      name="display_order"
                      type="number"
                      defaultValue={editingPlatform?.display_order || 0}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-8">
                    <Switch
                      id="is_active"
                      name="is_active"
                      defaultChecked={editingPlatform?.is_active ?? true}
                    />
                    <Label htmlFor="is_active">مفعل</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPlatformDialogOpen(false);
                      setEditingPlatform(null);
                    }}
                  >
                    إلغاء
                  </Button>
                  <Button type="submit" className="bg-gradient-primary">
                    {editingPlatform ? "تحديث" : "إضافة"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {platforms?.map((platform) => (
              <Card key={platform.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-primary/10 flex items-center justify-center">
                        {platform.logo_url ? (
                          <img
                            src={platform.logo_url}
                            alt={platform.name_ar}
                            className="w-full h-full object-contain rounded-lg"
                          />
                        ) : (
                          <Gamepad2 className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{platform.name_ar}</h3>
                        <p className="text-xs text-muted-foreground">{platform.category === 'game' ? 'لعبة' : 'مراهنة'}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingPlatform(platform);
                          setPlatformDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeletePlatform(platform.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={platform.is_active}
                        onCheckedChange={() => handleTogglePlatformActive(platform.id, platform.is_active)}
                      />
                      <span className="text-sm">
                        {platform.is_active ? 'ظاهر للمستخدمين' : 'مخفي عن المستخدمين'}
                      </span>
                    </div>
                    <span className="text-muted-foreground">ترتيب: {platform.display_order}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="packages" className="space-y-4">
          <Dialog open={packageDialogOpen} onOpenChange={setPackageDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary" onClick={() => setEditingPackage(null)}>
                <Plus className="ml-2 h-4 w-4" />
                إضافة باقة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPackage ? "تعديل الباقة" : "إضافة باقة جديدة"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handlePackageSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="platform_id">المنصة</Label>
                  <Select
                    name="platform_id"
                    defaultValue={editingPackage?.platform_id}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المنصة" />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms?.map((platform) => (
                        <SelectItem key={platform.id} value={platform.id}>
                          {platform.name_ar}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pkg_name">الاسم (English)</Label>
                    <Input
                      id="pkg_name"
                      name="name"
                      defaultValue={editingPackage?.name}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pkg_name_ar">الاسم (العربية)</Label>
                    <Input
                      id="pkg_name_ar"
                      name="name_ar"
                      defaultValue={editingPackage?.name_ar}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">السعر (دج)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    defaultValue={editingPackage?.price}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">الوصف (اختياري)</Label>
                  <Input
                    id="description"
                    name="description"
                    defaultValue={editingPackage?.description || ""}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pkg_display_order">ترتيب العرض</Label>
                    <Input
                      id="pkg_display_order"
                      name="display_order"
                      type="number"
                      defaultValue={editingPackage?.display_order || 0}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-8">
                    <Switch
                      id="pkg_is_active"
                      name="is_active"
                      defaultChecked={editingPackage?.is_active ?? true}
                    />
                    <Label htmlFor="pkg_is_active">مفعل</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setPackageDialogOpen(false);
                      setEditingPackage(null);
                    }}
                  >
                    إلغاء
                  </Button>
                  <Button type="submit" className="bg-gradient-primary">
                    {editingPackage ? "تحديث" : "إضافة"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages?.map((pkg: any) => (
              <Card key={pkg.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{pkg.name_ar}</h3>
                      <p className="text-xs text-muted-foreground">{pkg.platform?.name_ar}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingPackage(pkg);
                          setPackageDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeletePackage(pkg.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-3 border-t">
                    <span className="font-bold text-primary">{pkg.price} دج</span>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={pkg.is_active}
                        onCheckedChange={() => handleTogglePackageActive(pkg.id, pkg.is_active)}
                      />
                      <span className="text-xs">
                        {pkg.is_active ? 'ظاهر' : 'مخفي'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Order Review Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => {
        if (!open) {
          setSelectedOrder(null);
          setAdminNotes("");
          setProofImageFile(null);
        }
      }}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>مراجعة طلب الشحن</DialogTitle>
            <DialogDescription>
              تحقق من تفاصيل الطلب قبل الموافقة أو الرفض
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <Label className="text-xs text-muted-foreground">المستخدم</Label>
                  <p className="font-medium">{selectedOrder.user?.full_name || "غير محدد"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">رقم الهاتف</Label>
                  <p className="font-mono">{selectedOrder.user?.phone || "غير محدد"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">اللعبة</Label>
                  <p className="font-medium">{selectedOrder.platform?.name_ar}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">الباقة</Label>
                  <p className="font-medium">{selectedOrder.package?.name_ar}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">معرف اللاعب</Label>
                  <p className="font-mono font-bold text-primary">{selectedOrder.player_id}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">المبلغ</Label>
                  <p className="font-bold text-lg text-primary">{selectedOrder.amount} دج</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-xs text-muted-foreground">تاريخ الطلب</Label>
                  <p>
                    {new Date(selectedOrder.created_at).toLocaleString("ar-DZ", {
                      dateStyle: "full",
                      timeStyle: "short"
                    })}
                  </p>
                </div>
                {selectedOrder.notes && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">ملاحظات المستخدم</Label>
                    <p className="text-sm">{selectedOrder.notes}</p>
                  </div>
                )}
                {selectedOrder.admin_notes && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">ملاحظات الإدارة</Label>
                    <p className="text-sm">{selectedOrder.admin_notes}</p>
                  </div>
                )}
                {selectedOrder.proof_image_url && (
                  <div className="col-span-2">
                    <Label className="text-xs text-muted-foreground">صورة إثبات الشحن</Label>
                    <div className="mt-2">
                      <img 
                        src={selectedOrder.proof_image_url} 
                        alt="إثبات الشحن" 
                        className="max-w-full max-h-96 rounded-lg border border-border object-contain cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(selectedOrder.proof_image_url, '_blank')}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        انقر على الصورة لفتحها بالحجم الكامل
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {selectedOrder.status === "pending" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="admin_notes">ملاحظات الإدارة (اختياري)</Label>
                    <Textarea
                      id="admin_notes"
                      placeholder="أضف ملاحظات للمستخدم..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="proof_image">صورة إثبات الشحن</Label>
                    <Input
                      id="proof_image"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProofImageFile(e.target.files?.[0] || null)}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      ارفع صورة تثبت عملية الشحن (لقطة شاشة، إيصال، إلخ)
                    </p>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedOrder(null);
                        setAdminNotes("");
                        setProofImageFile(null);
                      }}
                    >
                      إلغاء
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        if (!adminNotes.trim()) {
                          toast({
                            title: "خطأ",
                            description: "يجب إدخال سبب الرفض",
                            variant: "destructive",
                          });
                          return;
                        }
                        rejectOrder.mutate(
                          { orderId: selectedOrder.id, adminNotes },
                          {
                            onSuccess: () => {
                              setSelectedOrder(null);
                              setAdminNotes("");
                              setProofImageFile(null);
                            },
                          }
                        );
                      }}
                      disabled={rejectOrder.isPending}
                    >
                      {rejectOrder.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      ) : (
                        <XCircle className="h-4 w-4 ml-2" />
                      )}
                      رفض الطلب
                    </Button>
                    <Button
                      className="bg-green-500 hover:bg-green-600"
                      onClick={async () => {
                        try {
                          let proofImageUrl: string | undefined = undefined;

                          // Upload proof image if provided
                          if (proofImageFile) {
                            const fileExt = proofImageFile.name.split('.').pop();
                            const fileName = `${selectedOrder.id}-${Date.now()}.${fileExt}`;
                            
                            const { error: uploadError } = await supabase.storage
                              .from('game-charge-proofs')
                              .upload(fileName, proofImageFile, {
                                cacheControl: '3600',
                                upsert: false
                              });

                            if (uploadError) {
                              toast({
                                title: "خطأ في رفع الصورة",
                                description: uploadError.message,
                                variant: "destructive",
                              });
                              return;
                            }

                            const { data: { publicUrl } } = supabase.storage
                              .from('game-charge-proofs')
                              .getPublicUrl(fileName);

                            proofImageUrl = publicUrl;
                          }

                          approveOrder.mutate(
                            { 
                              orderId: selectedOrder.id, 
                              adminNotes: adminNotes || undefined,
                              proofImageUrl
                            },
                            {
                              onSuccess: () => {
                                setSelectedOrder(null);
                                setAdminNotes("");
                                setProofImageFile(null);
                              },
                            }
                          );
                        } catch (error: any) {
                          toast({
                            title: "خطأ",
                            description: error.message,
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={approveOrder.isPending}
                    >
                      {approveOrder.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 ml-2" />
                      )}
                      الموافقة وشحن الحساب
                    </Button>
                  </div>
                </>
              )}

              {selectedOrder.status !== "pending" && (
                <div className="flex justify-end">
                  <Button onClick={() => setSelectedOrder(null)}>إغلاق</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GameManagement;
