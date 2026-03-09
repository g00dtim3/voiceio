"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthLayout } from "../components/auth-layout";
import { Button } from "@/shared/ui/button";
import { TextInput } from "@/shared/ui/text-input";
import { Checkbox } from "@/shared/ui/checkbox";
import { login } from "../api/auth-api";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setError(null);
    try {
      await login(data.email, data.password);
      router.push("/");
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-1 mb-6">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Sign in</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Access your workspace and reports.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[var(--radius-sm)] bg-[var(--color-danger-500)]/10 px-3 py-2 text-sm text-[var(--color-danger-500)]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <TextInput
          label="Work email"
          type="email"
          placeholder="you@company.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <TextInput
          label="Password"
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="flex items-center justify-between">
          <Checkbox label="Keep me signed in" />
          <a
            href="/forgot-password"
            className="text-sm text-[var(--color-brand-500)] transition-colors duration-[120ms] ease-out hover:text-[var(--color-brand-600)]"
          >
            Forgot password?
          </a>
        </div>

        <Button type="submit" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border-default)]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[var(--bg-surface)] px-2 text-[var(--text-secondary)]">or</span>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Button variant="secondary" className="w-full" type="button">
            Continue with Google
          </Button>
          <Button variant="secondary" className="w-full" type="button">
            Continue with Microsoft
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
