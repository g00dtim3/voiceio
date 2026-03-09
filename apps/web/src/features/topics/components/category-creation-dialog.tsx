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
} from "@/shared/ui";
import { useCreateCategory } from "../hooks/use-topics";

const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(60, "Name must be 60 characters or less"),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CategoryCreationDialogProps {
  projectId: string;
  collectionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryCreationDialog({
  projectId,
  collectionId,
  open,
  onOpenChange,
}: CategoryCreationDialogProps) {
  const createCategory = useCreateCategory(projectId, collectionId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (values: CategoryFormValues) => {
    await createCategory.mutateAsync(values.name);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>
              Add a new category to this collection.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <TextInput
              label="Name"
              placeholder="Enter category name"
              maxLength={60}
              error={errors.name?.message}
              autoFocus
              {...register("name")}
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
              loading={isSubmitting || createCategory.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
