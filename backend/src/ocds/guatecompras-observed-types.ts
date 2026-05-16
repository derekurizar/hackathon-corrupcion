/* 
Observed TypeScript schema for 2026-05_Guatecompras.json.

Important:
- This is inferred from the uploaded May 2026 Guatecompras JSON file only.
- Optional fields use `?` when they were not present in 100% of parent objects.
- Date/time values are strings in ISO-like format with timezone offset.
- IDs are strings, even when they look numeric.
*/

export type DateTimeString = string;
export type UriString = string;
export type CurrencyCode = string;

export interface GuatecomprasPackage {
  uri: UriString;
  version: string;
  extensions: UriString[];
  publishedDate: DateTimeString;
  publisher: Publisher;
  license: UriString;
  publicationPolicy: UriString;
  records: GuatecomprasRecord[];
}

export interface Publisher {
  name: string;
  uri: UriString;
}

export interface GuatecomprasRecord {
  ocid: string;
  releases: ReleaseReference[];
  compiledRelease: CompiledRelease;
}

export interface ReleaseReference {
  url: UriString;
  date: DateTimeString;
  tag: ReleaseTag[];
}

export type ReleaseTag = 'tender' | 'award' | 'contract' | string;
export type CompiledTag = 'compiled' | string;

export interface CompiledRelease {
  ocid: string;
  date: DateTimeString;
  publishedDate: DateTimeString;
  language: string;
  tag: CompiledTag[];
  initiationType: string;
  parties?: Party[];
  buyer: OrganizationReference;
  bids?: Bids;
  tender: Tender;
  awards?: Award[];
  contracts?: Contract[];
  sources: Source[];
  dataSegmentation: DataSegmentation;
  id: string;
}

export interface OrganizationReference {
  id: string;
  name: string;
}

export interface Party {
  identifier: Identifier;
  address?: Address;
  contactPoint?: ContactPoint;
  roles: PartyRole[];
  additionalContactPoints?: AdditionalContactPoint[];
  memberOf?: OrganizationReference[];
  details?: PartyDetails;
  id: string;
  name: string;
}

export type PartyRole = 'buyer' | 'tenderer' | 'supplier' | string;

export interface Identifier {
  scheme: string;
  id: string;
}

export interface Address {
  streetAddress: string;
  locality: string;
  region: string;
  countryName: string;
}

export interface ContactPoint {
  name: string;
  email?: string;
  telephone?: string;
  faxNumber?: string;
}

export interface AdditionalContactPoint {
  name: string;
  email: string;
}

export interface PartyDetails {
  level?: IdDescription;
  entityType?: IdDescriptionOptionalDescription;
  type?: IdDescriptionOptionalDescription;
  legalEntityTypeDetail?: IdDescription;
}

export interface IdDescription {
  id: string;
  description: string;
}

export interface IdDescriptionOptionalDescription {
  id: string;
  description?: string;
}

export interface Bids {
  details: BidDetail[];
}

export interface BidDetail {
  date: DateTimeString;
  status: BidStatus;
  value: MonetaryValue;
  tenderers: OrganizationReference[];
  id: string;
}

export type BidStatus = 'valid' | string;

export interface Tender {
  title: string;
  status: TenderStatus;
  statusDetails: TenderStatusDetails;
  datePublished: DateTimeString;
  procuringEntity: OrganizationReference;
  items: TenderItem[];
  procurementMethod: ProcurementMethod;
  procurementMethodDetails: string;
  mainProcurementCategory?: MainProcurementCategory;
  additionalProcurementCategories?: MainProcurementCategory[];
  submissionMethod: SubmissionMethod[];
  tenderPeriod: TenderPeriod;
  numberOfTenderers: number;
  tenderers?: OrganizationReference[];
  documents: TenderDocument[];
  id: string;
}

export type TenderStatus = 'active' | 'complete' | 'unsuccessful' | 'withdrawn' | string;
export type TenderStatusDetails =
  | 'Evaluación'
  | 'Vigente'
  | 'Adjudicado'
  | 'Desierto'
  | 'Prescindido'
  | 'No adjudicado'
  | string;
export type ProcurementMethod = 'open' | string;
export type MainProcurementCategory = 'goods' | 'services' | 'works' | string;
export type SubmissionMethod = 'electronicSubmission' | 'written' | string;

export interface TenderPeriod {
  startDate: DateTimeString;
  endDate?: DateTimeString;
}

export interface TenderItem {
  description: string;
  classification: Classification;
  quantity: number;
  unit: Unit;
  attributes: ItemAttribute[];
  id: string;
}

export interface Classification {
  scheme: string;
  id: string;
}

export interface Unit {
  name: string;
}

export interface ItemAttribute {
  value: string;
  id: string;
  name: ItemAttributeName;
}

export type ItemAttributeName =
  | 'Tipo de obligatoriedad'
  | 'Características'
  | 'Características Adicionales'
  | string;

export interface TenderDocument {
  documentType?: string;
  title: string;
  url: UriString;
  format: string;
  language: string;
  datePublished: DateTimeString;
  documentTypeDetails: string;
  id: string;
}

export interface Award {
  title: string;
  status: AwardStatus;
  statusDetails: string;
  date: DateTimeString;
  value: MonetaryValue;
  suppliers: OrganizationReference[];
  id: string;
}

export type AwardStatus = 'active' | string;

export interface Contract {
  id: string;
  awardID: string;
  title: string;
  status: ContractStatus;
  statusDetails: string;
  period: ContractPeriod;
  value: MonetaryValue;
  dateSigned: DateTimeString;
  contractNumber: string;
  documents: ContractDocument[];
}

export type ContractStatus = 'active' | string;

export interface ContractPeriod {
  startDate: DateTimeString;
  endDate: DateTimeString;
}

export interface ContractDocument {
  documentType: string;
  title: string;
  url: UriString;
  format: string;
  language: string;
  datePublished: DateTimeString;
  id: string;
}

export interface MonetaryValue {
  amount: number;
  currency: CurrencyCode;
}

export interface Source {
  url: UriString;
  id: string;
  name: string;
}

export interface DataSegmentation {
  criteria: string[];
  id: string;
}
