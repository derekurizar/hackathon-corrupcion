# Open Contract Newsroom: Turning OCDS Contracts into Investigative Stories

## 1. Core Idea

The project is an automated investigation and storytelling system that analyzes open contracting data, detects unusual patterns, and turns those findings into interactive journalistic articles.

Instead of only generating a news article from a public contract, the system first identifies anomalies, red flags, and outliers. Then it uses those findings as the foundation for a data-driven story.

The best way to describe it is:

> **A system that analyzes OCDS contract data, detects unusual public procurement patterns, and generates explainable journalistic stories with interactive visuals, animations, and podcast narration.**

This should not be positioned as:

> “An AI that proves corruption.”

A stronger and safer positioning is:

> **“An AI-powered investigation engine that detects risk signals and generates stories worth investigating.”**

The system does not make legal accusations. It highlights patterns that may deserve journalistic, civic, or institutional review.

---

## 2. Why This Is Strong

This idea has strong potential because it combines:

- Open public data
- Civic technology
- Data analysis
- AI-generated storytelling
- Interactive journalism
- Motion design
- Audio narration
- Transparency and explainability

Most people cannot read or understand raw public procurement data. OCDS datasets are structured, but they are often technical, large, and difficult for citizens, journalists, and even public officials to interpret quickly.

This system solves that by transforming data like this:

```json
{
  "buyer": "Ministry X",
  "supplier": "Company Y",
  "value": 2500000,
  "tender": "...",
  "awards": "...",
  "contracts": "..."
}
```

Into a story like this:

> “Ministry X awarded a Q2.5 million contract to Company Y through a process with low competition. The contract presents three review signals: unusually high value, supplier concentration, and limited tender participation.”

The system then presents the story through:

- An animated journalistic article
- A timeline of the procurement process
- Supplier-buyer relationship graphs
- Price comparisons
- Red flag cards
- Evidence panels
- Source traceability
- Podcast narration powered by ElevenLabs

The main value is not simply “AI writes news.” The value is:

> **Automated detection of unusual public procurement patterns, transformed into explainable multimedia journalism.**

---

## 3. Product Positioning

### Short Pitch

> **Open Contract Newsroom converts public procurement data into investigative stories. It analyzes OCDS contracts, detects unusual patterns such as overpricing, supplier concentration, low competition, contract splitting, and suspicious amendments, then generates an interactive article with evidence, visualizations, motion design, and podcast narration.**

### Safer Public-Facing Positioning

The system should use phrases like:

- “Risk signals”
- “Review signals”
- “Unusual patterns”
- “Contracts worth reviewing”
- “Potential procurement risks”
- “Indicators that deserve investigation”

Avoid phrases like:

- “This is corruption”
- “This supplier is corrupt”
- “This contract is illegal”
- “The system detected fraud”

A good framing is:

> **The system does not prove corruption. It helps identify contracts and patterns that deserve further review.**

---

## 4. Main Workflow

```txt
OCDS Data / Public Procurement Dataset
        ↓
Data Ingestion
        ↓
Normalization & Entity Resolution
        ↓
Red Flag and Outlier Detection Engine
        ↓
Story Angle Generator
        ↓
Interactive Article Generator
        ↓
Podcast Mode / Narrated Version
```

The system should not start by writing. It should start by analyzing.

The best workflow is:

1. Ingest OCDS data.
2. Normalize buyers, suppliers, values, dates, categories, and documents.
3. Detect unusual patterns and risk signals.
4. Score or prioritize the most relevant findings.
5. Generate a story angle based on the strongest signals.
6. Create an interactive article.
7. Generate a narrated podcast version.
8. Show all evidence and source fields used.

---

## 5. Types of Patterns and Red Flags to Detect

## 5.1 Overpriced or Unusually Expensive Contracts

The system should detect contracts whose amount is unusually high compared to similar contracts.

### Examples

- A contract is 5x higher than the median of similar purchases.
- A buyer pays significantly more than other institutions for the same category.
- A supplier receives an unusually large contract compared to its previous awards.
- A contract value is far above the usual range for that procurement category.
- The amount is high compared to contracts from the same year, region, or item classification.

### Possible OCDS Fields

```ts
tender.value.amount
awards[].value.amount
contracts[].value.amount
items[].classification
buyer.id
date
```

### Possible Story Angle

> “A contract awarded by Ministry X is significantly higher than comparable contracts in the same category.”

---

## 5.2 Supplier Concentration

This is one of the strongest patterns.

