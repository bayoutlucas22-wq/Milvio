import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { zeDeliveryRouter } from "./zeDeliveryRouter";
import {
  getAllProducts,
  getProductById,
  getCriticalStockProducts,
  getAllDrivers,
  getDriverById,
  getAvailableDrivers,
  getDriversWithCapacity,
  getTodayOrders,
  getOrderById,
  getOrdersByDriver,
  getActiveOrders,
  getLateOrders,
  getWaitingOrders,
  getOrdersWithRisk,
  getCriticalOrders,
  getOrderItems,
  getDeliveryByOrderId,
  getAllFeeRules,
  getFeeRuleByCategory,
  getFeeRuleByProduct,
  getCancellationsByDate,
  getDailyClosingByDate,
  getLastDailyClosing,
  getDailyClosingHistory,
  getExecutiveSummary,
  getLatestImportedSummaries,
  getSystemSetting,
  getAllSystemSettings,
} from "./queries";
import { calculateOrderDelay, calculateRiskLevel, calculateNetMargin } from "./db";
import { parseDailyMetricsExcel, parseWorkbookImport, extractNormalizedImportRows } from "./excelIngest";
import { persistImportedWorkbook } from "./importPersistence";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import {
  products,
  drivers,
  orders,
  orderItems,
  deliveries,
  feeRules,
  cancellations,
  dailyClosings,
  systemSettings,
} from "../drizzle/schema";

const decimalString = (value: number) => value.toString();

