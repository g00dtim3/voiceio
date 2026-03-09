"use client";

import { useState, type FormEvent } from "react";
import type { InsightElementType } from "@/shared/types/api";
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
} from "@/shared/ui";

const ELEMENT_TYPES: { value: InsightElementType; label: string }[] = [
  { value: "key_metrics_overview", label: "Key Metrics Overview" },
  { value: "nps_score", label: "NPS Score" },
  { value: "nps_over_time", label: "NPS Over Time" },
  { value: "topic_correlation", label: "Topic Correlation" },
  { value: "topic_breakdown", label: "Topic Breakdown" },
  { value: "topic_sentiment", label: "Topic Sentiment" },
  { value: "overall_sentiment", label: "Overall Sentiment" },
  { value: "selected_rows", label: "Selected Rows" },
  { value: "narrative_ai_block", label: "AI Narrative Block" },
];

const CHART_TYPES = [
  { value: "bar", label: "Bar" },
  { value: "line", label: "Line" },
  { value: "pie", label: "Pie" },
  { value: "donut", label: "Donut" },
  { value: "stacked_bar", label: "Stacked Bar" },
];

interface AddElementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    category: string;
    type: InsightElementType;
    chartType: string;
    limit: number;
  }) => void;
}

export function AddElementDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddElementDialogProps) {
  const [category, setCategory] = useState("Topic");
  const [elementType, setElementType] = useState<InsightElementType>("topic_breakdown");
  const [chartType, setChartType] = useState("bar");
  const [limit, setLimit] = useState("10");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      category,
      type: elementType,
      chartType,
      limit: parseInt(limit, 10) || 10,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Element</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Category
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Topic">Topic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Element type */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Element type
              </label>
              <Select
                value={elementType}
                onValueChange={(v: string) => setElementType(v as InsightElementType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ELEMENT_TYPES.map((et) => (
                    <SelectItem key={et.value} value={et.value}>
                      {et.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chart type */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Chart type
              </label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHART_TYPES.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Limit */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Limit
              </label>
              <TextInput
                type="number"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                min={1}
                max={100}
                placeholder="10"
              />
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
            <Button type="submit">Add element</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
