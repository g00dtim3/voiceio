"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthLayout } from "../components/auth-layout";
import { Button } from "@/shared/ui/button";
import { TextInput } from "@/shared/ui/text-input";
import { acceptInvite } from "../api/auth-api";

const schema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormData = z.infer<typeof schema>;

interface InviteScreenProps {
  workspaceName?: string;
}

export function InviteScreen({ workspaceName = "Customer Insights Team" }: InviteScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("token") ?? "";
  const [loading, setLoading] = useState(false);

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
      await acceptInvite(inviteToken, data.password, data.fullName);
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="space-y-1 mb-6">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          You&apos;ve been invited to join Voicio
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Workspace: {workspaceName}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <TextInput
          label="Full name"
          error={errors.fullName?.message}
          {...register("fullName")}
        />

        <TextInput
          label="Password"
          type="password"
          error={errors.password?.message}
          {...register("password")}
        />

        <Button type="submit" className="w-full" loading={loading}>
          Accept invitation
        </Button>
      </form>
    </AuthLayout>
  );
}