The system should detect when one supplier wins a very high percentage of contracts or contract value from the same buyer.

### Examples

- One company wins 70% of a buyer’s contracts.
- One supplier receives most of the high-value awards from one institution.
- A supplier repeatedly wins contracts in the same category.
- A supplier wins most contracts where there is low competition.
- A company suddenly receives a large volume of public contracts.

### Possible OCDS Fields

```ts
awards[].suppliers[]
buyer.id
awards[].value.amount
tender.numberOfTenderers
tender.procurementMethod
```

### Possible Story Angle

> “A single supplier concentrates most of the awarded value from this institution.”

---

## 5.3 Low Competition

The system should detect contracts where competition appears weak.

### Examples

- Only one tenderer participated.
- The same company often wins when there is only one bidder.
- Several high-value contracts have very few participants.
- The same small group of companies appears repeatedly.
- Open procedures appear competitive on paper but have minimal real participation.

### Possible OCDS Fields

```ts
tender.numberOfTenderers
tender.tenderers[]
awards[].suppliers[]
tender.procurementMethod
```

### Possible Story Angle

> “The contract was awarded through a process with limited competition.”

---

## 5.4 Direct Awards or Low-Competition Procurement Methods

The system should detect frequent or unusual use of non-competitive procurement methods.

### Examples

- A buyer uses direct awards more often than similar institutions.
- A high-value contract is awarded through a limited or direct process.
- One supplier receives many contracts through non-open procedures.
- A category that usually has open competition is repeatedly awarded directly.

### Possible OCDS Fields

```ts
tender.procurementMethod
tender.procurementMethodDetails
buyer.id
awards[].suppliers[]
```

### Possible Story Angle

> “The institution used a low-competition procurement method for a high-value contract.”

---

## 5.5 Contract Splitting

Contract splitting is a very powerful pattern for investigative journalism.

The system should detect multiple similar contracts issued close together, possibly to avoid procurement thresholds.

### Examples

- Ten contracts of Q89,000 each appear when the public bidding threshold is Q90,000.
- Several contracts have similar descriptions, same buyer, same supplier, and close dates.
- Multiple small contracts together represent a large total amount.
- Contracts are divided by location, item, or date but appear to serve the same purpose.

### Possible OCDS Fields

```ts
buyer.id
awards[].suppliers[].id
items[].classification.id
items[].description
contracts[].value.amount
date
```

### Possible Story Angle

> “Several similar contracts were awarded separately to the same supplier within a short period, together adding up to a significant amount.”

---

## 5.6 Contract Amendments and Cost Increases

The system should detect contracts that increase significantly after award.

### Examples

- A contract was awarded for Q1 million but later increased to Q2.3 million.
- A contract has many amendments.
- The delivery period was extended several times.
- The final cost is much higher than the original awarded value.
- The contract changes significantly after being signed.

### Possible OCDS Fields

```ts
contracts[].value.amount
contracts[].amendments[]
contracts[].period
implementation.transactions[]
releases[].date
```

### Possible Story Angle

> “The contract ended up costing significantly more than originally awarded.”

---

## 5.7 Suspiciously Short Timelines

The system should detect processes with unusually short time windows.

### Examples

- A tender was published and closed in very few days.
- A contract was awarded almost immediately after publication.
- The time between tender close and award was unusually short.
- A complex or high-value contract had little time for companies to prepare bids.

### Possible OCDS Fields

```ts
tender.tenderPeriod.startDate
tender.tenderPeriod.endDate
awards[].date
contracts[].dateSigned
```

### Possible Story Angle

> “The procurement process gave suppliers very little time to submit bids.”

---

## 5.8 Suppliers Winning Across Unrelated Categories

The system should detect suppliers that win contracts in many unrelated categories.

### Examples

- A company wins contracts for medicine, construction, food, and software.
- A supplier appears in many categories without a clear specialization.
- A company receives contracts in sectors that seem disconnected from its usual activity.
- A supplier suddenly expands into multiple public procurement categories.

### Possible OCDS Fields

```ts
awards[].suppliers[].id
items[].classification
items[].description
```

### Possible Story Angle

> “The supplier appears across several unrelated procurement categories.”

---

## 5.9 Buyer-Supplier Networks

The system should build a network graph between buyers, suppliers, contracts, categories, and amounts.

### Graph Structure

```txt
Institution → Supplier → Contracts → Amounts → Categories
```

### Patterns to Detect

