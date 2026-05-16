import type { GuatecomprasRecord } from '../../ocds/index.js';

/**
 * Realistic `GuatecomprasRecord` fixture derived from the observed May 2026
 * Guatecompras data (see `planning/assets/guatecompras_schema_report.md`).
 *
 * Kept intentionally small but exercises every normalizer branch:
 * - 3 parties: a buyer (`GT-NIT-4132726`), a supplier that is a company via
 *   `legalEntityTypeDetail.description: 'SOCIEDAD ANÓNIMA'`
 *   (`GT-NIT-7894880`), and an individual supplier whose
 *   `legalEntityTypeDetail.description` is the bare word `'INDIVIDUAL'`
 *   (`GT-NIT-15856801`) — the data-expert's regression case.
 * - `bids.details[]` with one `valid` and one `disqualified` entry so
 *   `bidCounts` reconstruction is testable; `tendererId` is the RAW
 *   `tenderers[0].id` (NOT canonicalized).
 * - 1 award with `suppliers[].id` (raw) → `supplierIds[]`.
 * - 1 contract with `documents[]` (length → `documentsCount`).
 * - 2 tender items with 8-digit UNSPSC `classification.id` plus one item with
 *   a too-short id (`'81'`) to exercise the `< 4` UNSPSC guard.
 * - `tender.documents[]` (dropped → `documentsSummary`).
 *
 * The `parties[].id` strings are the verbatim join keys: `awards[].suppliers
 * [].id` and `bids.details[].tenderers[].id` reuse the SAME strings.
 */
