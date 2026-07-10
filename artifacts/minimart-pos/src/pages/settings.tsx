import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useUpdateMe } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Sun, Moon, User, Building2 } from "lucide-react";
import { COMPANY_NAME, COMPANY_TAGLINE } from "@/lib/company";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const updateMe = useUpdateMe();

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: { name: user?.name ?? "" },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSaveProfile = async (values: z.infer<typeof profileSchema>) => {
    try {
      await updateMe.mutateAsync({ data: { name: values.name } });
      toast({ title: "Profile updated" });
    } catch (err: any) {
      toast({ title: "Error updating profile", description: err?.message, variant: "destructive" });
    }
  };

  const onChangePassword = async (values: z.infer<typeof passwordSchema>) => {
    try {
      await updateMe.mutateAsync({
        data: { currentPassword: values.currentPassword, newPassword: values.newPassword },
      });
      toast({ title: "Password changed" });
      passwordForm.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      const message = err?.response?.data?.error || "Please check your current password and try again.";
      toast({ title: "Error changing password", description: message, variant: "destructive" });
    }
  };

  if (!user) return null;

  return (
    <MainLayout>
      <div className="space-y-8 max-w-3xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your personal preferences and account.</p>
        </div>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              Appearance
            </CardTitle>
            <CardDescription>Choose how {COMPANY_NAME} POS looks on your device.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <div className="font-medium text-sm">Theme</div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  Currently using {theme === "dark" ? "Dark" : "Light"} mode
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => theme !== "light" && toggleTheme()}
                >
                  <Sun className="w-4 h-4 mr-1.5" /> Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => theme !== "dark" && toggleTheme()}
                >
                  <Moon className="w-4 h-4 mr-1.5" /> Dark
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" /> Personal Information
            </CardTitle>
            <CardDescription>Update your display name.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input value={user.email} disabled />
                  <p className="text-xs text-muted-foreground">Contact an owner to change your email.</p>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input value={user.role} disabled className="capitalize" />
                </div>
                <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                  Save Changes
                </Button>
              </form>
            </Form>

            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-medium mb-4">Change Password</h3>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" variant="outline" disabled={passwordForm.formState.isSubmitting}>
                    Change Password
                  </Button>
                </form>
              </Form>
            </div>
          </CardContent>
        </Card>

        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" /> Company
            </CardTitle>
            <CardDescription>Business currently using this POS system.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border p-4">
              <div className="font-semibold">{COMPANY_NAME}</div>
              <div className="text-sm text-muted-foreground mt-0.5">{COMPANY_TAGLINE}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
