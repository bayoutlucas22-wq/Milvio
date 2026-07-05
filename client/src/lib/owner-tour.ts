export type OwnerTourStep = {
  id: string;
  title: string;
  description: string;
  target: string;
};

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const OWNER_TOUR_STORAGE_KEY = "owner-tour:completed-v1";
export const OWNER_GUIDE_TOUR_STORAGE_KEY = "owner-guide-tour:completed-v1";

export const OWNER_TOUR_STEPS: OwnerTourStep[] = [
  {
    id: "hero",
    title: "Comece pelo lucro",
    description: "Aqui você entende se a conta fechou ou se ainda falta peça para chamar isso de lucro real.",
    target: "hero",
  },
  {
    id: "metrics",
    title: "Veja os números principais",
    description: "Esses cartões mostram o que entrou, o que saiu e o que sobrou. É a leitura rápida para tomar decisão.",
    target: "metrics",
  },
  {
    id: "xls-study",
    title: "Estude o lucro nos XLS",
    description: "Aqui a conta vira aula: ticket, custo, perda e o que mexer primeiro para sobrar mais.",
    target: "xls-study",
  },
  {
    id: "api-masterclass",
    title: "Aprenda a lucrar com a API",
    description: "Aqui a gente transforma dados da Zé Delivery em decisão simples: pedido, taxa, perda e ganho.",
    target: "api-masterclass",
  },
  {
    id: "files",
    title: "Confira os arquivos usados",
    description: "A conta só fica confiável quando os XLS certos entram e são consolidados por tipo de relatório.",
    target: "files",
  },
  {
    id: "ze",
    title: "Conecte o Zé Delivery",
    description: "Quando a credencial real entrar, o mesmo painel valida a API e continua mostrando a operação sem trocar de tela.",
    target: "ze-connector",
  },
];

export const OWNER_GUIDE_TOUR_STEPS: OwnerTourStep[] = [
  {
    id: "guide-hero",
    title: "Entenda a plataforma",
    description: "Aqui você vê o que a Zé API faz e por que esse app traduz tudo para uma leitura simples.",
    target: "guide-hero",
  },
  {
    id: "guide-ingestion",
    title: "Veja a ingestão",
    description: "A leitura começa com autenticação, busca de pedido e chegada dos eventos na tela.",
    target: "guide-ingestion",
  },
  {
    id: "guide-products",
    title: "Entenda o que vende",
    description: "Doritos, cerveja, gelo e água ajudam a mostrar o mix, o giro e o que precisa ficar ligado.",
    target: "guide-products",
  },
  {
    id: "guide-swagger",
    title: "Valide no Swagger",
    description: "A documentação confirma os endpoints certos antes de ligar a integração no real.",
    target: "guide-swagger",
  },
  {
    id: "guide-close",
    title: "Feche com lucro",
    description: "Quando a leitura fica clara, o dono reduz perda, protege margem e melhora o caixa.",
    target: "guide-close",
  },
];

export function hasCompletedOwnerTour(storage: StorageLike | undefined) {
  return storage?.getItem(OWNER_TOUR_STORAGE_KEY) === "done";
}

export function shouldAutoStartOwnerTour(storage: StorageLike | undefined) {
  return !hasCompletedOwnerTour(storage);
}

export function markOwnerTourCompleted(storage: StorageLike | undefined) {
  storage?.setItem(OWNER_TOUR_STORAGE_KEY, "done");
}

export function clearOwnerTourCompleted(storage: StorageLike | undefined) {
  storage?.removeItem(OWNER_TOUR_STORAGE_KEY);
}

export function hasCompletedOwnerGuideTour(storage: StorageLike | undefined) {
  return storage?.getItem(OWNER_GUIDE_TOUR_STORAGE_KEY) === "done";
}

export function shouldAutoStartOwnerGuideTour(storage: StorageLike | undefined) {
  return !hasCompletedOwnerGuideTour(storage);
}

export function markOwnerGuideTourCompleted(storage: StorageLike | undefined) {
  storage?.setItem(OWNER_GUIDE_TOUR_STORAGE_KEY, "done");
}

export function clearOwnerGuideTourCompleted(storage: StorageLike | undefined) {
  storage?.removeItem(OWNER_GUIDE_TOUR_STORAGE_KEY);
}
