import { TRPCError } from "@trpc/server";
import { getISOWeek, getISOWeekYear } from "date-fns";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  createApiCredential,
  createApiSyncLog,
  getApiCredentialsByUserId,
  updateApiCredential,
} from "./zeDeliveryDb";
import { createZeDeliveryClient } from "./zeDeliveryClient";

const dateString = z.string().min(1);

function currentDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

async function logSync(
  apiCredentialId: number | undefined,
  endpoint: string,
  recordsProcessed = 1,
  status: "success" | "failed" | "partial" = "success",
  errorMessage?: string
) {
  if (!apiCredentialId) return;
  await createApiSyncLog({
    apiCredentialId,
    endpoint,
    status,
    recordsProcessed,
    errorMessage,
  });
}

export const zeDeliveryRouter = router({
  setCredentials: protectedProcedure
    .input(
      z.object({
        clientId: z.string().default(""),
        clientSecret: z.string().default(""),
        merchantIds: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const merchantIds = input.merchantIds.filter(Boolean);
      const payload = {
        clientId: input.clientId,
        clientSecret: input.clientSecret,
        merchantIds: JSON.stringify(merchantIds),
        lastSyncedAt: new Date(),
      };
      const existing = await getApiCredentialsByUserId(ctx.user.id);

      if (existing) {
        await updateApiCredential(existing.id, payload);
      } else {
        await createApiCredential({
          userId: ctx.user.id,
          ...payload,
          scope: "orders/read",
          isActive: true,
        });
      }

      return {
        success: true as const,
        mode: input.clientId && input.clientSecret ? ("live" as const) : ("mock" as const),
      };
    }),

  verifyCredentials: protectedProcedure
    .input(
      z.object({
        clientId: z.string().default(""),
        clientSecret: z.string().default(""),
        merchantId: z.string().default("demo-merchant"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const client = createZeDeliveryClient(input.clientId, input.clientSecret);
        const data = await client.getMerchantKPIs(input.merchantId, {
          granularity: "DAY",
          referenceDate: currentDateOnly(),
        });
        return {
          success: true as const,
          data,
          mode: client.isMockMode ? ("mock" as const) : ("live" as const),
        };
      } catch (cause) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid API credentials or merchant ID",
          cause,
        });
      }
    }),

  getCredentials: protectedProcedure.query(async ({ ctx }) => {
    const creds = await getApiCredentialsByUserId(ctx.user.id);
    if (!creds) return null;
    return { ...creds, merchantIds: JSON.parse(creds.merchantIds) as string[] };
  }),

  getMerchantKPIs: protectedProcedure
    .input(
      z.object({
        merchantId: z.string().min(1),
        granularity: z.enum(["HOUR", "DAY", "WEEK", "MONTH"]).default("DAY"),
        referenceDate: z.string().optional(),
        forceRefresh: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const creds = await getApiCredentialsByUserId(ctx.user.id);
      const client = createZeDeliveryClient(creds?.clientId ?? "", creds?.clientSecret ?? "");

      try {
        const kpis = await client.getMerchantKPIs(input.merchantId, {
          granularity: input.granularity,
          referenceDate: input.referenceDate ?? currentDateOnly(),
        });

        if (creds && !client.isMockMode) {
          await updateApiCredential(creds.id, { lastSyncedAt: new Date() });
          await logSync(creds.id, `/merchants/${input.merchantId}/kpis`);
        }

        return {
          ...kpis,
          isCached: false as const,
          isMock: client.isMockMode as boolean,
        };
      } catch (cause) {
        if (!client.isMockMode) {
          await logSync(creds?.id, `/merchants/${input.merchantId}/kpis`, 0, "failed", String(cause));
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Unable to fetch merchant KPIs",
            cause,
          });
        }
        throw cause;
      }
    }),

  getReimbursementSummaries: protectedProcedure
    .input(
      z.object({
        merchantId: z.string().min(1),
        startDate: dateString,
        endDate: dateString,
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(200).default(100),
        orderNumber: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const creds = await getApiCredentialsByUserId(ctx.user.id);
      const client = createZeDeliveryClient(creds?.clientId ?? "", creds?.clientSecret ?? "");
      const data = await client.getOrderReimbursementSummaries(input.merchantId, {
        startDate: input.startDate,
        endDate: input.endDate,
        page: input.page,
        pageSize: input.pageSize,
        orderNumber: input.orderNumber,
      });

      if (creds && !client.isMockMode) {
        await logSync(creds.id, `/merchants/${input.merchantId}/reimbursements/orders/summaries`, data.orders.length);
      }

      return {
        ...data,
        isMock: client.isMockMode as boolean,
      };
    }),

  getOperationalIncentives: protectedProcedure
    .input(
      z.object({
        merchantId: z.string().min(1),
        isoYear: z.number().int().min(1),
        isoWeek: z.number().int().min(1).max(53),
      })
    )
    .query(async ({ ctx, input }) => {
      const creds = await getApiCredentialsByUserId(ctx.user.id);
      const client = createZeDeliveryClient(creds?.clientId ?? "", creds?.clientSecret ?? "");
      const data = await client.getOperationalIncentives(input.merchantId, {
        isoYear: input.isoYear,
        isoWeek: input.isoWeek,
      });

      if (creds && !client.isMockMode) {
        await logSync(creds.id, `/merchants/${input.merchantId}/reports/operational-incentives`, data.operationalIncentives.length);
      }

      return {
        ...data,
        isMock: client.isMockMode as boolean,
      };
    }),

  getOrderHistory: protectedProcedure
    .input(
      z.object({
        merchantId: z.string().min(1),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
        sort: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ ctx, input }) => {
      const creds = await getApiCredentialsByUserId(ctx.user.id);
      const client = createZeDeliveryClient(creds?.clientId ?? "", creds?.clientSecret ?? "");
      const data = await client.getOrderHistory(input.merchantId, {
        startDate: input.startDate,
        endDate: input.endDate,
        page: input.page,
        pageSize: input.pageSize,
        sort: input.sort,
      });

      if (creds && !client.isMockMode) {
        await logSync(creds.id, `/merchants/${input.merchantId}/orders/history`, data.items.length);
      }

      return {
        ...data,
        isMock: client.isMockMode as boolean,
      };
    }),

  pollOrderEvents: protectedProcedure
    .input(
      z.object({
        merchantIds: z.array(z.string()).min(1),
        eventTypes: z.array(z.enum(["CREATED", "CONFIRMED", "DISPATCHED", "CANCELLED", "CONCLUDED", "EDITED"])).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const creds = await getApiCredentialsByUserId(ctx.user.id);
      const client = createZeDeliveryClient(creds?.clientId ?? "", creds?.clientSecret ?? "");
      const data = await client.pollOrderEvents(input.merchantIds, {
        eventTypes: input.eventTypes,
      });

      if (creds && !client.isMockMode) {
        const nextEventId = data[0]?.eventId ?? creds.lastEventId;
        await updateApiCredential(creds.id, {
          ...(nextEventId ? { lastEventId: nextEventId } : {}),
          lastSyncedAt: new Date(),
        });
        await logSync(creds.id, "/events:polling", data.length);
      }

      return {
        events: data,
        isMock: client.isMockMode as boolean,
      };
    }),

  acknowledgeEvents: protectedProcedure
    .input(
      z.object({
        events: z.array(
          z.object({
            id: z.string().min(1),
            orderId: z.number().int(),
            eventType: z.enum(["CREATED", "CONFIRMED", "DISPATCHED", "CANCELLED", "CONCLUDED", "EDITED"]),
          })
        ).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const creds = await getApiCredentialsByUserId(ctx.user.id);
      const client = createZeDeliveryClient(creds?.clientId ?? "", creds?.clientSecret ?? "");
      await client.acknowledgeEvents(input.events);

      if (creds && !client.isMockMode) {
        await logSync(creds.id, "/events/acknowledgment", input.events.length);
      }

      return {
        success: true as const,
        count: input.events.length,
        isMock: client.isMockMode as boolean,
      };
    }),

  getWebhooks: protectedProcedure.query(async ({ ctx }) => {
    const creds = await getApiCredentialsByUserId(ctx.user.id);
    const client = createZeDeliveryClient(creds?.clientId ?? "", creds?.clientSecret ?? "");
    const data = await client.getWebhooks();
    return {
      webhooks: data,
      isMock: client.isMockMode as boolean,
    };
  }),

  upsertWebhook: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        active: z.boolean().default(true),
        subscribedEvents: z.array(z.enum(["ORDER_EVENTS"])).default(["ORDER_EVENTS"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const creds = await getApiCredentialsByUserId(ctx.user.id);
      const client = createZeDeliveryClient(creds?.clientId ?? "", creds?.clientSecret ?? "");
      const data = await client.upsertWebhook(input);
      if (creds && !client.isMockMode) {
        await logSync(creds.id, "/webhooks", 1);
      }
      return {
        webhook: data,
        isMock: client.isMockMode as boolean,
      };
    }),

  getCurrentIsoWeek: protectedProcedure.query(() => {
    const now = new Date();
    return {
      isoWeek: getISOWeek(now),
      isoYear: getISOWeekYear(now),
    };
  }),
});
