"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Button,
  TextInput,
  Textarea,
  Toggle,
} from "@/shared/ui";
import { useCreateTopic } from "../hooks/use-topics";

const topicSchema = z.object({
  label: z
    .string()
    .min(1, "Label is required")
    .max(80, "Label must be 80 characters or less"),
  description: z
    .string()
    .max(240, "Description must be 240 characters or less")
    .optional()
    .or(z.literal("")),
  sentimentEnabled: z.boolean(),
});

type TopicFormValues = z.infer<typeof topicSchema>;

interface TopicCreationDialogProps {
  projectId: string;
  categoryId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TopicCreationDialog({
  projectId,
  categoryId,
  open,
  onOpenChange,
}: TopicCreationDialogProps) {
  const createTopic = useCreateTopic(projectId, categoryId);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TopicFormValues>({
    resolver: zodResolver(topicSchema),
    defaultValues: {
      label: "",
      description: "",
      sentimentEnabled: false,
    },
  });

  const sentimentEnabled = watch("sentimentEnabled");

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (values: TopicFormValues) => {
    await createTopic.mutateAsync({
      label: values.label,
      description: values.description || undefined,
      sentimentEnabled: values.sentimentEnabled,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Create Topic</DialogTitle>
            <DialogDescription>
              Add a new topic to this category.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            <TextInput
              label="Label"
              placeholder="Enter topic label"
              maxLength={80}
              error={errors.label?.message}
              autoFocus
              {...register("label")}
            />

            <Textarea
              label="Description (optional)"
              placeholder="Describe this topic..."
              maxLength={240}
              error={errors.description?.message}
              {...register("description")}
            />

            <Toggle
              label="Enable sentiment"
              checked={sentimentEnabled}
              onCheckedChange={(checked) =>
                setValue("sentimentEnabled", !!checked)
              }
            />
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting || createTopic.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