- A small group of suppliers dominates several institutions.
- One supplier is strongly connected to one buyer.
- Multiple institutions award contracts to the same supplier.
- Suppliers appear together repeatedly as competitors.
- A network of companies repeatedly participates in the same types of procurement.

### Possible Story Angle

> “A small group of suppliers concentrates a large share of awards across multiple public institutions.”

---

## 5.10 Same Competitors, Same Winner

The system should detect patterns where the same companies compete repeatedly but the same supplier usually wins.

### Examples

- Companies A, B, and C often participate in the same tenders.
- Company A almost always wins.
- Companies B and C appear frequently but rarely win.
- The same losing bidders appear repeatedly.

### Possible OCDS Fields

```ts
tender.tenderers[]
awards[].suppliers[]
```

### Possible Story Angle

> “The same group of bidders appears in multiple processes, but the winner is usually the same company.”

---

## 5.11 Missing or Weak Documentation

The system should detect contracts with missing or incomplete documentation.

### Examples

- No contract document is attached.
- No award document is available.
- No technical evaluation is published.
- No implementation documents are present.
- Important documents are published late.
- The contract has documents, but they are incomplete or vague.

### Possible OCDS Fields

```ts
documents[]
documents[].documentType
documents[].datePublished
```

### Possible Story Angle

> “The process has limited public documentation for a contract of this size.”

---

## 5.12 Repeated Emergency or Urgent Procurement

Urgent procurement can be legitimate, but repeated use can be worth reviewing.

### Examples

- A buyer frequently uses emergency procurement.
- Similar goods are repeatedly purchased through exception procedures.
- One supplier receives many urgent contracts.
- Emergency justifications are vague or repeated.

### Possible OCDS Fields

```ts
tender.procurementMethod
tender.procurementMethodDetails
tender.description
```

### Possible Story Angle

> “The institution repeatedly used urgent or exceptional procedures for similar purchases.”

---

## 6. Red Flag Detection Engine

Each contract should be analyzed and assigned signals.

A possible data structure:

```ts
type ContractSignal = {
  signal_id: string;
  title: string;
  severity: "low" | "medium" | "high";
  confidence: number;
  explanation: string;
  evidence: {
    field: string;
    value: unknown;
    comparison?: string;
    benchmark?: unknown;
  }[];
  story_angle: string;
};
```

### Example Signal

```json
{
  "signal_id": "supplier_concentration",
  "title": "High supplier concentration",
  "severity": "high",
  "confidence": 0.86,
  "explanation": "The supplier concentrates 64% of the awarded value from this institution in 2025.",
  "evidence": [
    {
      "field": "awards.suppliers.id",
      "value": "supplier_123"
    },
    {
      "field": "awards.value.amount",
      "value": 12500000,
      "comparison": "64% of the buyer's total awarded amount"
    }
  ],
  "story_angle": "One company concentrates most of the awards from this institution."
}
```

---

## 7. Risk Scoring

The system can calculate a general risk score, but for it should remain explainable.

A possible formula:

```txt
risk_score =
  price_outlier_score * 0.25 +
  supplier_concentration_score * 0.25 +
  low_competition_score * 0.20 +
  contract_changes_score * 0.15 +
  documentation_risk_score * 0.15
```

However, the demo should avoid presenting the score as a legal conclusion.

A better presentation:

```txt
High Review Priority:
- Unusually high contract value
- Single tenderer
- Recurrent supplier
- Low-competition procurement method
```

This is easier to explain and more defensible.

---

## 8. Story Generation Layer

The AI should not invent the story angle. The detection engine should provide the evidence first.

The AI receives a structured summary like this:

```json
{
  "main_angle": "Supplier concentration in high-value awards",
  "signals": [
    "supplier_concentration",
    "low_competition",
    "price_outlier"
  ],
  "buyer": "Ministry X",
  "supplier": "Company Y",
  "contract_value": 8200000,
  "currency": "GTQ",
  "evidence": [
    "Company Y won 8 of 11 similar contracts",
    "The contract is 4.6x above the median of comparable contracts",
    "The process had only one tenderer"
  ],
  "caveat": "These signals do not prove corruption; they indicate that the contract may deserve review."
}
```

Then it generates a story like:

> **Company Concentrates High-Value Contracts in Low-Competition Processes**  
> A review of open contracting data shows that Company Y received 8 of 11 similar awards made by Ministry X during 2025. The most recent contract, valued at Q8.2 million, is significantly higher than the typical value observed in comparable purchases.  
>
> The system identified three review signals: supplier concentration, low competition, and an unusually high amount. These signals do not prove wrongdoing, but they raise questions that may deserve further investigation.

