import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ShoppingCart } from "lucide-react";
import { useState } from "react";
import { COMPANY_NAME, COMPANY_TAGLINE } from "@/lib/company";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export default function Login() {
  const { login } = useAuth();
  const [error, setError] = useState("");
  
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    try {
      setError("");
      await login(values);
    } catch (err: any) {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white mb-4 shadow-lg shadow-primary/20">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{COMPANY_NAME}</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </div>

        <div className="bg-card border border-border shadow-xl shadow-black/5 rounded-2xl p-8">
          {error && (
            <div className="mb-6 p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20">
              {error}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                size="lg" 
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>
        </div>
        
        <p className="text-center text-sm text-muted-foreground mt-8">
          {COMPANY_TAGLINE}
        </p>
      </div>
    </div>
  );
}
