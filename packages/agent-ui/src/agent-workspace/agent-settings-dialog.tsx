"use client";

import { CheckIcon, CircleOffIcon, PlugIcon, SparklesIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.js";
import { Button } from "../ui/button.js";
import { cn } from "../utils.js";
import type { AgentLocale, AgentMessages } from "./i18n.js";
import type { AgentExtensionInfo } from "./contracts.js";

export function AgentSettingsDialog({
  extensions,
  locale,
  messages,
  onLocaleChange,
  onOpenChange,
  open,
}: {
  readonly extensions: readonly AgentExtensionInfo[];
  readonly locale: AgentLocale;
  readonly messages: AgentMessages;
  readonly onLocaleChange: (locale: AgentLocale) => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{messages.settings}</DialogTitle>
          <DialogDescription>{messages.settingsDescription}</DialogDescription>
        </DialogHeader>
        <section className="space-y-2">
          <h3 className="text-sm font-medium">{messages.interfaceLanguage}</h3>
          <div className="grid grid-cols-2 gap-2">
            <LocaleButton active={locale === "en"} label={messages.english} onClick={() => onLocaleChange("en")} />
            <LocaleButton active={locale === "zh-CN"} label={messages.simplifiedChinese} onClick={() => onLocaleChange("zh-CN")} />
          </div>
        </section>
        <section className="space-y-3 border-t pt-4">
          <div>
            <h3 className="text-sm font-medium">{messages.extensions}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{messages.extensionsDescription}</p>
          </div>
          <div className="space-y-2">
            {extensions.map((extension) => (
              <div className="flex items-start gap-3 rounded-md border p-3" key={`${extension.kind}:${extension.id}`}>
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  {extension.kind === "skill" ? <SparklesIcon className="size-4" /> : <PlugIcon className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-sm">{extension.label}</p>
                    {extension.version ? <span className="font-mono text-[11px] text-muted-foreground">v{extension.version}</span> : null}
                  </div>
                  {extension.description ? <p className="mt-0.5 text-xs text-muted-foreground">{extension.description}</p> : null}
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-1 text-[11px] font-medium", extension.status === "available" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>{extensionStatus(messages, extension.status)}</span>
              </div>
            ))}
            {!extensions.some((extension) => extension.kind === "mcp") ? (
              <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-xs text-muted-foreground">
                <CircleOffIcon className="size-4" />
                {messages.noMcpConnections}
              </div>
            ) : null}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}

function extensionStatus(messages: AgentMessages, status: AgentExtensionInfo["status"]): string {
  if (status === "available") return messages.available;
  if (status === "disabled") return messages.disabled;
  return messages.unconfigured;
}

function LocaleButton({ active, label, onClick }: { readonly active: boolean; readonly label: string; readonly onClick: () => void }) {
  return (
    <Button className={cn("justify-between", active && "border-foreground/30 bg-accent")} onClick={onClick} variant="outline">
      {label}
      <CheckIcon className={cn("size-4", active ? "opacity-100" : "opacity-0")} />
    </Button>
  );
}