export const compiledReleaseFixture: GuatecomprasRecord = {
  ocid: 'ocds-xqjsxa-30319447',
  releases: [
    {
      url: 'https://ocds.guatecompras.gt/release/GT-NOG-30319447-T1',
      date: '2026-04-04T10:52:10-06:00',
      tag: ['tender'],
    },
    {
      url: 'https://ocds.guatecompras.gt/release/GT-NOG-30319447-T2',
      date: '2026-04-05T12:09:14-06:00',
      tag: ['award'],
    },
  ],
  compiledRelease: {
    ocid: 'ocds-xqjsxa-30319447',
    date: '2026-04-05T12:09:14-06:00',
    publishedDate: '2026-04-06T01:00:28-06:00',
    language: 'es',
    tag: ['compiled'],
    initiationType: 'tender',
    parties: [
      {
        identifier: { scheme: 'GT-NIT', id: '4132726' },
        address: {
          streetAddress: '5a. CALLE 7-31 ZONA 1',
          locality: 'SAN PEDRO CARCHA',
          region: 'ALTA VERAPAZ',
          countryName: 'GUATEMALA',
        },
        contactPoint: {
          name: 'MUNICIPALIDAD DE SAN PEDRO CARCHA, ALTA VERAPAZ',
          email: 'municarcha@municarcha.gob.gt',
          telephone: '77904141',
        },
        roles: ['buyer'],
        details: {
          entityType: { id: '6', description: 'Gobiernos Locales' },
          type: { id: '1', description: 'Sector Público' },
          level: { id: '59', description: 'Municipalidad' },
        },
        id: 'GT-NIT-4132726',
        name: 'MUNICIPALIDAD DE SAN PEDRO CARCHA, ALTA VERAPAZ',
      },
      {
        identifier: { scheme: 'GT-NIT', id: '7894880' },
        address: {
          streetAddress: 'Vía 4 1-00 zona 4',
          locality: 'GUATEMALA',
          region: 'GUATEMALA',
          countryName: 'GUATEMALA',
        },
        contactPoint: { name: 'CONSTRUCTORA EJEMPLO, S.A.' },
        roles: ['tenderer', 'supplier'],
        details: {
          legalEntityTypeDetail: { id: '2', description: 'SOCIEDAD ANÓNIMA' },
        },
        id: 'GT-NIT-7894880',
        name: 'CONSTRUCTORA EJEMPLO, S.A.',
      },
      {
        identifier: { scheme: 'GT-NIT', id: '15856801' },
        roles: ['tenderer'],
        details: {
          legalEntityTypeDetail: { id: '0', description: 'INDIVIDUAL' },
        },
        id: 'GT-NIT-15856801',
        name: 'DE LEON,MALDONADO,,CESAR,AUGUSTO',
      },
    ],
    buyer: {
      id: 'GT-NIT-4132726',
      name: 'MUNICIPALIDAD DE SAN PEDRO CARCHA, ALTA VERAPAZ',
    },
    bids: {
      details: [
        {
          date: '2026-04-04T10:41:49-06:00',
          status: 'valid',
          value: { amount: 92000.5, currency: 'GTQ' },
          tenderers: [{ id: 'GT-NIT-7894880', name: 'CONSTRUCTORA EJEMPLO, S.A.' }],
          id: 'B3C8D0DE45A74B75F6B962BC43837059',
        },
        {
          date: '2026-04-04T11:05:12-06:00',
          status: 'disqualified',
          value: { amount: 88000.0, currency: 'GTQ' },
          tenderers: [{ id: 'GT-NIT-15856801', name: 'DE LEON,MALDONADO,,CESAR,AUGUSTO' }],
          id: '95AB9BED0CE9E7282C405DBE5AFAD474',
        },
      ],
    },
    tender: {
      title: 'ARRENDAMIENTO DE BIEN INMUEBLE A PNC',
      status: 'complete',
      statusDetails: 'Adjudicado',
      datePublished: '2026-04-01T18:24:01-06:00',
      procuringEntity: {
        id: 'GT-NIT-4132726',
        name: 'MUNICIPALIDAD DE SAN PEDRO CARCHA, ALTA VERAPAZ',
      },
      items: [
        {
          description: 'ARRENDAMIENTO DE BIEN INMUEBLE',
          classification: { scheme: 'UNSPSC', id: '80131500' },
          quantity: 1,
          unit: { name: 'Unidad' },
          attributes: [
            {
              value: 'Obligatorio salvo excepciones',
              id: 'BB6D206D752A683E1F040A25EECA609A',
              name: 'Tipo de obligatoriedad',
            },
          ],
          id: '8C223BF10DDB5B4D89014B250FC2B7CC',
        },
        {
          description: 'SERVICIO COMPLEMENTARIO',
          classification: { scheme: 'UNSPSC', id: '43221724' },
          quantity: 2,
          unit: { name: 'Unidad' },
          attributes: [],
          id: '9C74C916C2EB380B38BA22679AFDA5DE',
        },
        {
          // UNSPSC guard case: id length < 4 → excluded from itemFamilies.
          description: 'ITEM CON CLASIFICACION CORTA',
          classification: { scheme: 'UNSPSC', id: '81' },
          quantity: 1,
          unit: { name: 'Unidad' },
          attributes: [],
          id: 'B03D6E1CA64A984581352ECFA32262E8',
        },
      ],
      procurementMethod: 'open',
      procurementMethodDetails: 'Arrendamiento o Adquisición de Bienes Inmuebles (Art.43 inciso e)',
      mainProcurementCategory: 'services',
      submissionMethod: ['electronicSubmission'],
      tenderPeriod: {
        startDate: '2026-04-01T18:24:01-06:00',
        endDate: '2026-04-04T15:43:45-06:00',
      },
      numberOfTenderers: 2,
      tenderers: [
        { id: 'GT-NIT-7894880', name: 'CONSTRUCTORA EJEMPLO, S.A.' },
        { id: 'GT-NIT-15856801', name: 'DE LEON,MALDONADO,,CESAR,AUGUSTO' },
      ],
      documents: [
        {
          documentType: 'purchaseRequest',
          title: 'Boleta de SNIP',
          url: 'http://www.guatecompras.gt/concursos/files/6020/30319447@SNIP.pdf',
          format: 'application/pdf',
          language: 'es',
          datePublished: '2026-04-01T18:24:01-06:00',
          documentTypeDetails: 'Boleta de SNIP',
          id: '2E87B45BF7E1D4D939AB69772FD850CA',
        },
        {
          documentType: 'tenderNotice',
          title: 'Convocatoria',
          url: 'http://www.guatecompras.gt/concursos/files/6020/30319447@Conv.pdf',
          format: 'application/pdf',
          language: 'es',
          datePublished: '2026-04-02T09:00:00-06:00',
          documentTypeDetails: 'Convocatoria',
          id: '348C6584EE8FEEE9629E3CC2CFB2EEFF',
        },
      ],
      id: 'GT-NOG-30319447',
    },
    awards: [
      {
        title: 'ARRENDAMIENTO DE BIEN INMUEBLE A PNC',
        status: 'active',
        statusDetails: 'Habilitado',
        date: '2026-04-05T12:09:14-06:00',
        value: { amount: 92000.5, currency: 'GTQ' },
        suppliers: [{ id: 'GT-NIT-7894880', name: 'CONSTRUCTORA EJEMPLO, S.A.' }],
        id: 'GT-ADJ-30319447-7894880',
      },
    ],
    contracts: [
      {
        id: 'NOG-30319447-CON-235C01B1A23BE57A602396D313FBEDA8',
        awardID: 'GT-ADJ-30319447-7894880',
        title: 'ARRENDAMIENTO DE BIEN INMUEBLE A PNC',
        status: 'active',
        statusDetails: 'Adjudicado',
        period: {
          startDate: '2026-05-01T00:00:00-06:00',
          endDate: '2026-12-31T00:00:00-06:00',
        },
        value: { amount: 92000.5, currency: 'GTQ' },
        dateSigned: '2026-04-27T00:00:00-06:00',
        contractNumber: 'DAJ-040-2026',
        documents: [
          {
            documentType: 'contractSigned',
            title: 'Suscripción de contrato',
            url: 'http://www.guatecompras.gt/concursos/files/6065/30319447@CONTRATO.pdf',
            format: 'application/pdf',
            language: 'es',
            datePublished: '2026-05-01T00:00:00-06:00',
            id: '3AE9D04C4CF1A9118803A5575D32963A',
          },
        ],
      },
    ],
    sources: [
      {
        url: 'https://www.guatecompras.gt',
        id: 'GUATECOMPRAS',
        name: 'Sistema de Información de Contrataciones y Adquisiciones del Estado',
      },
    ],
    dataSegmentation: {
      criteria: ['añoPublicaciónConvocatoria', 'mesPublicaciónConvocatoria'],
      id: '2026-04',
    },
    id: 'ocds-xqjsxa-30319447-2026-04-05T12:09:14-06:00',
  },
};

