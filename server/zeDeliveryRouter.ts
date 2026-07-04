import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { createApiCredential, createApiSyncLog, getApiCredentialsByUserId, getCachedKPI, cacheKPI, updateApiCredential } from "./zeDeliveryDb";
import { createZeDeliveryClient } from "./zeDeliveryClient";

export const zeDeliveryRouter = router({
  setCredentials: protectedProcedure
    .input(z.object({
      clientId: z.string().min(1),
      clientSecret: z.string().min(1),
      merchantIds: z.array(z.string()).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getApiCredentialsByUserId(ctx.user.id);
      const payload = {
        clientId: input.clientId,
        clientSecret: input.clientSecret,
        merchantIds: JSON.stringify(input.merchantIds),
        lastSyncedAt: new Date(),
      };
      if (existing) await updateApiCredential(existing.id, payload);
      else await createApiCredential({ userId: ctx.user.id, ...payload, scope: "orders/read reports/read", isActive: true });
      return { success: true as const };
    }),

  verifyCredentials: protectedProcedure
    .input(z.object({
      clientId: z.string().min(1),
      clientSecret: z.string().min(1),
      merchantId: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      try {
        const client = createZeDeliveryClient(input.clientId, input.clientSecret);
        const data = await client.getMerchantKPIs(input.merchantId);
        return { success: true as const, data };
      } catch (cause) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid API credentials or merchant ID", cause });
      }
    }),

  getCredentials: protectedProcedure.query(async ({ ctx }) => {
    const creds = await getApiCredentialsByUserId(ctx.user.id);
    if (!creds) return null;
    return { ...creds, merchantIds: JSON.parse(creds.merchantIds) as string[] };
  }),

  getMerchantKPIs: protectedProcedure
    .input(z.object({ merchantId: z.string().min(1), forceRefresh: z.boolean().default(false) }))
    .query(async ({ ctx, input }) => {
      if (!input.forceRefresh) {
        const cached = await getCachedKPI(input.merchantId);
        if (cached) return { ...cached, isCached: true as const };
      }
      const creds = await getApiCredentialsByUserId(ctx.user.id);
      if (!creds) throw new TRPCError({ code: "UNAUTHORIZED", message: "API credentials not configured" });
      const client = createZeDeliveryClient(creds.clientId, creds.clientSecret);
      const kpis = await client.getMerchantKPIs(input.merchantId);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await cacheKPI({
        merchantId: input.merchantId,
        grossRevenue: String(kpis.grossRevenue),
        netMargin: String(kpis.netMargin),
        totalOrders: kpis.totalOrders,
        deliveredOrders: kpis.deliveredOrders,
        cancelledOrders: kpis.cancelledOrders,
        platformCommissions: String(kpis.platformCommissions),
        operationalCosts: String(kpis.operationalCosts),
        dataSource: "api",
        syncedAt: new Date(),
        expiresAt,
      });
      await createApiSyncLog({
        apiCredentialId: creds.id,
        endpoint: "/reports/merchant-kpis",
        status: "success",
        recordsProcessed: 1,
      });
      return { ...kpis, isCached: false as const };
    }),
});
