import fs from "fs";
import path from "path";
import type { Express } from "express";
import swaggerUi from "swagger-ui-express";

export type OpenApiDocument = {
  openapi?: string;
  info?: {
    title?: string;
    description?: string;
    version?: string;
    [key: string]: unknown;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths?: Record<string, unknown>;
  [key: string]: unknown;
};

const OPENAPI_CANDIDATES = [
  path.resolve(process.cwd(), "docs", "openapi", "ze-seller-public-api.openapi.json"),
  path.resolve(import.meta.dirname, "..", "..", "docs", "openapi", "ze-seller-public-api.openapi.json"),
];

function readOpenApiSource() {
  const openApiPath = OPENAPI_CANDIDATES.find((candidate) => fs.existsSync(candidate));

  if (!openApiPath) {
    throw new Error(
      `Could not find the Zé Seller OpenAPI contract. Looked in: ${OPENAPI_CANDIDATES.join(", ")}`
    );
  }

  return fs.readFileSync(openApiPath, "utf8");
}

export function buildZeSwaggerDocument(baseServerUrl = "/api/ze-mock"): OpenApiDocument {
  const raw = readOpenApiSource();
  const document = JSON.parse(raw) as OpenApiDocument;
  const localServer = {
    url: baseServerUrl,
    description: "Local mock server for Swagger try-it-out",
  };

  const description = [
    document.info?.description,
    "Swagger UI is exposed locally even while the real Zé key is not configured.",
    "Use the local mock server to explore the contract without credentials.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    ...document,
    info: {
      ...document.info,
      description,
    },
    servers: [localServer, ...(document.servers ?? [])],
  };
}

export function registerSwaggerDocs(app: Express) {
  const document = buildZeSwaggerDocument();

  app.get("/api/docs/openapi.json", (_req, res) => {
    res.json(document);
  });

  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(document, {
      explorer: true,
      swaggerOptions: {
        persistAuthorization: true,
      },
    })
  );
}