/**
 * A second fixture with `compiledRelease.parties` ABSENT (the observed 0.52%
 * case) and no `bids`/`contracts`. Used to test the empty-parties-map
 * fall-through (raw supplier ids, raw entity ids) and sparsity defaults.
 */
export const noPartiesRecordFixture: GuatecomprasRecord = {
  ocid: 'ocds-xqjsxa-30097630',
  releases: [
    {
      url: 'https://ocds.guatecompras.gt/release/GT-NOG-30097630-T1',
      date: '2026-04-01T17:33:34-06:00',
      tag: ['tender'],
    },
  ],
  compiledRelease: {
    ocid: 'ocds-xqjsxa-30097630',
    date: '2026-04-01T17:33:34-06:00',
    publishedDate: '2026-04-02T01:00:33-06:00',
    language: 'es',
    tag: ['compiled'],
    initiationType: 'tender',
    // parties intentionally absent
    buyer: {
      id: 'GT-NIT-2455404',
      name: 'INSTITUTO NACIONAL DE ELECTRIFICACIÓN -INDE',
    },
    tender: {
      title: 'MEJORAMIENTO ESCUELA PRIMARIA',
      status: 'active',
      statusDetails: 'Vigente',
      datePublished: '2026-04-01T17:33:32-06:00',
      procuringEntity: {
        id: 'GT-NIT-2455404',
        name: 'INSTITUTO NACIONAL DE ELECTRIFICACIÓN -INDE',
      },
      items: [
        {
          description: 'MEJORAMIENTO ESCUELA',
          classification: { scheme: 'UNSPSC', id: '72141003' },
          quantity: 1,
          unit: { name: 'Unidad' },
          attributes: [],
          id: 'AAA111',
        },
      ],
      procurementMethod: 'open',
      procurementMethodDetails: 'Licitación Pública (Art. 17 LCE)',
      // mainProcurementCategory intentionally absent (~0.24% case)
      submissionMethod: ['electronicSubmission'],
      tenderPeriod: {
        startDate: '2026-04-01T17:33:32-06:00',
        // endDate intentionally absent (~75% case)
      },
      numberOfTenderers: 0,
      documents: [],
      id: 'GT-NOG-30097630',
    },
    awards: [
      {
        title: 'MEJORAMIENTO ESCUELA',
        status: 'active',
        statusDetails: 'Habilitado',
        date: '2026-04-10T09:00:00-06:00',
        value: { amount: 150000.0, currency: 'GTQ' },
        suppliers: [
          { id: 'GT-GCID-CO-0D13D3EE908F02969DED73509B7566AB', name: 'PROVEEDOR SIN PARTY' },
        ],
        id: 'GT-ADJ-30097630-1',
      },
    ],
    sources: [
      {
        url: 'https://www.guatecompras.gt',
        id: 'GUATECOMPRAS',
        name: 'Sistema de Información de Contrataciones y Adquisiciones del Estado',
      },
    ],
    dataSegmentation: {
      criteria: ['añoPublicaciónConvocatoria', 'mesPublicaciónConvocatoria'],
      id: '2026-04',
    },
    id: 'ocds-xqjsxa-30097630-2026-04-01T17:33:34-06:00',
  },
};
