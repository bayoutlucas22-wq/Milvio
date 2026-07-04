# C4 Diagram - Ze Delivery Profit System

This diagram describes what was built to help a store owner understand real profit from Ze Delivery reports.

## 1. System Context

```mermaid
flowchart LR
  Owner[Store Owner / Depot Owner]
  Clerk[Store Operator]
  ZeDelivery[Ze Delivery / Ambev Platform]
  ExcelFiles[XLS Reports]
  ProfitSystem[Delivery Margin Control]

  Owner -->|wants to understand profit| ProfitSystem
  Clerk -->|imports files and checks status| ProfitSystem
  ZeDelivery -->|generates sales and operational reports| ExcelFiles
  ExcelFiles -->|orders, drivers, restitution, closing| ProfitSystem
  ProfitSystem -->|shows profit, margin, costs, and actions| Owner
```

## 2. Container Diagram

```mermaid
flowchart LR
  subgraph Browser["Client Browser"]
    UI["React UI\nHome + Owner page"]
  end

  subgraph Backend["Node/Express Backend"]
    API["tRPC API"]
    Ingest["Excel parsing + normalization"]
    Profit["Owner dashboard model"]
    Exec["Executive summary builder"]
  end

  subgraph Storage["MySQL"]
    DB[(Normalized import tables\nDaily closings\nSystem settings)]
  end

  UI -->|queries and actions| API
  API --> Ingest
  API --> Profit
  API --> Exec
  Ingest -->|save normalized rows| DB
  Exec -->|read daily closings| DB
  Profit -->|read imported summaries| DB
  UI -->|renders lucro real or base parcial| OwnerView["Owner view"]
```

## 3. Component Diagram

```mermaid
flowchart TB
  subgraph UI["React Frontend"]
    HomePage["Home page\nfull operational dashboard"]
    OwnerPage["Owner page\nsimple profit explanation"]
    ImportToggle["Import selector toggle"]
    ReadingBanner["Lucro real / Base parcial banner"]
  end

  subgraph Server["Server"]
    ParseWorkbook["parseWorkbookImport()"]
    ParseRows["extractNormalizedImportRows()"]
    PersistImport["persistImportedWorkbook()"]
    ImportedSummaries["getLatestImportedSummaries()"]
    ExecSummary["getExecutiveSummary()"]
    OwnerModel["buildOwnerDashboardModel()"]
    OwnerRec["buildOwnerRecommendations()"]
  end

  subgraph DB["MySQL"]
    Batches["importBatches"]
    OrderRows["importOrderRows"]
    DriverRows["importDriverRows"]
    RestRows["importRestitutionRows"]
    Closings["dailyClosings"]
  end

  HomePage --> ImportToggle
  HomePage --> ReadingBanner
  OwnerPage --> ReadingBanner
  HomePage --> ImportedSummaries
  OwnerPage --> ImportedSummaries
  HomePage --> ExecSummary
  OwnerPage --> ExecSummary

  ParseWorkbook --> PersistImport
  ParseRows --> PersistImport
  PersistImport --> Batches
  PersistImport --> OrderRows
  PersistImport --> DriverRows
  PersistImport --> RestRows

  ImportedSummaries --> OwnerModel
  ExecSummary --> OwnerModel
  OwnerModel --> OwnerRec
  ExecSummary --> Closings
```

## 4. What changed in the system

- Excel files are now stored as normalized batches in MySQL.
- The dashboard no longer trusts empty zero objects before imported data.
- The owner page uses a simple reading mode:
  - `Conta fechada`
  - `Conta incompleta`
- The app explains profit in plain language:
  - money in
  - money out
  - money left
- The owner sees the business through one lens:
  - revenue
  - cost
  - loss
  - profit
  - next action

## 5. Main business rule

```text
lucro = dinheiro que entra - gastos - perdas
```

If an essential file is missing, the system shows a partial view instead of fake zero values.

