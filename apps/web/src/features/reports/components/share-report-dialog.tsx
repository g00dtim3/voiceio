"use client";

import { useState, useCallback } from "react";
import type { ShareSettings, ShareRole, TeamMember } from "@/shared/types/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  Button,
  Toggle,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/shared/ui";

interface ShareReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: ShareSettings;
  onUpdateTeamAccess: (userId: string, role: ShareRole) => void;
  onUpdatePublicAccess: (data: {
    enabled?: boolean;
    passwordEnabled?: boolean;
    embedEnabled?: boolean;
  }) => void;
}

export function ShareReportDialog({
  open,
  onOpenChange,
  settings,
  onUpdateTeamAccess,
  onUpdatePublicAccess,
}: ShareReportDialogProps) {
  const [copied, setCopied] = useState<"link" | "embed" | null>(null);

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/shared/${settings.publicAccess.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied("link");
    setTimeout(() => setCopied(null), 2000);
  }, [settings.publicAccess.shareToken]);

  const handleCopyEmbed = useCallback(() => {
    const url = `${window.location.origin}/embed/${settings.publicAccess.shareToken}`;
    const code = `<iframe src="${url}" width="100%" height="600" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(code);
    setCopied("embed");
    setTimeout(() => setCopied(null), 2000);
  }, [settings.publicAccess.shareToken]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Report</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-6">
          {/* Team access */}
          <section className="space-y-3">
            <h4 className="text-sm font-medium text-[var(--text-primary)]">
              Team access
            </h4>
            {settings.teamAccess.map((member: TeamMember) => (
              <div
                key={member.userId}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-sm text-[var(--text-primary)]">
                  {member.name}
                </span>
                <Select
                  value={member.role}
                  onValueChange={(value: string) =>
                    onUpdateTeamAccess(member.userId, value as ShareRole)
                  }
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </section>

          {/* Public access */}
          <section className="space-y-3">
            <h4 className="text-sm font-medium text-[var(--text-primary)]">
              Public access
            </h4>

            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">
                Enable public link
              </span>
              <Toggle
                checked={settings.publicAccess.enabled}
                onCheckedChange={(enabled) =>
                  onUpdatePublicAccess({ enabled })
                }
              />
            </div>

            {settings.publicAccess.enabled && (
              <>
                {/* Share token display */}
                <div className="rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-muted)] px-3 py-2">
                  <p className="truncate text-xs font-mono text-[var(--text-secondary)]">
                    {settings.publicAccess.shareToken}
                  </p>
                </div>

                {/* Password toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">
                    Require password
                  </span>
                  <Toggle
                    checked={settings.publicAccess.passwordEnabled}
                    onCheckedChange={(passwordEnabled) =>
                      onUpdatePublicAccess({ passwordEnabled })
                    }
                  />
                </div>

                {/* Embed toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">
                    Allow embedding
                  </span>
                  <Toggle
                    checked={settings.publicAccess.embedEnabled}
                    onCheckedChange={(embedEnabled) =>
                      onUpdatePublicAccess({ embedEnabled })
                    }
                  />
                </div>
              </>
            )}
          </section>
        </DialogBody>

        <DialogFooter>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleCopyLink}>
              {copied === "link" ? "Copied!" : "Copy link"}
            </Button>
            {settings.publicAccess.embedEnabled && (
              <Button variant="secondary" onClick={handleCopyEmbed}>
                {copied === "embed" ? "Copied!" : "Copy embed code"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
