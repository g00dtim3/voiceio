"use client";

import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Button,
  TextInput,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Checkbox,
} from "@/shared/ui";

const DEFAULT_SECTIONS = [
  { id: "summary", label: "Summary" },
  { id: "nps", label: "NPS" },
  { id: "drivers", label: "Drivers" },
] as const;

interface ReportCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: string[];
  onSubmit: (data: {
    name: string;
    baseViewId: string;
    sections: string[];
    textColumn: string;
    scoreColumn: string;
  }) => void;
}

export function ReportCreationDialog({
  open,
  onOpenChange,
  columns,
  onSubmit,
}: ReportCreationDialogProps) {
  const [name, setName] = useState("");
  const [baseViewId, setBaseViewId] = useState("default");
  const [sections, setSections] = useState<string[]>(["summary"]);
  const [textColumn, setTextColumn] = useState("");
  const [scoreColumn, setScoreColumn] = useState("");

  const toggleSection = (id: string) => {
    setSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), baseViewId, sections, textColumn, scoreColumn });
    setName("");
    setSections(["summary"]);
    setTextColumn("");
    setScoreColumn("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Report</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            {/* Report name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Report name <span className="text-[var(--color-danger-500)]">*</span>
              </label>
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Report"
                required
              />
            </div>

            {/* Base view */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Base view
              </label>
              <Select value={baseViewId} onValueChange={setBaseViewId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Default sections */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Default sections
              </label>
              <div className="space-y-2">
                {DEFAULT_SECTIONS.map((section) => (
                  <Checkbox
                    key={section.id}
                    label={section.label}
                    checked={sections.includes(section.id)}
                    onCheckedChange={() => toggleSection(section.id)}
                  />
                ))}
              </div>
            </div>

            {/* Text column */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Text column
              </label>
              <Select value={textColumn} onValueChange={setTextColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Score column */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Score column
              </label>
              <Select value={scoreColumn} onValueChange={setScoreColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col} value={col}>
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              variant="secondary"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
