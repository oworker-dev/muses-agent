"use client";

import { CheckIcon } from "lucide-react";
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

export function AgentSettingsDialog({
  locale,
  messages,
  onLocaleChange,
  onOpenChange,
  open,
}: {
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
      </DialogContent>
    </Dialog>
  );
}

function LocaleButton({ active, label, onClick }: { readonly active: boolean; readonly label: string; readonly onClick: () => void }) {
  return (
    <Button className={cn("justify-between", active && "border-foreground/30 bg-accent")} onClick={onClick} variant="outline">
      {label}
      <CheckIcon className={cn("size-4", active ? "opacity-100" : "opacity-0")} />
    </Button>
  );
}
