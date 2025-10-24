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
  Package
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
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { GamePlatform, GamePackage } from "@/hooks/useGamePlatforms";

const GameManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [platformDialogOpen, setPlatformDialogOpen] = useState(false);
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<GamePlatform | null>(null);
  const [editingPackage, setEditingPackage] = useState<GamePackage | null>(null);

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

  const handlePlatformSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const platformData = {
      name: formData.get("name") as string,
      name_ar: formData.get("name_ar") as string,
      slug: formData.get("slug") as string,
      category: formData.get("category") as string,
      logo_url: formData.get("logo_url") as string,
      is_active: formData.get("is_active") === "on",
      display_order: parseInt(formData.get("display_order") as string) || 0,
    };

    try {
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

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">إدارة الألعاب والمنصات</h2>
          <p className="text-muted-foreground">إضافة وتعديل الألعاب والباقات المتاحة</p>
        </div>
      </div>

      <Tabs defaultValue="platforms" className="space-y-6">
        <TabsList>
          <TabsTrigger value="platforms">
            <Gamepad2 className="ml-2 h-4 w-4" />
            المنصات والألعاب
          </TabsTrigger>
          <TabsTrigger value="packages">
            <Package className="ml-2 h-4 w-4" />
            الباقات
          </TabsTrigger>
        </TabsList>

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
                  <Label htmlFor="logo_url">رابط الشعار</Label>
                  <Input
                    id="logo_url"
                    name="logo_url"
                    type="url"
                    placeholder="https://example.com/logo.png"
                    defaultValue={editingPlatform?.logo_url || ""}
                  />
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
                  <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-1 rounded ${platform.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {platform.is_active ? 'مفعل' : 'غير مفعل'}
                    </span>
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
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-primary">{pkg.price} دج</span>
                    <span className={`px-2 py-1 rounded text-xs ${pkg.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {pkg.is_active ? 'مفعل' : 'غير مفعل'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GameManagement;
