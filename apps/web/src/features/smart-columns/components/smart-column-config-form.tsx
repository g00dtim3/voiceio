"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import {
  Button,
  TextInput,
  Textarea,
  Checkbox,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/shared/ui";
import type { SmartColumnComputationType } from "@/shared/types/api";
import { SmartColumnTypePicker } from "./smart-column-type-picker";

// ─── Schema ──────────────────────────────────────────────────────────────────

const inputVariableSchema = z.object({
  key: z.string().min(1, "Variable name is required"),
  sourceColumn: z.string().min(1, "Source column is required"),
});

const smartColumnFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(120, "Name too long"),
  computationType: z.enum(["mapping", "formula", "llm"] as const),
  outputType: z.string().min(1, "Output type is required"),
  prompt: z.string().optional(),
  inputVariables: z.array(inputVariableSchema),
  fallbackValue: z.string().optional(),
  applyToFutureUploads: z.boolean().optional(),
});

export type SmartColumnFormValues = z.infer<typeof smartColumnFormSchema>;

// ─── Props ───────────────────────────────────────────────────────────────────

interface SmartColumnConfigFormProps {
  defaultValues?: Partial<SmartColumnFormValues>;
  onSubmit: (values: SmartColumnFormValues) => void;
  isSubmitting?: boolean;
}

// ─── Output type options ─────────────────────────────────────────────────────

const OUTPUT_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "date", label: "Date" },
  { value: "category", label: "Category" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function SmartColumnConfigForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
}: SmartColumnConfigFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SmartColumnFormValues>({
    resolver: zodResolver(smartColumnFormSchema),
    defaultValues: {
      name: "",
      computationType: "llm",
      outputType: "text",
      prompt: "",
      inputVariables: [],
      fallbackValue: "",
      applyToFutureUploads: false,
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "inputVariables",
  });

  const computationType = watch("computationType");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Computation type */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[var(--text-primary)]">
          Column Type
        </label>
        <Controller
          name="computationType"
          control={control}
          render={({ field }) => (
            <SmartColumnTypePicker
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      {/* Name */}
      <TextInput
        label="Name"
        placeholder="e.g. Sentiment Score"
        error={errors.name?.message}
        {...register("name")}
      />

      {/* Output type */}
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[var(--text-primary)]">
          Output Type
        </label>
        <Controller
          name="outputType"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select output type" />
              </SelectTrigger>
              <SelectContent>
                {OUTPUT_TYPES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.outputType && (
          <p className="text-xs text-[var(--color-danger-500)]">
            {errors.outputType.message}
          </p>
        )}
      </div>

      {/* Prompt (LLM only) */}
      {computationType === "llm" && (
        <Textarea
          label="Prompt"
          placeholder="Describe what this column should compute. Use {{variable}} for input references."
          rows={5}
          error={errors.prompt?.message}
          {...register("prompt")}
        />
      )}

      {/* Input variables */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            Input Variables
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => append({ key: "", sourceColumn: "" })}
          >
            <Plus size={14} aria-hidden />
            Add Variable
          </Button>
        </div>

        {fields.length === 0 && (
          <p className="text-xs text-[var(--text-muted)]">
            No input variables defined yet.
          </p>
        )}

        {fields.map((field, index) => (
          <div
            key={field.id}
            className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface-subtle)] p-3"
          >
            <div className="flex-1">
              <TextInput
                placeholder="Variable name"
                error={errors.inputVariables?.[index]?.key?.message}
                {...register(`inputVariables.${index}.key`)}
              />
            </div>
            <div className="flex-1">
              <TextInput
                placeholder="Source column"
                error={errors.inputVariables?.[index]?.sourceColumn?.message}
                {...register(`inputVariables.${index}.sourceColumn`)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(index)}
              className="mt-0.5 text-[var(--text-secondary)] transition-colors duration-[120ms] ease-out hover:text-[var(--color-danger-500)]"
            >
              <Trash2 size={14} aria-hidden />
            </Button>
          </div>
        ))}
      </div>

      {/* Fallback value */}
      <TextInput
        label="Fallback Value"
        placeholder="Value to use when computation fails"
        error={errors.fallbackValue?.message}
        {...register("fallbackValue")}
      />

      {/* Future uploads */}
      <Controller
        name="applyToFutureUploads"
        control={control}
        render={({ field }) => (
          <Checkbox
            label="Apply to future uploads"
            checked={field.value}
            onCheckedChange={field.onChange}
          />
        )}
      />

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <Button type="submit" loading={isSubmitting}>
          Save Configuration
        </Button>
      </div>
    </form>
  );
}
