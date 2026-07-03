import { describe, expect, it, vi, beforeEach } from "vitest";

const selectMock = vi.fn();
const fromMock = vi.fn();
const whereMock = vi.fn();

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    select: selectMock,
  })),
}));

import { getCriticalStockProducts } from "./queries";

describe("getCriticalStockProducts", () => {
  beforeEach(() => {
    selectMock.mockReset();
    fromMock.mockReset();
    whereMock.mockReset();

    const query = {
      from: fromMock.mockReturnValue({
        where: whereMock.mockResolvedValue([{ id: 1 }]),
      }),
    };

    selectMock.mockReturnValue(query);
  });

  it("returns active products at or below minimum stock", async () => {
    const result = await getCriticalStockProducts();

    expect(result).toEqual([{ id: 1 }]);
    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(whereMock).toHaveBeenCalledTimes(1);
  });
});