---

## 9. Interactive Article Structure

The article should not look like a plain blog post. It should feel like an interactive investigation.

## 9.1 Hero Section

Content:

- Main headline
- Contract value
- Buyer
- Supplier
- Risk or review level
- Short summary

Example:

> “Q8.2M Contract Awarded to Recurrent Supplier in Low-Competition Process”

Visual style:

- Big editorial headline
- Animated number counter
- Subtle motion background
- Public-data aesthetic
- Strong but serious visual tone

---

## 9.2 Procurement Timeline

Show the process from start to finish:

```txt
Tender Published → Tender Closed → Award Issued → Contract Signed → Amendments → Implementation
```

Each stage can include:

- Date
- Delay
- Missing information
- Important documents
- Detected signals

---

## 9.3 Buyer-Supplier Relationship Graph

Show how the institution and supplier are connected.

Possible visual:

```txt
Ministry X
   ↓
Company Y
   ↓
14 contracts
   ↓
Q18.4M total awarded
```

The graph can also show other suppliers and comparison values.

---

## 9.4 Price Comparison

Show how the contract compares with others.

Examples:

- Contract value vs category median
- Contract value vs previous contracts from the same buyer
- Contract value vs supplier’s historical average
- Contract value vs similar items

Possible copy:

> “This contract is 4.6x higher than the median value of similar contracts in the dataset.”

---

## 9.5 Review Signal Cards

Each card should show one signal clearly.

Example cards:

- **Single Tenderer**  
  Only one supplier participated in the process.

- **Supplier Concentration**  
  The same supplier received 64% of the awarded value from this buyer.

- **Unusual Amount**  
  The contract is above the normal range for similar purchases.

- **Missing Documents**  
  Key documents were not available in the public record.

---

## 9.6 Evidence Panel

This is one of the most important sections.

Each claim should show the source field used.

Example:

```txt
Claim:
“The supplier concentrates most awards from this institution.”

Evidence:
- 14 contracts awarded to the supplier
- Q18.4M total awarded
- 62% of the buyer’s total amount in this category
- Fields used: awards.suppliers, awards.value, buyer.id
```

This makes the system explainable and trustworthy.

---

## 9.7 Podcast Mode

The user can click:

> “Listen to this investigation”

The system generates a short narrated version using ElevenLabs.

Possible script:

> “Today we analyze a public contract awarded by Ministry X to Company Y. The contract is valued at Q8.2 million. The system identified three review signals: low competition, supplier concentration, and an amount above comparable contracts. These signals do not prove corruption, but they raise questions about competition, transparency, and public spending.”

Podcast options:

- 60-second summary
- 3-minute deep dive
- Neutral narrator voice
- Investigative journalism tone
- Spanish and English versions

---

## 10. MVP

Do not try to build everything.

The MVP should focus on six strong detection modules:

1. Unusually high contract value
2. Supplier concentration
3. Single tenderer or low competition
4. Low-competition procurement method
5. Contract splitting or repeated similar contracts
6. Contract amendments or cost increases

These are enough to generate powerful stories.

## MVP Flow

```txt
User uploads or selects an OCDS dataset
        ↓
System normalizes the data
        ↓
System detects the top risk signals
        ↓
System selects the strongest story angle
        ↓
System generates an interactive article
        ↓
User activates Podcast Mode
        ↓
System shows evidence and source fields
```

---

## 11. Feature 

The strongest feature is:

> **Explainable Investigation Mode**

This means every generated sentence can be traced back to data.

Example:

```txt
Generated claim:
“The company concentrates contracts from this institution.”

Evidence:
- 14 contracts awarded to the company
- Q18.4M accumulated value
- 62% of the institution’s total awarded value in this category
- Source fields: awards.suppliers, awards.value, buyer.id
```

This separates the product from a generic AI writer.

It becomes:

> **A transparent investigation assistant, not just a text generator.**

---

## 12. Suggested Technical Architecture

## Frontend

Recommended tools:

- Next.js
- React
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Recharts
- React Flow
- Mapbox or Leaflet if location data is available

## Backend

Recommended tools:

- Node.js or Python
- OpenAI or another LLM for story generation
- ElevenLabs for narration
- PostgreSQL, MongoDB, or DuckDB for analysis
- Background jobs for dataset processing

## Data Processing

Suggested modules:

