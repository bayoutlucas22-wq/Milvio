import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OwnerTourStep } from "@/lib/owner-tour";
import { ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";

type OwnerTourBotProps = {
  open: boolean;
  step: OwnerTourStep;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onRestart: () => void;
};

export function OwnerTourBot({ open, step, index, total, onNext, onPrev, onClose, onRestart }: OwnerTourBotProps) {
  if (!open) return null;

  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto w-full max-w-md sm:left-auto sm:right-4 sm:w-[26rem]"
    >
      <Card className="overflow-hidden rounded-3xl border-sky-200 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur">
        <CardHeader className="space-y-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 to-white pb-4">
          <div className="flex items-center justify-between gap-3">
            <Badge className="rounded-full bg-sky-600 px-3 py-1 text-white">Tour guiado</Badge>
            <span className="text-xs font-medium text-slate-500">
              {index + 1}/{total}
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-600 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg">{step.title}</CardTitle>
              <CardDescription className="mt-1 text-sm text-slate-600">
                {step.description}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={onClose}
              aria-label="Fechar tour"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Passo atual: {step.target}</span>
            <button type="button" className="font-medium text-sky-700 hover:underline" onClick={onRestart}>
              Reiniciar
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={onPrev} disabled={isFirst} className="gap-2 rounded-full">
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full">
                Fechar
              </Button>
              <Button size="sm" onClick={onNext} className="gap-2 rounded-full">
                {isLast ? "Terminar" : "Próximo"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
