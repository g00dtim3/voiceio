"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthLayout } from "../components/auth-layout";
import { Button } from "@/shared/ui/button";
import { TextInput } from "@/shared/ui/text-input";
import { forgotPassword } from "../api/auth-api";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordScreen() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await forgotPassword(data.email);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-1 mb-6">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Reset your password</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Enter your work email to receive reset instructions.
        </p>
      </div>

      {sent ? (
        <div className="space-y-4">
          <div className="rounded-[var(--radius-sm)] bg-[var(--color-success-500)]/10 px-3 py-2 text-sm text-[var(--color-success-500)]">
            Check your email for a reset link.
          </div>
          <a
            href="/login"
            className="block text-center text-sm text-[var(--color-brand-500)] transition-colors duration-[120ms] ease-out hover:text-[var(--color-brand-600)]"
          >
            Back to sign in
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <TextInput
            label="Work email"
            type="email"
            placeholder="you@company.com"
            error={errors.email?.message}
            {...register("email")}
          />

          <Button type="submit" className="w-full" loading={loading}>
            Send reset link
          </Button>

          <a
            href="/login"
            className="block text-center text-sm text-[var(--text-secondary)] transition-colors duration-[120ms] ease-out hover:text-[var(--text-primary)]"
          >
            Back to sign in
          </a>
        </form>
      )}
    </AuthLayout>
  );
}