```txt
OCDS Parser
Entity Normalizer
Supplier Resolver
Buyer Resolver
Currency Normalizer
Date Normalizer
Category Classifier
Outlier Detector
Red Flag Detector
Story Generator
Audio Generator
Evidence Mapper
```

---

## 13. Example Internal Data Model

```ts
type AnalyzedContract = {
  contract_id: string;
  buyer: {
    id: string;
    name: string;
  };
  supplier: {
    id: string;
    name: string;
  };
  value: {
    amount: number;
    currency: string;
  };
  procurement_method?: string;
  tenderer_count?: number;
  category?: {
    id?: string;
    description?: string;
  };
  dates: {
    tender_start?: string;
    tender_end?: string;
    award_date?: string;
    contract_signed?: string;
  };
  signals: ContractSignal[];
  review_priority: "low" | "medium" | "high";
};
```

---

## 14. Example Generated Article Outline

```md
# Supplier Concentrates High-Value Contracts from Ministry X

## Summary

Ministry X awarded a Q8.2 million contract to Company Y. The system identified three review signals: supplier concentration, low competition, and an unusually high contract value.

## Why This Contract Was Flagged

The contract was flagged because Company Y has received a large share of awards from the same institution, the process had only one tenderer, and the amount is significantly higher than comparable contracts.

## Key Findings

1. Company Y won 8 of 11 similar contracts.
2. The contract value is 4.6x higher than the category median.
3. The process had only one tenderer.
4. The procurement method was not fully competitive.

## What This Means

These signals do not prove corruption or wrongdoing. However, they suggest that the contract may deserve further review by journalists, auditors, civil society, or public institutions.

## Evidence

- Buyer: Ministry X
- Supplier: Company Y
- Contract value: Q8.2M
- Tenderers: 1
- Supplier share: 64% of awarded value
- Fields used: buyer.id, awards.suppliers, awards.value, tender.numberOfTenderers
```

---

## 15. Important Ethical and Legal Guardrails

The system should be careful with language.

### Avoid

- “This contract is corrupt.”
- “This company committed fraud.”
- “The buyer stole money.”
- “The process was illegal.”

### Use Instead

- “This contract presents review signals.”
- “The pattern is unusual compared to similar contracts.”
- “The data suggests a concentration of awards.”
- “This finding may deserve further investigation.”
- “The system identified indicators, not proof of wrongdoing.”

This is essential because red flags are indicators, not final conclusions.

The product should help journalists ask better questions, not replace legal or investigative judgment.

---

## 16. Product Names

Possible names:

- Open Contract Newsroom
- CivicStory AI
- Public Ledger Newsroom
- Contract Lens
- Procurement Watch
- Radar Público
- Expediente Público
- Open Contract Radar
- Civic Investigation Engine
- Data to Story

A strong Spanish name fo:

> **Expediente Público**

A strong English name:

> **Open Contract Newsroom**

---

## 17. Final Pitch

> **Open Contract Newsroom is an AI-powered investigation engine for public procurement. It analyzes OCDS contract data, detects unusual patterns such as overpriced contracts, supplier concentration, low competition, contract splitting, missing documents, and suspicious amendments, then turns those findings into interactive journalistic stories with evidence, animations, visualizations, and podcast narration.**
>
> **The system does not claim to prove corruption. It identifies contracts worth reviewing and explains exactly which data points triggered each signal. This helps journalists, citizens, and public institutions understand public spending faster and investigate more effectively.**

---

## 18. One-Sentence Version

> **A system that turns open contracting data into explainable investigative stories by detecting unusual procurement patterns and presenting them through interactive journalism and podcast narration.**

---

## 19. Recommended Demo Scenario

For the demo, use a single strong example:

1. Upload a sample OCDS dataset.
2. The system detects a high-value contract.
3. It shows that the supplier won many similar contracts.
4. It detects low competition.
5. It detects that the amount is above the category median.
6. It generates a headline.
7. It creates an interactive article.
8. It shows the evidence behind each claim.
9. It plays a 60-second narrated podcast summary.

This creates a powerful demo because the audience sees the full transformation:

```txt
Raw public contract data
        ↓
Detected anomaly
        ↓
Evidence-backed story
        ↓
Interactive article
        ↓
Narrated investigation
```

---

## 20. Final Recommendation

This is a very strong idea.

The most important decision is to make the project about:

> **Detecting investigable patterns and generating explainable stories.**

Not just:

> “Generating news from contracts.”

The detection layer is what makes the idea powerful.

The storytelling layer is what makes it memorable.

The explainability layer is what makes it trustworthy.