export const appRouter = router({
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  api: zeDeliveryRouter,

  // ============ PRODUCTS ============
  products: router({
    list: protectedProcedure.query(async () => {
      return await getAllProducts();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getProductById(input.id);
      }),

    getCritical: protectedProcedure.query(async () => {
      return await getCriticalStockProducts();
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          sku: z.string().optional(),
          category: z.string(),
          salePrice: z.number(),
          unitCost: z.number(),
          stockTotal: z.number().default(0),
          stockCold: z.number().default(0),
          minimumStock: z.number().default(0),
          platformFeePercent: z.number().default(20),
          extraFeePercent: z.number().default(0),
          marginTargetPercent: z.number().default(15),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const result = await db.insert(products).values({
          ...input,
          salePrice: decimalString(input.salePrice),
          unitCost: decimalString(input.unitCost),
          platformFeePercent: decimalString(input.platformFeePercent),
          extraFeePercent: decimalString(input.extraFeePercent),
          marginTargetPercent: decimalString(input.marginTargetPercent),
        });
        return result;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          salePrice: z.number().optional(),
          unitCost: z.number().optional(),
          stockTotal: z.number().optional(),
          stockCold: z.number().optional(),
          minimumStock: z.number().optional(),
          platformFeePercent: z.number().optional(),
          extraFeePercent: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const { id, ...updateData } = input;
        const decimalUpdate = {
          ...(updateData.name !== undefined ? { name: updateData.name } : {}),
          ...(updateData.salePrice !== undefined ? { salePrice: decimalString(updateData.salePrice) } : {}),
          ...(updateData.unitCost !== undefined ? { unitCost: decimalString(updateData.unitCost) } : {}),
          ...(updateData.stockTotal !== undefined ? { stockTotal: updateData.stockTotal } : {}),
          ...(updateData.stockCold !== undefined ? { stockCold: updateData.stockCold } : {}),
          ...(updateData.minimumStock !== undefined ? { minimumStock: updateData.minimumStock } : {}),
          ...(updateData.platformFeePercent !== undefined
            ? { platformFeePercent: decimalString(updateData.platformFeePercent) }
            : {}),
          ...(updateData.extraFeePercent !== undefined
            ? { extraFeePercent: decimalString(updateData.extraFeePercent) }
            : {}),
        };
        const result = await db
          .update(products)
          .set(decimalUpdate)
          .where(eq(products.id, id));
        return result;
      }),
  }),

  // ============ DRIVERS ============
  drivers: router({
    list: protectedProcedure.query(async () => {
      return await getAllDrivers();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getDriverById(input.id);
      }),

    getAvailable: protectedProcedure.query(async () => {
      return await getAvailableDrivers();
    }),

    getWithCapacity: protectedProcedure.query(async () => {
      return await getDriversWithCapacity();
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          phone: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const result = await db
          .insert(drivers)
          .values({
            ...input,
            status: "available",
            activeOrderCount: 0,
            maxActiveOrders: 2,
          });
        return result;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          phone: z.string().optional(),
          status: z.enum(["available", "one_order", "two_orders", "unavailable", "delayed", "paused"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const { id, ...updateData } = input;
        const result = await db
          .update(drivers)
          .set(updateData)
          .where(eq(drivers.id, id));
        return result;
      }),
  }),

  // ============ ORDERS ============
  orders: router({
    getTodayOrders: protectedProcedure.query(async () => {
      return await getTodayOrders();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const order = await getOrderById(input.id);
        if (!order) return null;

        const items = await getOrderItems(input.id);
        const delivery = await getDeliveryByOrderId(input.id);

        return {
          ...order,
          items,
          delivery,
        };
      }),

    getByDriver: protectedProcedure
      .input(z.object({ driverId: z.number() }))
      .query(async ({ input }) => {
        return await getOrdersByDriver(input.driverId);
      }),

    getActive: protectedProcedure.query(async () => {
      return await getActiveOrders();
    }),

    getLate: protectedProcedure.query(async () => {
      return await getLateOrders();
    }),

    getWithRisk: protectedProcedure.query(async () => {
      return await getOrdersWithRisk();
    }),

    create: protectedProcedure
      .input(
        z.object({
          externalOrderId: z.string().optional(),
          platform: z.string().optional(),
          customerNeighborhood: z.string().optional(),
          grossAmount: z.number(),
          platformFeePercent: z.number().default(20),
          extraFeeAmount: z.number().default(0),
          productCostTotal: z.number().default(0),
          deliveryCost: z.number().default(0),
          packagingCost: z.number().default(0),
          discountAmount: z.number().default(0),
          slaPromisedMinutes: z.number().default(30),
          items: z.array(
            z.object({
              productId: z.number(),
              quantity: z.number(),
              unitPrice: z.number(),
              unitCost: z.number(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const platformFeeAmount = (input.grossAmount * input.platformFeePercent) / 100;
        const { amount: netMarginAmount, percent: netMarginPercent } = calculateNetMargin(
          input.grossAmount,
          platformFeeAmount,
          input.extraFeeAmount,
          input.productCostTotal,
          input.deliveryCost,
          input.packagingCost,
          input.discountAmount
        );

        const riskLevel = calculateRiskLevel(netMarginPercent);

        const result = await db
          .insert(orders)
          .values({
            ...input,
            grossAmount: decimalString(input.grossAmount),
            platformFeePercent: decimalString(input.platformFeePercent),
            platformFeeAmount: decimalString(platformFeeAmount),
            extraFeeAmount: decimalString(input.extraFeeAmount),
            productCostTotal: decimalString(input.productCostTotal),
            deliveryCost: decimalString(input.deliveryCost),
            packagingCost: decimalString(input.packagingCost),
            discountAmount: decimalString(input.discountAmount),
            refundAmount: "0.00",
            netMarginAmount: decimalString(netMarginAmount),
            netMarginPercent: decimalString(netMarginPercent),
            riskLevel,
            status: "pending",
            createdAt: new Date(),
          });

        return result;
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["pending", "accepted", "picking", "ready", "dispatched", "delivered", "cancelled"]),
          timestamp: z.date().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const updateData: Record<string, any> = { status: input.status };

        if (input.status === "accepted" && input.timestamp) {
          updateData.acceptedAt = input.timestamp;
        } else if (input.status === "picking" && input.timestamp) {
          updateData.pickingStartedAt = input.timestamp;
        } else if (input.status === "ready" && input.timestamp) {
          updateData.readyAt = input.timestamp;
        } else if (input.status === "dispatched" && input.timestamp) {
          updateData.dispatchedAt = input.timestamp;
        } else if (input.status === "delivered" && input.timestamp) {
          updateData.deliveredAt = input.timestamp;
        }

        const result = await db
          .update(orders)
          .set(updateData)
          .where(eq(orders.id, input.id));

        return result;
      }),

    assignDriver: protectedProcedure
      .input(
        z.object({
          orderId: z.number(),
          driverId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const driver = await getDriverById(input.driverId);
        if (!driver) throw new TRPCError({ code: "NOT_FOUND", message: "Driver not found" });

        if (driver.activeOrderCount >= driver.maxActiveOrders) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Driver has reached maximum active orders",
          });
        }

        const result = await db
          .update(orders)
          .set({ driverId: input.driverId })
          .where(eq(orders.id, input.orderId));

        return result;
      }),
  }),

  // ============ FEE RULES ============
  feeRules: router({
    list: protectedProcedure.query(async () => {
      return await getAllFeeRules();
    }),

    getByCategory: protectedProcedure
      .input(z.object({ category: z.string() }))
      .query(async ({ input }) => {
        return await getFeeRuleByCategory(input.category);
      }),

    getByProduct: protectedProcedure
      .input(z.object({ productId: z.number() }))
      .query(async ({ input }) => {
        return await getFeeRuleByProduct(input.productId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          category: z.string().optional(),
          productId: z.number().optional(),
          platformFeePercent: z.number(),
          extraFeePercent: z.number().default(0),
          paymentFeePercent: z.number().default(0),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const result = await db
          .insert(feeRules)
          .values({
            ...input,
            platformFeePercent: decimalString(input.platformFeePercent),
            extraFeePercent: decimalString(input.extraFeePercent),
            paymentFeePercent: decimalString(input.paymentFeePercent),
            active: true,
            createdAt: new Date(),
          });

        return result;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          platformFeePercent: z.number().optional(),
          extraFeePercent: z.number().optional(),
          paymentFeePercent: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const decimalUpdate = {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.platformFeePercent !== undefined
            ? { platformFeePercent: decimalString(input.platformFeePercent) }
            : {}),
          ...(input.extraFeePercent !== undefined
            ? { extraFeePercent: decimalString(input.extraFeePercent) }
            : {}),
          ...(input.paymentFeePercent !== undefined
            ? { paymentFeePercent: decimalString(input.paymentFeePercent) }
            : {}),
        };
        const { id, ...updateData } = input;
        const result = await db
          .update(feeRules)
          .set(decimalUpdate)
          .where(eq(feeRules.id, id));

        return result;
      }),
  }),

  // ============ DASHBOARD ============
  dashboard: router({
    getExecutiveSummary: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(30).default(7) }).optional())
      .query(async ({ input }) => {
        return await getExecutiveSummary(input?.limit ?? 7);
      }),

    getOperationalMetrics: protectedProcedure.query(async () => {
      const todayOrders = await getTodayOrders();
      const activeOrders = await getActiveOrders();
      const lateOrders = await getLateOrders();
      const waitingOrders = await getWaitingOrders();
      const criticalOrders = await getCriticalOrders();
      const driversList = await getAllDrivers();

      const availableDrivers = driversList.filter((d) => d.status === "available").length;
      const driversWithOne = driversList.filter((d) => d.status === "one_order").length;
      const driversWithTwo = driversList.filter((d) => d.status === "two_orders").length;

      const totalDeliveryCapacity = driversList.length * 2;
      const usedCapacity = driversList.reduce((sum, d) => sum + d.activeOrderCount, 0);
      const capacityUsedPercent = totalDeliveryCapacity > 0 ? (usedCapacity / totalDeliveryCapacity) * 100 : 0;

      return {
        totalOrdersToday: todayOrders.length,
        activeOrders: activeOrders.length,
        lateOrders: lateOrders.length,
        criticalOrders: criticalOrders.length,
        waitingOrders: waitingOrders.length,
        availableDrivers,
        driversWithOne,
        driversWithTwo,
        capacityUsedPercent: Math.round(capacityUsedPercent),
        totalDrivers: driversList.length,
      };
    }),

    getFinancialMetrics: protectedProcedure.query(async () => {
      const todayOrders = await getTodayOrders();
      const deliveredOrders = todayOrders.filter((o) => o.status === "delivered");

      const grossRevenue = deliveredOrders.reduce((sum, o) => sum + parseFloat(o.grossAmount.toString()), 0);
      const platformCommissions = deliveredOrders.reduce(
        (sum, o) => sum + parseFloat(o.platformFeeAmount.toString()),
        0
      );
      const extraFees = deliveredOrders.reduce((sum, o) => sum + parseFloat(o.extraFeeAmount.toString()), 0);
      const productCosts = deliveredOrders.reduce(
        (sum, o) => sum + parseFloat(o.productCostTotal.toString()),
        0
      );
      const deliveryCosts = deliveredOrders.reduce(
        (sum, o) => sum + parseFloat(o.deliveryCost.toString()),
        0
      );
      const packagingCosts = deliveredOrders.reduce(
        (sum, o) => sum + parseFloat(o.packagingCost.toString()),
        0
      );
      const discounts = deliveredOrders.reduce((sum, o) => sum + parseFloat(o.discountAmount.toString()), 0);
      const refunds = deliveredOrders.reduce((sum, o) => sum + parseFloat(o.refundAmount.toString()), 0);
      const netMargin = deliveredOrders.reduce(
        (sum, o) => sum + parseFloat(o.netMarginAmount.toString()),
        0
      );

      const netMarginPercent = grossRevenue > 0 ? (netMargin / grossRevenue) * 100 : 0;

      return {
        grossRevenue,
        platformCommissions,
        extraFees,
        productCosts,
        deliveryCosts,
        packagingCosts,
        discounts,
        refunds,
        netMargin,
        netMarginPercent: Math.round(netMarginPercent * 100) / 100,
      };
    }),
  }),

  // ============ CANCELLATIONS ============
  cancellations: router({
    getByDate: protectedProcedure
      .input(z.object({ startDate: z.date(), endDate: z.date() }))
      .query(async ({ input }) => {
        return await getCancellationsByDate(input.startDate, input.endDate);
      }),

    create: protectedProcedure
      .input(
        z.object({
          orderId: z.number(),
          reason: z.string(),
          valueLost: z.number(),
          productsReturned: z.number().default(0),
          productsLost: z.number().default(0),
          deliveryCostLost: z.number().default(0),
          responsibleParty: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const result = await db
          .insert(cancellations)
          .values({
            orderId: input.orderId,
            reason: input.reason,
            valueLost: input.valueLost.toString(),
            productsReturned: input.productsReturned,
            productsLost: input.productsLost,
            deliveryCostLost: input.deliveryCostLost.toString(),
            responsibleParty: input.responsibleParty,
            notes: input.notes,
          });

        return result;
      }),
  }),

  // ============ DAILY CLOSINGS ============
  dailyClosings: router({
    history: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(90).default(30) }).optional())
      .query(async ({ input }) => {
        return await getDailyClosingHistory(input?.limit ?? 30);
      }),

    getByDate: protectedProcedure
      .input(z.object({ date: z.date() }))
      .query(async ({ input }) => {
        return await getDailyClosingByDate(input.date);
      }),

    getLast: protectedProcedure.query(async () => {
      return await getLastDailyClosing();
    }),

    create: protectedProcedure
      .input(
        z.object({
          closingDate: z.date(),
          totalOrders: z.number(),
          totalDeliveredOrders: z.number(),
          totalCancelledOrders: z.number(),
          grossRevenue: z.number(),
          platformCommissions: z.number(),
          extraFees: z.number(),
          productCosts: z.number(),
          deliveryCosts: z.number(),
          packagingCosts: z.number(),
          discounts: z.number(),
          refunds: z.number(),
          totalNetMargin: z.number(),
          netMarginPercent: z.number(),
          ordersWithLoss: z.number().default(0),
          averageDelayMinutes: z.number().default(0),
          onTimeDeliveryPercent: z.number().default(0),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const result = await db
          .insert(dailyClosings)
          .values({
            closingDate: input.closingDate,
            totalOrders: input.totalOrders,
            totalDeliveredOrders: input.totalDeliveredOrders,
            totalCancelledOrders: input.totalCancelledOrders,
            grossRevenue: input.grossRevenue.toString(),
            platformCommissions: input.platformCommissions.toString(),
            extraFees: input.extraFees.toString(),
            productCosts: input.productCosts.toString(),
            deliveryCosts: input.deliveryCosts.toString(),
            packagingCosts: input.packagingCosts.toString(),
            discounts: input.discounts.toString(),
            refunds: input.refunds.toString(),
            totalNetMargin: input.totalNetMargin.toString(),
            netMarginPercent: input.netMarginPercent.toString(),
            ordersWithLoss: input.ordersWithLoss,
            averageDelayMinutes: input.averageDelayMinutes,
            onTimeDeliveryPercent: input.onTimeDeliveryPercent.toString(),
          });

        return result;
      }),
  }),

  // ============ EXCEL INGEST ============
  imports: router({
    getLatestSummaries: publicProcedure.query(async () => {
      const normalizedResult = await getLatestImportedSummaries();
      if (normalizedResult) {
        return normalizedResult;
      }

      const keys = [
        "excel_ingest:last_result",
        "excel_ingest:orders_report",
        "excel_ingest:drivers_report",
        "excel_ingest:restitution_summary",
        "excel_ingest:catalog",
      ] as const;

      const result: Record<string, unknown> = {};
      for (const key of keys) {
        const setting = await getSystemSetting(key);
        result[key] = setting?.value ? JSON.parse(setting.value) : null;
      }

      return result;
    }),

    dailyExcel: publicProcedure
      .input(
        z.object({
          fileName: z.string().min(1),
          base64: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const imported = parseWorkbookImport(input.base64, input.fileName);
        const normalized = extractNormalizedImportRows(input.base64, input.fileName);
        const importedAt = new Date().toISOString();
        const importId = `${imported.reportType}:${importedAt}:${input.fileName}`;

        await persistImportedWorkbook(db, imported, normalized, input.fileName, importId, importedAt);

        if (imported.reportType === "restitution_summary") {
          const rows = imported.rows ?? [];

          if (rows.length > 0) {
            for (const row of rows) {
              const values = {
                closingDate: new Date(`${row.date}T00:00:00`),
                totalOrders: 0,
                totalDeliveredOrders: 0,
                totalCancelledOrders: 0,
                grossRevenue: (row.restitutionTotal ?? row.grossRevenue ?? 0).toString(),
                platformCommissions: (row.marketplaceCommission ?? 0).toString(),
                extraFees: "0",
                productCosts: (row.storeCostTotal ?? 0).toString(),
                deliveryCosts: (row.driverCostTotal ?? 0).toString(),
                packagingCosts: "0",
                discounts: (row.restitutionPromotions ?? 0).toString(),
                refunds: "0",
                totalNetMargin: (row.totalNetMargin ?? row.restitutionTotal ?? 0).toString(),
                netMarginPercent: (row.netMarginPercent ?? 0).toString(),
                ordersWithLoss: 0,
                averageDelayMinutes: 0,
                onTimeDeliveryPercent: "0",
              };

              await db.insert(dailyClosings).values(values).onDuplicateKeyUpdate({
                set: values,
              });
            }
          } else {
            const metrics = parseDailyMetricsExcel(input.base64);
            if (metrics.length === 0) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Excel sem linhas validas para importar",
              });
            }

            for (const metric of metrics) {
              const values = {
                closingDate: metric.closingDate,
                totalOrders: metric.totalOrders,
                totalDeliveredOrders: metric.totalDeliveredOrders,
                totalCancelledOrders: metric.totalCancelledOrders,
                grossRevenue: metric.grossRevenue.toString(),
                platformCommissions: metric.platformCommissions.toString(),
                extraFees: metric.extraFees.toString(),
                productCosts: metric.storeCostTotal.toString(),
                deliveryCosts: metric.driverCostTotal.toString(),
                packagingCosts: metric.packagingCosts.toString(),
                discounts: metric.discounts.toString(),
                refunds: metric.refunds.toString(),
                totalNetMargin: metric.totalNetMargin.toString(),
                netMarginPercent: metric.netMarginPercent.toString(),
                ordersWithLoss: metric.ordersWithLoss,
                averageDelayMinutes: metric.averageDelayMinutes,
                onTimeDeliveryPercent: metric.onTimeDeliveryPercent.toString(),
              };

              await db.insert(dailyClosings).values(values).onDuplicateKeyUpdate({
                set: values,
              });
            }
          }
        }

        const summary = {
          ...imported,
          importId,
          fileName: input.fileName,
          importedAt,
        };

        const storageKey =
          imported.reportType === "orders_report"
            ? "excel_ingest:orders_report"
            : imported.reportType === "drivers_report"
              ? "excel_ingest:drivers_report"
              : "excel_ingest:restitution_summary";

        await db
          .insert(systemSettings)
          .values({
            key: "excel_ingest:last_result",
            value: JSON.stringify(summary),
            description: "Ultimo resumo de importacao via Excel",
          })
          .onDuplicateKeyUpdate({
            set: {
              value: JSON.stringify(summary),
              description: "Ultimo resumo de importacao via Excel",
              updatedAt: new Date(),
            },
          });

        await db
          .insert(systemSettings)
          .values({
            key: storageKey,
            value: JSON.stringify(summary),
            description: `Resumo de importacao ${imported.reportType}`,
          })
          .onDuplicateKeyUpdate({
            set: {
              value: JSON.stringify(summary),
              description: `Resumo de importacao ${imported.reportType}`,
              updatedAt: new Date(),
            },
          });

        const catalogSetting = await getSystemSetting("excel_ingest:catalog");
        const catalog = catalogSetting?.value ? JSON.parse(catalogSetting.value) : [];
        const nextCatalog = [
          summary,
          ...((Array.isArray(catalog) ? catalog : []).filter((item: any) => item?.importId !== importId)),
        ].slice(0, 50);

        await db
          .insert(systemSettings)
          .values({
            key: "excel_ingest:catalog",
            value: JSON.stringify(nextCatalog),
            description: "Historico de importacoes via Excel",
          })
          .onDuplicateKeyUpdate({
            set: {
              value: JSON.stringify(nextCatalog),
              description: "Historico de importacoes via Excel",
              updatedAt: new Date(),
            },
          });

        return summary;
      }),
  }),

  // ============ SYSTEM SETTINGS ============
  settings: router({
    getAll: protectedProcedure.query(async () => {
      return await getAllSystemSettings();
    }),

    get: protectedProcedure
      .input(z.object({ key: z.string() }))
      .query(async ({ input }) => {
        return await getSystemSetting(input.key);
      }),

    set: protectedProcedure
      .input(
        z.object({
          key: z.string(),
          value: z.string(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const existing = await getSystemSetting(input.key);

        if (existing) {
          const result = await db
            .update(systemSettings)
            .set({
              value: input.value,
              description: input.description,
              updatedAt: new Date(),
            })
            .where(eq(systemSettings.key, input.key));
          return result;
        } else {
          const result = await db
            .insert(systemSettings)
            .values({
              key: input.key,
              value: input.value,
              description: input.description,
              createdAt: new Date(),
            });
          return result;
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
