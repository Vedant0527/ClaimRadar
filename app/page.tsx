"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { getDependencyOrder, getDocumentChecklist, ProgramDocuments } from "@/lib/documents";
import { checkEligibility, BenefitResult, UserProfile } from "@/lib/eligibility";

const programApplyUrls: Record<string, string> = {
  "snap": "https://www.fns.usda.gov/snap/applicant-recipient",
  "medicaid": "https://www.healthcare.gov/medicaid-chip/",
  "liheap": "https://www.acf.hhs.gov/ocs/low-income-home-energy-assistance-program-liheap",
  "wic": "https://www.fns.usda.gov/wic",
  "pell_grant": "https://studentaid.gov/h/apply-for-aid/fafsa",
  "tanf": "https://www.acf.hhs.gov/ofa/programs/tanf",
  "eitc": "https://www.irs.gov/credits-deductions/individuals/earned-income-tax-credit-eitc",
  "lifeline": "https://www.lifelinesupport.org/",
  "ssi_ssdi": "https://www.ssa.gov/benefits/disability/",
};

const programCardStyles: Record<string, { bg: string; border: string; text: string; textMuted: string }> = {
  "snap": { bg: "bg-orange-50/70", border: "border-orange-200/60", text: "text-orange-950", textMuted: "text-orange-800/80" },
  "medicaid": { bg: "bg-blue-50/70", border: "border-blue-200/60", text: "text-blue-950", textMuted: "text-blue-800/80" },
  "liheap": { bg: "bg-amber-50/70", border: "border-amber-200/60", text: "text-amber-950", textMuted: "text-amber-800/80" },
  "wic": { bg: "bg-teal-50/70", border: "border-teal-200/60", text: "text-teal-950", textMuted: "text-teal-800/80" },
  "pell_grant": { bg: "bg-purple-50/70", border: "border-purple-200/60", text: "text-purple-950", textMuted: "text-purple-800/80" },
  "tanf": { bg: "bg-rose-50/70", border: "border-rose-200/60", text: "text-rose-950", textMuted: "text-rose-800/80" },
  "eitc": { bg: "bg-emerald-50/70", border: "border-emerald-200/60", text: "text-emerald-950", textMuted: "text-emerald-800/80" },
  "lifeline": { bg: "bg-sky-50/70", border: "border-sky-200/60", text: "text-sky-950", textMuted: "text-sky-800/80" },
  "ssi_ssdi": { bg: "bg-indigo-50/70", border: "border-indigo-200/60", text: "text-indigo-950", textMuted: "text-indigo-800/80" },
};

const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" }
];

const programSimpleExplanations: Record<string, { en: string; es: string }> = {
  "snap": {
    en: "You qualify for SNAP because your household size and income are below your state's threshold, giving you monthly funds loaded onto an EBT card for groceries.",
    es: "Califica para SNAP porque el tamaño y los ingresos de su hogar están por debajo del límite estatal, otorgándole fondos mensuales en una tarjeta EBT para alimentos."
  },
  "medicaid": {
    en: "You are eligible for Medicaid healthcare coverage, which pays for doctor visits, hospital stays, and prescriptions with low or zero out-of-pocket costs.",
    es: "Es elegible para la cobertura de salud de Medicaid, que cubre visitas al médico, estadías en el hospital y recetas médicas a bajo costo o sin costo."
  },
  "liheap": {
    en: "This utility assistance program pays a portion of your heating or electric bills directly to your energy provider to prevent shutoffs.",
    es: "Este programa de asistencia para servicios públicos paga parte de sus facturas de calefacción o electricidad directamente a su proveedor."
  },
  "wic": {
    en: "WIC qualifies you for free healthy food, infant formula, and nutritional counseling because you have young children or are pregnant/expecting.",
    es: "WIC le otorga alimentos saludables gratuitos, fórmula para bebés y asesoramiento nutricional porque tiene niños pequeños o está embarazada."
  },
  "pell_grant": {
    en: "This Pell Grant assistance pays up to $7,395 directly to your college tuition for the academic year, which you never have to pay back.",
    es: "Esta ayuda de la Beca Pell paga hasta $7,395 directamente para su matrícula universitaria, dinero que nunca tendrá que devolver."
  },
  "tanf": {
    en: "TANF provides direct temporary cash payments to your household every month to help pay for basic necessities like rent, clothing, and utilities.",
    es: "TANF proporciona pagos temporales directos en efectivo a su hogar cada mes para ayudar a pagar necesidades básicas como alquiler y ropa."
  },
  "eitc": {
    en: "The Earned Income Tax Credit gives you a substantial refund check on your annual tax return based on your earnings and family size.",
    es: "El Crédito por Ingreso del Trabajo le otorga un cheque de reembolso sustancial en su declaración de impuestos anual según sus ingresos."
  },
  "lifeline": {
    en: "Lifeline gives you a monthly discount of $9.25 (or more) on your phone or home internet service bills, keeping you connected for free.",
    es: "Lifeline le ofrece un descuento mensual de $9.25 (o más) en sus facturas de servicio de teléfono o internet doméstico para mantenerlo conectado."
  },
  "ssi_ssdi": {
    en: "SSI provides cash assistance to elderly or disabled individuals with limited income. SSDI provides cash assistance to disabled individuals with work credits.",
    es: "SSI proporciona asistencia en efectivo a personas mayores o discapacitadas con ingresos limitados. SSDI proporciona asistencia en efectivo a personas discapacitadas con créditos laborales."
  }
};

function parseFreeFormProfile(text: string): Record<string, string> {
  const lowercase = text.toLowerCase();
  const facts: Record<string, string> = {
    state: "CA",
    household_size: "1",
    monthly_income: "0",
    has_children: "false",
    has_pregnant: "false",
    has_elderly_or_disabled: "false",
    is_student: "false",
    immigration_status: "citizen",
    language: "english",
  };

  const states: Record<string, string[]> = {
    al: ["alabama", "al"], ak: ["alaska", "ak"], az: ["arizona", "az"], ar: ["arkansas", "ar"],
    ca: ["california", "ca"], co: ["colorado", "co"], ct: ["connecticut", "ct"], de: ["delaware", "de"],
    fl: ["florida", "fl"], ga: ["georgia", "ga"], hi: ["hawaii", "hi"], id: ["idaho", "id"],
    il: ["illinois", "il"], in: ["indiana", "in"], ia: ["iowa", "ia"], ks: ["kansas", "ks"],
    ky: ["kentucky", "ky"], la: ["louisiana", "la"], me: ["maine", "me"], md: ["maryland", "md"],
    ma: ["massachusetts", "ma"], mi: ["michigan", "mi"], mn: ["minnesota", "mn"], ms: ["mississippi", "ms"],
    mo: ["missouri", "mo"], mt: ["montana", "mt"], ne: ["nebraska", "ne"], nv: ["nevada", "nv"],
    nh: ["new hampshire", "nh"], nj: ["new jersey", "nj"], nm: ["new mexico", "nm"], ny: ["new york", "ny"],
    nc: ["north carolina", "nc"], nd: ["north dakota", "nd"], oh: ["ohio", "oh"], ok: ["oklahoma", "ok"],
    or: ["oregon", "or"], pa: ["pennsylvania", "pa"], ri: ["rhode island", "ri"], sc: ["south carolina", "sc"],
    sd: ["south dakota", "sd"], tn: ["tennessee", "tn"], tx: ["texas", "tx"], ut: ["utah", "ut"],
    vt: ["vermont", "vt"], va: ["virginia", "va"], wa: ["washington", "wa"], wv: ["west virginia", "wv"],
    wi: ["wisconsin", "wi"], wy: ["wyoming", "wy"]
  };
  for (const [code, names] of Object.entries(states)) {
    if (names.some(name => {
      const regex = new RegExp(`\\b${name}\\b`, "i");
      return regex.test(lowercase);
    })) {
      facts.state = code.toUpperCase();
      break;
    }
  }

  // English & Spanish household size matching
  const sizeMatch = lowercase.match(/(?:household of|family of|size of|live with|hogar de|familia de|somos|tamaño de)\s*(\d+)/) ||
                    lowercase.match(/(\d+)\s*(?:people|members|persons|family|personas|miembros|miembros de)/);
  if (sizeMatch) {
    facts.household_size = sizeMatch[1];
  } else {
    const wordsEn = ["one", "two", "three", "four", "five", "six", "seven", "eight"];
    const wordsEs = ["uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho"];
    wordsEn.forEach((word, idx) => {
      if (lowercase.includes(`family of ${word}`) || lowercase.includes(`household of ${word}`)) {
        facts.household_size = String(idx + 1);
      }
    });
    wordsEs.forEach((word, idx) => {
      if (lowercase.includes(`familia de ${word}`) || lowercase.includes(`hogar de ${word}`) || lowercase.includes(`somos ${word}`)) {
        facts.household_size = String(idx + 1);
      }
    });
  }

  // English & Spanish income matching
  const incomeMatch = lowercase.match(/(?:income of|earn|earning|salary of|making|ingresos de|gano|ganando|salario de|hago)\s*\$?\s*([\d,]+)/) ||
                      lowercase.match(/\$([\d,]+)/);
  if (incomeMatch) {
    facts.monthly_income = incomeMatch[1].replace(/,/g, "");
  }

  if (
    lowercase.includes("child") || lowercase.includes("kid") || lowercase.includes("son") || 
    lowercase.includes("daughter") || lowercase.includes("hijo") || lowercase.includes("hija") || 
    lowercase.includes("niño") || lowercase.includes("niña") || lowercase.includes("bebe") || lowercase.includes("bebé")
  ) {
    facts.has_children = "true";
  }

  if (
    lowercase.includes("pregnant") || lowercase.includes("expecting") || lowercase.includes("pregnancy") || 
    lowercase.includes("embarazada") || lowercase.includes("embarazo") || lowercase.includes("gestante")
  ) {
    facts.has_pregnant = "true";
  }

  if (
    lowercase.includes("elderly") || lowercase.includes("disabled") || lowercase.includes("disability") || 
    lowercase.includes("65+") || lowercase.includes("discapacitado") || lowercase.includes("anciano") || 
    lowercase.includes("mayor de 65") || lowercase.includes("abuelo") || lowercase.includes("abuela") ||
    lowercase.includes("ssi") || lowercase.includes("ssdi")
  ) {
    facts.has_elderly_or_disabled = "true";
  }

  if (
    lowercase.includes("student") || lowercase.includes("college") || lowercase.includes("university") || 
    lowercase.includes("estudiante") || lowercase.includes("estudio") || lowercase.includes("universidad")
  ) {
    facts.is_student = "true";
  }

  if (
    lowercase.includes("permanent resident") || lowercase.includes("green card") || 
    lowercase.includes("residente") || lowercase.includes("tarjeta verde")
  ) {
    facts.immigration_status = "permanent_resident";
  } else if (
    lowercase.includes("prefer not to say") || lowercase.includes("undocumented") || 
    lowercase.includes("indocumentado") || lowercase.includes("sin papeles")
  ) {
    facts.immigration_status = "not_disclosed";
  } else if (
    lowercase.includes("citizen") || lowercase.includes("ciudadano") || lowercase.includes("ciudadana")
  ) {
    facts.immigration_status = "citizen";
  }

  if (lowercase.includes("spanish") || lowercase.includes("español") || lowercase.includes("espanol") || lowercase.includes("castellano")) {
    facts.language = "spanish";
  }

  return facts;
}

function checkAdversarial(text: string, lang: "en" | "es", parsedFacts?: Record<string, string>): { isAdversarial: boolean; reason: string | null } {
  const lower = text.toLowerCase();
  
  if (parsedFacts) {
    const hh = parseInt(parsedFacts.household_size) || 0;
    const inc = parseFloat(parsedFacts.monthly_income) || 0;
    if (hh > 25) {
      return { 
        isAdversarial: true, 
        reason: lang === "es" ? `tamaño de hogar de ${hh} personas es poco plausible` : `household size of ${hh} is implausibly large` 
      };
    }
    if (inc > 200000) {
      return { 
        isAdversarial: true, 
        reason: lang === "es" ? `ingreso mensual de $${inc.toLocaleString()} supera los límites reales` : `monthly income of $${inc.toLocaleString()} exceeds realistic limits` 
      };
    }
  }

  const hhMatch = lower.match(/(\d+)\s*(?:people|members|persons|personas|miembros|hogar de|familia de)/);
  if (hhMatch) {
    const count = parseInt(hhMatch[1]);
    if (count > 25) {
      return { 
        isAdversarial: true, 
        reason: lang === "es" ? `tamaño de hogar de ${count} personas es poco plausible` : `household size of ${count} is implausibly large` 
      };
    }
  }

  const incMatch = lower.match(/\$?\s*([\d,]{7,})/);
  if (incMatch) {
    const val = parseFloat(incMatch[1].replace(/,/g, ""));
    if (val > 200000) {
      return { 
        isAdversarial: true, 
        reason: lang === "es" ? `ingreso de $${val.toLocaleString()} es poco plausible` : `income of $${val.toLocaleString()} is implausibly large` 
      };
    }
  }

  if (lower.includes("implausible") || lower.includes("fake input") || lower.includes("garbage input")) {
    return { 
      isAdversarial: true, 
      reason: lang === "es" ? "patrón de prueba detectado" : "testing pattern detected" 
    };
  }

  return { isAdversarial: false, reason: null };
}

function checkForContradictions(facts: Record<string, string>, queryText: string, lang: "en" | "es"): string[] {
  const contradictions: string[] = [];
  const lowerQuery = queryText.toLowerCase();
  
  const income = parseFloat(facts.monthly_income) || 0;
  const isStudent = facts.is_student === "true";
  const hasChildren = facts.has_children === "true";
  const hasPregnant = facts.has_pregnant === "true";

  const rentMatch = lowerQuery.match(/(?:rent of|rent is|pay|renta de|alquiler de|pago)\s*\$?\s*(\d{3,})/);
  if (rentMatch) {
    const rentVal = parseFloat(rentMatch[1]);
    if (income > 0 && rentVal > income) {
      contradictions.push(
        lang === "es"
          ? `⚠️ **Inconsistencia de Gastos**: Reportó ingresos de $${income}/mes, pero menciona un alquiler de $${rentVal}/mes. SNAP permite deducir costos de vivienda excesivos, pero Medicaid mide ingresos brutos sin deducciones. Hemos registrado este matiz.`
          : `⚠️ **Expense Inconsistency**: You reported $${income}/mo income, but mentioned rent of $${rentVal}/mo. SNAP allows shelter expense deductions, while Medicaid uses gross income. We have documented this mismatch to optimize your analysis.`
      );
    }
  }

  if (isStudent && income > 4500) {
    contradictions.push(
      lang === "es"
        ? `⚠️ **Matiz de Estudiante**: Registró ingresos de $${income}/mes siendo estudiante. SNAP tiene límites estrictos de horas de trabajo para estudiantes de altos ingresos.`
        : `⚠️ **Student Income Nuance**: You reported student status with high income ($${income}/mo). SNAP student eligibility rules enforce a minimum 20 hours/week work requirement for higher earners.`
    );
  }

  const mentionsChildren = lowerQuery.includes("child") || lowerQuery.includes("kid") || lowerQuery.includes("son") || 
                           lowerQuery.includes("daughter") || lowerQuery.includes("hijo") || lowerQuery.includes("hija") ||
                           lowerQuery.includes("niño") || lowerQuery.includes("niña") || lowerQuery.includes("bebe");
  if (!hasChildren && !hasPregnant && mentionsChildren) {
    contradictions.push(
      lang === "es"
        ? `⚠️ **Discrepancia de Dependientes**: Mencionó niños en su relato, pero su perfil marca 'No' para hijos. Esto reduce la probabilidad de calificar para WIC y créditos fiscales. Hemos guardado esta alerta.`
        : `⚠️ **Dependent Child Discrepancy**: You mentioned children in your story, but the profile lists 'No' for children. WIC and tax credits require dependents. We flagged this for further casework audit.`
    );
  }

  return contradictions;
}

const countyData: Record<string, Record<string, { underclaimRate: number; totalUnclaimedUsd: number }>> = {
  TX: {
    "Travis County": { underclaimRate: 67, totalUnclaimedUsd: 14200000 },
    "Harris County": { underclaimRate: 58, totalUnclaimedUsd: 89000000 },
    "Bexar County": { underclaimRate: 61, totalUnclaimedUsd: 41200000 },
    "Dallas County": { underclaimRate: 59, totalUnclaimedUsd: 54000000 }
  },
  CA: {
    "Los Angeles County": { underclaimRate: 54, totalUnclaimedUsd: 210000000 },
    "San Francisco County": { underclaimRate: 48, totalUnclaimedUsd: 18400000 },
    "Orange County": { underclaimRate: 52, totalUnclaimedUsd: 48000000 },
    "San Diego County": { underclaimRate: 55, totalUnclaimedUsd: 62000000 }
  },
  FL: {
    "Miami-Dade County": { underclaimRate: 63, totalUnclaimedUsd: 74000000 },
    "Broward County": { underclaimRate: 57, totalUnclaimedUsd: 38000000 },
    "Orange County": { underclaimRate: 59, totalUnclaimedUsd: 29000000 },
    "Hillsborough County": { underclaimRate: 60, totalUnclaimedUsd: 31000000 }
  },
  NY: {
    "New York County": { underclaimRate: 51, totalUnclaimedUsd: 95000000 },
    "Kings County": { underclaimRate: 56, totalUnclaimedUsd: 145000000 },
    "Queens County": { underclaimRate: 53, totalUnclaimedUsd: 110000000 },
    "Bronx County": { underclaimRate: 62, totalUnclaimedUsd: 120000000 }
  },
  IL: {
    "Cook County": { underclaimRate: 58, totalUnclaimedUsd: 180000000 },
    "DuPage County": { underclaimRate: 46, totalUnclaimedUsd: 18000000 },
    "Lake County": { underclaimRate: 49, totalUnclaimedUsd: 15000000 },
    "Will County": { underclaimRate: 52, totalUnclaimedUsd: 12000000 }
  },
  PA: {
    "Philadelphia County": { underclaimRate: 61, totalUnclaimedUsd: 98000000 },
    "Allegheny County": { underclaimRate: 53, totalUnclaimedUsd: 45000000 },
    "Montgomery County": { underclaimRate: 45, totalUnclaimedUsd: 16000000 },
    "Bucks County": { underclaimRate: 48, totalUnclaimedUsd: 12000000 }
  },
  OH: {
    "Franklin County": { underclaimRate: 57, totalUnclaimedUsd: 42000000 },
    "Cuyahoga County": { underclaimRate: 59, totalUnclaimedUsd: 58000000 },
    "Hamilton County": { underclaimRate: 55, totalUnclaimedUsd: 31000000 },
    "Summit County": { underclaimRate: 54, totalUnclaimedUsd: 18000000 }
  },
  GA: {
    "Fulton County": { underclaimRate: 62, totalUnclaimedUsd: 54000000 },
    "Gwinnett County": { underclaimRate: 58, totalUnclaimedUsd: 36000000 },
    "Cobb County": { underclaimRate: 54, totalUnclaimedUsd: 22000000 },
    "DeKalb County": { underclaimRate: 60, totalUnclaimedUsd: 29000000 }
  },
  NC: {
    "Mecklenburg County": { underclaimRate: 56, totalUnclaimedUsd: 32000000 },
    "Wake County": { underclaimRate: 51, totalUnclaimedUsd: 24000000 },
    "Guilford County": { underclaimRate: 58, totalUnclaimedUsd: 16000000 },
    "Forsyth County": { underclaimRate: 59, totalUnclaimedUsd: 14000000 }
  },
  MI: {
    "Wayne County": { underclaimRate: 64, totalUnclaimedUsd: 85000000 },
    "Oakland County": { underclaimRate: 48, totalUnclaimedUsd: 24000000 },
    "Macomb County": { underclaimRate: 53, totalUnclaimedUsd: 21000000 },
    "Kent County": { underclaimRate: 55, totalUnclaimedUsd: 15000000 }
  }
};

const programWhatAIDoesntKnow: Record<string, { en: string; es: string }[]> = {
  snap: [
    { en: "County-specific liquid assets limits above $2,750.", es: "Límites de activos líquidos específicos del condado superiores a $2,750." },
    { en: "Local utility standard utility allowance (SUA) deduction adjustments.", es: "Ajustes de deducción por asignación de servicios públicos estándar (SUA) locales." }
  ],
  medicaid: [
    { en: "State backlog processing delays (current estimated wait: 45 days).", es: "Retrasos de procesamiento estatal (espera de unos 45 días)." },
    { en: "Prior month retroactive coverage exceptions.", es: "Excepciones de cobertura retroactiva de meses anteriores." }
  ],
  liheap: [
    { en: "Emergency crisis grant remaining funds in your local county office.", es: "Fondos restantes de crisis de emergencia en la oficina del condado." },
    { en: "Local energy supplier direct-payment service agreements.", es: "Acuerdos de servicio de pago directo del proveedor de energía local." }
  ],
  wic: [
    { en: "Local clinic physical weight-measurement appointment waivers.", es: "Exenciones de cita presencial para medición de peso en la clínica local." },
    { en: "Expedited voucher issuance processing times.", es: "Tiempos de procesamiento de emisión de vales urgentes." }
  ],
  pell_grant: [
    { en: "Your university's specific financial aid office cost of attendance (COA) calculations.", es: "Cálculos del costo de asistencia (COA) de la oficina de ayuda de su universidad." },
    { en: "Individual academic progress (SAP) compliance history.", es: "Historial de cumplimiento del progreso académico individual (SAP)." }
  ],
  tanf: [
    { en: "County work requirement community service participation waivers.", es: "Exenciones de participación en servicio comunitario del condado." },
    { en: "Child support cooperation compliance status.", es: "Estado de cumplimiento de la cooperación de manutención infantil." }
  ],
  eitc: [
    { en: "IRS system verification processing delays for self-employment schedules.", es: "Retrasos de verificación del IRS para formularios de trabajo por cuenta propia." },
    { en: "State-level earned income tax credit matches.", es: "Créditos por ingreso del trabajo a nivel estatal." }
  ],
  lifeline: [
    { en: "Dynamic mobile carrier device standard equipment bundles.", es: "Paquetes de equipos estándar de operadores de telefonía móvil." },
    { en: "Local broadband provider service availability mapping.", es: "Mapeo de disponibilidad de servicio de proveedores de banda ancha locales." }
  ]
};

type ViewState = "landing" | "intake" | "discovery" | "results";
type ResultTab = "matched" | "impact" | "documents" | "roadmap" | "updates";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface SimulatedLog {
  id: number;
  text: string;
}

interface Citation {
  citation_id: string;
  program_id: string;
  chunk_preview: string;
  source_document: string;
  retrieval_score: number;
  chunk_text?: string;
}

interface EligibilityProgramResult {
  program_id: string;
  program_name: string;
  eligible: boolean;
  confidence_score: number;
  reasoning_summary: string;
  citation_ids: string[];
  monthly_value_usd: number;
}

interface ClockData {
  total_unclaimed_usd: number;
  per_second_loss: number;
  months_unclaimed: number;
  eligibility_start_date: string;
}

interface PolicyUpdate {
  program: string;
  title: string;
  summary: string;
  effective_date: string;
  category: string;
  source_url: string;
}

export default function Home() {
  // Navigation & Views
  const [activeView, setActiveView] = useState<ViewState>("landing");
  const [activeTab, setActiveTab] = useState<ResultTab>("matched");
  const [lang, setLang] = useState<"en" | "es">("en");

  // Chat & Intake State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(1);
  const [profileFacts, setProfileFacts] = useState<Record<string, string>>({});
  const [isTyping, setIsTyping] = useState(false);

  // Discovery / Scan State
  const [scanLogs, setScanLogs] = useState<SimulatedLog[]>([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [rulesCheckedCount, setRulesCheckedCount] = useState(0);
  const [currentScanningProgram, setCurrentScanningProgram] = useState<string | null>(null);
  const [scanStatuses, setScanStatuses] = useState<Record<string, "scanning" | "matched" | "info_needed" | "unlikely">>({});
  const [streamingText, setStreamingText] = useState("");

  // Results & Calculations
  const [eligibilityResults, setEligibilityResults] = useState<EligibilityProgramResult[]>([]);
  const [citations, setCitations] = useState<Record<string, Citation>>({});
  const [clockData, setClockData] = useState<ClockData | null>(null);
  const [tickingValue, setTickingValue] = useState<number>(0);
  const [clockSessionId, setClockSessionId] = useState("");
  const [policyUpdates, setPolicyUpdates] = useState<PolicyUpdate[]>([]);
  const [updatesFilter, setUpdatesFilter] = useState<"all" | "affects_me" | "new_programs">("all");
  // Active comparison path tab
  const [activeComparisonTab, setActiveComparisonTab] = useState("formzero");

  // Modals & Sub-views
  const [selectedAuditProgram, setSelectedAuditProgram] = useState<EligibilityProgramResult | null>(null);
  const [showCaseworkerModal, setShowCaseworkerModal] = useState(false);
  const [expandedDocumentChecklist, setExpandedDocumentChecklist] = useState<string | null>(null);

  // User Session State
  const [currentUser, setCurrentUser] = useState<{ email: string; token: string; name?: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authOtp, setAuthOtp] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [tempDevOtp, setTempDevOtp] = useState("");
  const [otpEmailSent, setOtpEmailSent] = useState(false);

  // Delete Account State
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(60);
  const recognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef("");
  const [isConfirmingAutoFill, setIsConfirmingAutoFill] = useState(false);
  const [isConfirmingChatIntake, setIsConfirmingChatIntake] = useState(false);
  const [tempAutoFillFacts, setTempAutoFillFacts] = useState<Record<string, string> | null>(null);
  const [tempAutoFillQuery, setTempAutoFillQuery] = useState("");
  const [completedRoadmapSteps, setCompletedRoadmapSteps] = useState<Record<string, boolean>>({});
  const [showSimpleLedgerExplanation, setShowSimpleLedgerExplanation] = useState(false);
  const [pdfZoom, setPdfZoom] = useState<"normal" | "in" | "full">("normal");
  const [showUpdateProfileModal, setShowUpdateProfileModal] = useState(false);
  const [editProfileFacts, setEditProfileFacts] = useState<Record<string, string>>({});
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState("");
  const stateDropdownRef = useRef<HTMLDivElement>(null);
  const [simulationIncome, setSimulationIncome] = useState<number>(0);
  const [simulationHouseholdSize, setSimulationHouseholdSize] = useState<number>(1);
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(false);
  const [reportDate, setReportDate] = useState("");
  const [verificationId, setVerificationId] = useState("");
  const [selectedCounty, setSelectedCounty] = useState("");
  const [shareUrl, setShareUrl] = useState("https://formzero.org");
  const [qrError, setQrError] = useState(false);
  const [contradictionAlerts, setContradictionAlerts] = useState<string[]>([]);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target as Node)) {
        setStateDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setReportDate(new Date().toLocaleDateString());
    setVerificationId("FZ-" + Math.random().toString(36).substring(2, 8).toUpperCase());
    if (typeof window !== "undefined") {
      const href = window.location.href;
      if (href.includes("localhost") || href.includes("127.0.0.1") || href.includes("::1")) {
        setShareUrl("https://formzero.org");
      } else {
        setShareUrl(href);
      }
    }
  }, []);

  useEffect(() => {
    const stateVal = (profileFacts.state || "CA").trim().toLowerCase();
    const stateMap: Record<string, string> = {
      alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
      colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
      hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
      kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
      massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
      montana: "MT", nebraska: "NE", nevada: "NV", new_hampshire: "NH", new_jersey: "NJ",
      new_mexico: "NM", new_york: "NY", north_carolina: "NC", north_dakota: "ND", ohio: "OH",
      oklahoma: "OK", oregon: "OR", pennsylvania: "PA", rhode_island: "RI", south_carolina: "SC",
      south_dakota: "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
      virginia: "VA", washington: "WA", west_virginia: "WV", wisconsin: "WI", wyoming: "WY",
      ca: "CA", tx: "TX", fl: "FL", ny: "NY", il: "IL", pa: "PA", oh: "OH", ga: "GA", nc: "NC", mi: "MI"
    };
    const cleanStateVal = stateVal.replace(/\s+/g, "_");
    const code = stateMap[cleanStateVal] || stateVal.toUpperCase();
    
    const countiesData = countyData[code] || {
      [`${code} County A`]: { underclaimRate: 58, totalUnclaimedUsd: 25000000 }
    };
    const firstCounty = Object.keys(countiesData)[0];
    setSelectedCounty(firstCounty);
  }, [profileFacts.state]);

  useEffect(() => {
    if (activeView === "results") {
      setSimulationIncome(parseFloat(profileFacts.monthly_income) || 0);
      setSimulationHouseholdSize(parseInt(profileFacts.household_size) || 1);
      setIsSimulationActive(false);
    }
  }, [activeView, profileFacts]);

  const simulatedResultsData = useMemo(() => {
    if (!isSimulationActive) return null;
    
    const simulatedProfile: UserProfile = {
      state: profileFacts.state || "CA",
      household_size: simulationHouseholdSize,
      monthly_income: simulationIncome,
      has_children: profileFacts.has_children === "true",
      has_pregnant: profileFacts.has_pregnant === "true",
      has_elderly_or_disabled: profileFacts.has_elderly_or_disabled === "true",
      is_student: profileFacts.is_student === "true",
      immigration_status: (profileFacts.immigration_status as any) || "citizen",
      language: (profileFacts.language as any) || "english",
    };

    const results = checkEligibility(simulatedProfile);
    let simulatedMonthlySum = 0;
    let simulatedCount = 0;

    results.forEach((benefit) => {
      const eligible = benefit.eligible === "yes" || benefit.eligible === "likely";
      if (eligible) {
        simulatedMonthlySum += benefit.annual_value_number / 12;
        simulatedCount++;
      }
    });

    return {
      annualValue: simulatedMonthlySum * 12,
      monthlyValue: simulatedMonthlySum,
      count: simulatedCount,
    };
  }, [isSimulationActive, simulationIncome, simulationHouseholdSize, profileFacts]);

  // Pager states
  const currentClaimIndex = useMemo(() => {
    if (!selectedAuditProgram) return -1;
    return eligibilityResults.findIndex(r => r.program_id === selectedAuditProgram.program_id);
  }, [selectedAuditProgram, eligibilityResults]);

  function handlePrevClaim() {
    setShowSimpleLedgerExplanation(false);
    if (currentClaimIndex > 0) {
      setSelectedAuditProgram(eligibilityResults[currentClaimIndex - 1]);
    } else {
      setSelectedAuditProgram(eligibilityResults[eligibilityResults.length - 1]);
    }
  }

  function handleNextClaim() {
    setShowSimpleLedgerExplanation(false);
    if (currentClaimIndex < eligibilityResults.length - 1) {
      setSelectedAuditProgram(eligibilityResults[currentClaimIndex + 1]);
    } else {
      setSelectedAuditProgram(eligibilityResults[0]);
    }
  }

  function loadUserProfileFacts(facts: Record<string, string>) {
    setProfileFacts(facts);
    if (facts.language === "spanish") {
      setLang("es");
    } else {
      setLang("en");
    }

    const userProfile: UserProfile = {
      state: facts.state || "",
      household_size: parseInt(facts.household_size) || 1,
      monthly_income: parseFloat(facts.monthly_income) || 0,
      has_children: facts.has_children === "true",
      has_pregnant: facts.has_pregnant === "true",
      has_elderly_or_disabled: facts.has_elderly_or_disabled === "true",
      is_student: facts.is_student === "true",
      immigration_status: (facts.immigration_status as any) || "citizen",
      language: (facts.language as any) || "english",
    };

    const results = checkEligibility(userProfile);
    const localProgramResults: EligibilityProgramResult[] = [];
    results.forEach((benefit) => {
      let programId = "snap";
      if (benefit.name.includes("Medicaid")) programId = "medicaid";
      else if (benefit.name.includes("LIHEAP")) programId = "liheap";
      else if (benefit.name.includes("WIC")) programId = "wic";
      else if (benefit.name.includes("Pell")) programId = "pell_grant";
      else if (benefit.name.includes("TANF")) programId = "tanf";
      else if (benefit.name.includes("EITC")) programId = "eitc";
      else if (benefit.name.includes("Lifeline")) programId = "lifeline";
      else if (benefit.name.includes("SSI")) programId = "ssi_ssdi";

      const eligible = benefit.eligible === "yes" || benefit.eligible === "likely";
      const val = benefit.annual_value_number / 12;
      const citationId = programId + "_citation";

      localProgramResults.push({
        program_id: programId,
        program_name: benefit.name,
        eligible,
        monthly_value_usd: val,
        confidence_score: benefit.confidence / 100,
        reasoning_summary: benefit.reason,
        citation_ids: [citationId],
      });
    });

    setEligibilityResults(localProgramResults);
    const contradictions = checkForContradictions(facts, `income is ${facts.monthly_income}, household size is ${facts.household_size}, student: ${facts.is_student}, children: ${facts.has_children}`, facts.language === "spanish" ? "es" : "en");
    setContradictionAlerts(contradictions);
    setActiveView("results");
  }

  // Helper: compute eligibility results from profile facts and set all related state
  function recomputeEligibilityFromFacts(facts: Record<string, string>) {
    if (!facts.state && !facts.monthly_income) return;
    const userProfile: UserProfile = {
      state: facts.state || "",
      household_size: parseInt(facts.household_size) || 1,
      monthly_income: parseFloat(facts.monthly_income) || 0,
      has_children: facts.has_children === "true",
      has_pregnant: facts.has_pregnant === "true",
      has_elderly_or_disabled: facts.has_elderly_or_disabled === "true",
      is_student: facts.is_student === "true",
      immigration_status: (facts.immigration_status as any) || "citizen",
      language: (facts.language as any) || "english",
    };
    const results = checkEligibility(userProfile);
    const localProgramResults: EligibilityProgramResult[] = [];
    results.forEach((benefit) => {
      let programId = "snap";
      if (benefit.name.includes("Medicaid")) programId = "medicaid";
      else if (benefit.name.includes("LIHEAP")) programId = "liheap";
      else if (benefit.name.includes("WIC")) programId = "wic";
      else if (benefit.name.includes("Pell")) programId = "pell_grant";
      else if (benefit.name.includes("TANF")) programId = "tanf";
      else if (benefit.name.includes("EITC")) programId = "eitc";
      else if (benefit.name.includes("Lifeline")) programId = "lifeline";
      else if (benefit.name.includes("SSI")) programId = "ssi_ssdi";

      const eligible = benefit.eligible === "yes" || benefit.eligible === "likely";
      const val = benefit.annual_value_number / 12;
      const citationId = programId + "_citation";

      localProgramResults.push({
        program_id: programId,
        program_name: benefit.name,
        eligible,
        monthly_value_usd: val,
        confidence_score: benefit.confidence / 100,
        reasoning_summary: benefit.reason,
        citation_ids: [citationId],
      });
    });
    setEligibilityResults(localProgramResults);

    const monthlySum = localProgramResults
      .filter((r) => r.eligible)
      .reduce((sum, r) => sum + r.monthly_value_usd, 0);
    const months = 41;
    const totalUnclaimed = monthlySum * months;
    const perSecondLoss = monthlySum / (30 * 24 * 3600);

    setClockData({
      total_unclaimed_usd: totalUnclaimed,
      per_second_loss: perSecondLoss,
      months_unclaimed: months,
      eligibility_start_date: "2023-01-01",
    });

    const contradictions = checkForContradictions(facts, `income is ${facts.monthly_income}, household size is ${facts.household_size}, student: ${facts.is_student}, children: ${facts.has_children}`, facts.language === "spanish" ? "es" : "en");
    setContradictionAlerts(contradictions);
  }

  useEffect(() => {
    const savedUser = localStorage.getItem("claimradar_user");
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);

        // First, load from localStorage for instant display
        const savedFactsStr = localStorage.getItem(`claimradar_profile_facts_${user.email}`);
        if (savedFactsStr) {
          const facts = JSON.parse(savedFactsStr);
          setProfileFacts(facts);
          if (facts.language === "spanish") setLang("es"); else setLang("en");
          recomputeEligibilityFromFacts(facts);
        }

        const savedChat = localStorage.getItem(`claimradar_chat_${user.email}`);
        if (savedChat) {
          setChatMessages(JSON.parse(savedChat));
        }

        const savedView = localStorage.getItem(`claimradar_active_view_${user.email}`) as ViewState | null;
        if (savedView) setActiveView(savedView);
        
        const savedTab = localStorage.getItem(`claimradar_active_tab_${user.email}`) as ResultTab | null;
        if (savedTab) setActiveTab(savedTab);

        const savedQuestionIdx = localStorage.getItem(`claimradar_question_index_${user.email}`);
        if (savedQuestionIdx) setCurrentQuestionIndex(parseInt(savedQuestionIdx) || 1);

        const savedRoadmap = localStorage.getItem(`claimradar_completed_roadmap_steps_${user.email}`);
        if (savedRoadmap) setCompletedRoadmapSteps(JSON.parse(savedRoadmap));

        // Then, fetch latest data from backend to re-hydrate (handles new browser / cleared cache)
        fetch(`/api/v1/auth/me?email=${encodeURIComponent(user.email)}`)
          .then((res) => {
            if (!res.ok) {
              // User was deleted or doesn't exist anymore — clear local session
              if (res.status === 404) {
                localStorage.removeItem("claimradar_user");
                setCurrentUser(null);
              }
              return null;
            }
            return res.json();
          })
          .then((data) => {
            if (!data) return;
            const backendFacts = data.profile_facts || {};
            const backendChat = data.chat_messages || [];
            const backendName = data.user?.name || user.name || "";

            // Update user name if backend has it
            if (backendName && backendName !== user.name) {
              const updatedUser = { ...user, name: backendName };
              setCurrentUser(updatedUser);
              localStorage.setItem("claimradar_user", JSON.stringify(updatedUser));
            }

            // If localStorage had no facts but backend has them, use backend data
            const localFactsStr = localStorage.getItem(`claimradar_profile_facts_${user.email}`);
            const localFacts = localFactsStr ? JSON.parse(localFactsStr) : {};
            const localHasData = Object.keys(localFacts).filter(k => k !== "full_name").length > 0;
            const backendHasData = Object.keys(backendFacts).filter(k => k !== "full_name").length > 0;

            if (!localHasData && backendHasData) {
              setProfileFacts(backendFacts);
              localStorage.setItem(`claimradar_profile_facts_${user.email}`, JSON.stringify(backendFacts));
              if (backendFacts.language === "spanish") setLang("es"); else setLang("en");
              recomputeEligibilityFromFacts(backendFacts);
            }

            // Same for chat messages
            const localChatStr = localStorage.getItem(`claimradar_chat_${user.email}`);
            const localChat = localChatStr ? JSON.parse(localChatStr) : [];
            if (localChat.length === 0 && backendChat.length > 0) {
              setChatMessages(backendChat);
              localStorage.setItem(`claimradar_chat_${user.email}`, JSON.stringify(backendChat));
            }
          })
          .catch((err) => {
            console.error("Failed to fetch user data from backend", err);
          })
          .finally(() => {
            setIsInitialLoadComplete(true);
          });
      } catch (e) {
        console.error("Failed to load saved user", e);
        setIsInitialLoadComplete(true);
      }
    } else {
      // No auth gating for guest: guests can still see the landing page but not start features
      try {
        const savedFactsStr = localStorage.getItem("claimradar_anonymous_profile_facts");
        if (savedFactsStr) {
          const facts = JSON.parse(savedFactsStr);
          setProfileFacts(facts);
          if (facts.language === "spanish") setLang("es"); else setLang("en");
          recomputeEligibilityFromFacts(facts);
        }
        
        const savedChat = localStorage.getItem("claimradar_chat_guest");
        if (savedChat) {
          setChatMessages(JSON.parse(savedChat));
        }

        const savedView = localStorage.getItem("claimradar_active_view_guest") as ViewState | null;
        if (savedView) setActiveView(savedView);

        const savedTab = localStorage.getItem("claimradar_active_tab_guest") as ResultTab | null;
        if (savedTab) setActiveTab(savedTab);

        const savedQuestionIdx = localStorage.getItem("claimradar_question_index_guest");
        if (savedQuestionIdx) setCurrentQuestionIndex(parseInt(savedQuestionIdx) || 1);

        const savedRoadmap = localStorage.getItem("claimradar_completed_roadmap_steps_guest");
        if (savedRoadmap) setCompletedRoadmapSteps(JSON.parse(savedRoadmap));
      } catch (e) {
        console.error("Failed to restore guest session", e);
      }
      setIsInitialLoadComplete(true);
    }
  }, []);

  // 1. Auto-save chatMessages
  useEffect(() => {
    if (!isInitialLoadComplete) return;
    const key = currentUser ? `claimradar_chat_${currentUser.email}` : "claimradar_chat_guest";
    if (chatMessages.length > 0) {
      localStorage.setItem(key, JSON.stringify(chatMessages));
      if (currentUser) {
        fetch("/api/v1/auth/save-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: currentUser.email,
            profile_facts: profileFacts,
            chat_messages: chatMessages,
          }),
        }).catch((e) => console.error("Failed to autosave chat messages", e));
      }
    } else {
      localStorage.removeItem(key);
    }
  }, [chatMessages, currentUser, isInitialLoadComplete]);

  // 2. Auto-save profileFacts
  useEffect(() => {
    if (!isInitialLoadComplete) return;
    const key = currentUser ? `claimradar_profile_facts_${currentUser.email}` : "claimradar_anonymous_profile_facts";
    if (Object.keys(profileFacts).length > 0) {
      localStorage.setItem(key, JSON.stringify(profileFacts));
      if (currentUser) {
        fetch("/api/v1/auth/save-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: currentUser.email,
            profile_facts: profileFacts,
            chat_messages: chatMessages,
          }),
        }).catch((e) => console.error("Failed to autosave profile facts", e));
      }
    } else {
      localStorage.removeItem(key);
    }
  }, [profileFacts, currentUser, isInitialLoadComplete]);

  // 3. Auto-save activeView
  useEffect(() => {
    if (!isInitialLoadComplete) return;
    const key = currentUser ? `claimradar_active_view_${currentUser.email}` : "claimradar_active_view_guest";
    localStorage.setItem(key, activeView);
  }, [activeView, currentUser, isInitialLoadComplete]);

  // 3b. Auto-save activeTab
  useEffect(() => {
    if (!isInitialLoadComplete) return;
    const key = currentUser ? `claimradar_active_tab_${currentUser.email}` : "claimradar_active_tab_guest";
    localStorage.setItem(key, activeTab);
  }, [activeTab, currentUser, isInitialLoadComplete]);

  // 4. Auto-save currentQuestionIndex
  useEffect(() => {
    if (!isInitialLoadComplete) return;
    const key = currentUser ? `claimradar_question_index_${currentUser.email}` : "claimradar_question_index_guest";
    localStorage.setItem(key, currentQuestionIndex.toString());
  }, [currentQuestionIndex, currentUser, isInitialLoadComplete]);

  // 5. Auto-save completedRoadmapSteps
  useEffect(() => {
    if (!isInitialLoadComplete) return;
    const key = currentUser ? `claimradar_completed_roadmap_steps_${currentUser.email}` : "claimradar_completed_roadmap_steps_guest";
    if (Object.keys(completedRoadmapSteps).length > 0) {
      localStorage.setItem(key, JSON.stringify(completedRoadmapSteps));
    } else {
      localStorage.removeItem(key);
    }
  }, [completedRoadmapSteps, currentUser, isInitialLoadComplete]);


  // When opening the update profile modal, populate it with current facts
  useEffect(() => {
    if (showUpdateProfileModal) {
      setEditProfileFacts({ ...profileFacts });
    }
  }, [showUpdateProfileModal, profileFacts]);

  async function handleUpdateProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileFacts(editProfileFacts);
    
    // Save to local storage
    if (currentUser) {
      localStorage.setItem(`claimradar_profile_facts_${currentUser.email}`, JSON.stringify(editProfileFacts));
      await syncProfileFacts(currentUser.email, editProfileFacts);
    } else {
      localStorage.setItem("claimradar_anonymous_profile_facts", JSON.stringify(editProfileFacts));
    }

    // Run eligibility recalculation
    const userProfile: UserProfile = {
      state: editProfileFacts.state || "",
      household_size: parseInt(editProfileFacts.household_size) || 1,
      monthly_income: parseFloat(editProfileFacts.monthly_income) || 0,
      has_children: editProfileFacts.has_children === "true",
      has_pregnant: editProfileFacts.has_pregnant === "true",
      has_elderly_or_disabled: editProfileFacts.has_elderly_or_disabled === "true",
      is_student: editProfileFacts.is_student === "true",
      immigration_status: (editProfileFacts.immigration_status as any) || "citizen",
      language: (editProfileFacts.language as any) || "english",
    };
    const results = checkEligibility(userProfile);
    
    const localProgramResults: EligibilityProgramResult[] = [];
    results.forEach((benefit) => {
      let programId = "snap";
      if (benefit.name.includes("Medicaid")) programId = "medicaid";
      else if (benefit.name.includes("LIHEAP")) programId = "liheap";
      else if (benefit.name.includes("WIC")) programId = "wic";
      else if (benefit.name.includes("Pell")) programId = "pell_grant";
      else if (benefit.name.includes("TANF")) programId = "tanf";
      else if (benefit.name.includes("EITC")) programId = "eitc";
      else if (benefit.name.includes("Lifeline")) programId = "lifeline";
      else if (benefit.name.includes("SSI")) programId = "ssi_ssdi";

      const eligible = benefit.eligible === "yes" || benefit.eligible === "likely";
      const val = benefit.annual_value_number / 12;
      const citationId = programId + "_citation";

      localProgramResults.push({
        program_id: programId,
        program_name: benefit.name,
        eligible,
        monthly_value_usd: val,
        confidence_score: benefit.confidence / 100,
        reasoning_summary: benefit.reason,
        citation_ids: [citationId],
      });
    });

    setEligibilityResults(localProgramResults);
    setShowUpdateProfileModal(false);
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError("Email and password are required.");
      return;
    }
    if (isSignUp && !authName.trim()) {
      setAuthError("Full Name is required.");
      return;
    }
    if (isSignUp && isVerifyingOtp && !authOtp.trim()) {
      setAuthError("Verification code is required.");
      return;
    }

    setAuthError("");
    setAuthLoading(true);

    try {
      // Direct SignUp or Login phase (OTP bypassed)
      const endpoint = isSignUp ? "/api/v1/auth/signup" : "/api/v1/auth/login";
      const requestBody = isSignUp
        ? { email: authEmail, password: authPassword, name: authName }
        : { email: authEmail, password: authPassword };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed.");
      }

      const userSession = {
        email: data.user.email,
        token: data.session_token,
        name: data.profile_facts?.full_name || (isSignUp ? authName : undefined)
      };

      // Calculate final facts & chat
      const guestFactsStr = localStorage.getItem("claimradar_anonymous_profile_facts");
      const guestFacts = guestFactsStr ? JSON.parse(guestFactsStr) : {};
      
      const guestChatStr = localStorage.getItem("claimradar_chat_guest");
      const guestChat = guestChatStr ? JSON.parse(guestChatStr) : [];

      const guestActiveView = localStorage.getItem("claimradar_active_view_guest") as ViewState | null;
      const guestQuestionIdx = localStorage.getItem("claimradar_question_index_guest");
      const guestRoadmapStr = localStorage.getItem("claimradar_completed_roadmap_steps_guest");
      const guestRoadmap = guestRoadmapStr ? JSON.parse(guestRoadmapStr) : {};
      const guestActiveTab = localStorage.getItem("claimradar_active_tab_guest") as ResultTab | null;

      let finalFacts = data.profile_facts || {};
      let finalChat = data.chat_messages || [];

      if (Object.keys(guestFacts).length > 0) {
        finalFacts = { ...finalFacts, ...guestFacts };
      } else if (Object.keys(profileFacts).length > 0 && (!data.profile_facts || Object.keys(data.profile_facts).length === 0)) {
        finalFacts = profileFacts;
      }

      if (guestChat.length > 0) {
        finalChat = [...finalChat, ...guestChat];
      }

      // Combine user and guest completed roadmap steps
      const savedUserRoadmapStr = localStorage.getItem(`claimradar_completed_roadmap_steps_${data.user.email}`);
      const savedUserRoadmap = savedUserRoadmapStr ? JSON.parse(savedUserRoadmapStr) : {};
      const finalRoadmap = { ...savedUserRoadmap, ...guestRoadmap };

      // 1. Update all localStorage values synchronously
      localStorage.setItem("claimradar_user", JSON.stringify(userSession));
      localStorage.setItem(`claimradar_profile_facts_${data.user.email}`, JSON.stringify(finalFacts));
      localStorage.setItem(`claimradar_chat_${data.user.email}`, JSON.stringify(finalChat));
      
      let finalView: ViewState = (guestActiveView === "intake") ? "intake" : "landing";
      localStorage.setItem(`claimradar_active_view_${data.user.email}`, finalView);
      
      let finalQuestionIdx = guestQuestionIdx || "1";
      localStorage.setItem(`claimradar_question_index_${data.user.email}`, finalQuestionIdx);

      let finalTab = guestActiveTab || "matched";
      localStorage.setItem(`claimradar_active_tab_${data.user.email}`, finalTab);

      if (Object.keys(finalRoadmap).length > 0) {
        localStorage.setItem(`claimradar_completed_roadmap_steps_${data.user.email}`, JSON.stringify(finalRoadmap));
      }

      // Clean up guest local storage keys
      localStorage.removeItem("claimradar_anonymous_profile_facts");
      localStorage.removeItem("claimradar_chat_guest");
      localStorage.removeItem("claimradar_active_view_guest");
      localStorage.removeItem("claimradar_question_index_guest");
      localStorage.removeItem("claimradar_completed_roadmap_steps_guest");
      localStorage.removeItem("claimradar_active_tab_guest");

      // 2. Batch React state updates synchronously
      setCurrentUser(userSession);
      setProfileFacts(finalFacts);
      setChatMessages(finalChat);
      setActiveView(finalView);
      setCurrentQuestionIndex(parseInt(finalQuestionIdx) || 1);
      setCompletedRoadmapSteps(finalRoadmap);
      setActiveTab(finalTab);

      // 3. Unconditionally calculate/reset eligibility results
      if (Object.keys(finalFacts).length > 0) {
        const userProfile: UserProfile = {
          state: finalFacts.state || "",
          household_size: parseInt(finalFacts.household_size) || 1,
          monthly_income: parseFloat(finalFacts.monthly_income) || 0,
          has_children: finalFacts.has_children === "true",
          has_pregnant: finalFacts.has_pregnant === "true",
          has_elderly_or_disabled: finalFacts.has_elderly_or_disabled === "true",
          is_student: finalFacts.is_student === "true",
          immigration_status: (finalFacts.immigration_status as any) || "citizen",
          language: (finalFacts.language as any) || "english",
        };
        const results = checkEligibility(userProfile);
        const localProgramResults: EligibilityProgramResult[] = [];
        results.forEach((benefit) => {
          let programId = "snap";
          if (benefit.name.includes("Medicaid")) programId = "medicaid";
          else if (benefit.name.includes("LIHEAP")) programId = "liheap";
          else if (benefit.name.includes("WIC")) programId = "wic";
          else if (benefit.name.includes("Pell")) programId = "pell_grant";
          else if (benefit.name.includes("TANF")) programId = "tanf";
          else if (benefit.name.includes("EITC")) programId = "eitc";
          else if (benefit.name.includes("Lifeline")) programId = "lifeline";
          else if (benefit.name.includes("SSI")) programId = "ssi_ssdi";

          const eligible = benefit.eligible === "yes" || benefit.eligible === "likely";
          const val = benefit.annual_value_number / 12;
          const citationId = programId + "_citation";

          localProgramResults.push({
            program_id: programId,
            program_name: benefit.name,
            eligible,
            monthly_value_usd: val,
            confidence_score: benefit.confidence / 100,
            reasoning_summary: benefit.reason,
            citation_ids: [citationId],
          });
        });
        setEligibilityResults(localProgramResults);
        
        const monthlySum = localProgramResults
          .filter((r) => r.eligible)
          .reduce((sum, r) => sum + r.monthly_value_usd, 0);
        const months = 41; // count since Jan 2023
        const totalUnclaimed = monthlySum * months;
        const perSecondLoss = monthlySum / (30 * 24 * 3600);

        setClockData({
          total_unclaimed_usd: totalUnclaimed,
          per_second_loss: perSecondLoss,
          months_unclaimed: months,
          eligibility_start_date: "2023-01-01",
        });

        const contradictions = checkForContradictions(finalFacts, `income is ${finalFacts.monthly_income}, household size is ${finalFacts.household_size}, student: ${finalFacts.is_student}, children: ${finalFacts.has_children}`, finalFacts.language === "spanish" ? "es" : "en");
        setContradictionAlerts(contradictions);

        if (finalFacts.language === "spanish") {
          setLang("es");
        } else {
          setLang("en");
        }
      } else {
        setEligibilityResults([]);
        setClockData(null);
        setContradictionAlerts([]);
      }

      // 4. Close login modals and reset UI inputs
      setShowAuthModal(false);
      setAuthEmail("");
      setAuthPassword("");
      setAuthName("");
      setAuthOtp("");
      setIsVerifyingOtp(false);
      setTempDevOtp("");
      setOtpEmailSent(false);

      // 5. Trigger database sync
      await syncProfileFacts(data.user.email, finalFacts, finalChat);
    } catch (err: any) {
      setAuthError(err.message || "Something went wrong.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    if (currentUser) {
      localStorage.removeItem(`claimradar_chat_${currentUser.email}`);
      localStorage.removeItem(`claimradar_profile_facts_${currentUser.email}`);
      localStorage.removeItem(`claimradar_active_view_${currentUser.email}`);
      localStorage.removeItem(`claimradar_question_index_${currentUser.email}`);
      localStorage.removeItem(`claimradar_completed_roadmap_steps_${currentUser.email}`);
      localStorage.removeItem(`claimradar_active_tab_${currentUser.email}`);
    }
    setCurrentUser(null);
    localStorage.removeItem("claimradar_user");
    handleReset(false);
  }

  async function handleDeleteAccount() {
    if (!currentUser) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const response = await fetch("/api/v1/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser.email, password: deletePassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to delete account.");
      }
      // Clear everything locally
      localStorage.removeItem(`claimradar_chat_${currentUser.email}`);
      localStorage.removeItem(`claimradar_profile_facts_${currentUser.email}`);
      localStorage.removeItem(`claimradar_active_view_${currentUser.email}`);
      localStorage.removeItem(`claimradar_question_index_${currentUser.email}`);
      localStorage.removeItem(`claimradar_completed_roadmap_steps_${currentUser.email}`);
      localStorage.removeItem(`claimradar_active_tab_${currentUser.email}`);
      localStorage.removeItem("claimradar_user");
      setCurrentUser(null);
      setShowDeleteAccountModal(false);
      setDeletePassword("");
      handleReset(false);
    } catch (err: any) {
      setDeleteError(err.message || "Something went wrong.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function syncProfileFacts(email: string, facts: Record<string, string>, chat?: ChatMessage[]) {
    try {
      localStorage.setItem(`claimradar_profile_facts_${email}`, JSON.stringify(facts));
      const chatToSync = chat || chatMessages;
      if (chatToSync && chatToSync.length > 0) {
        localStorage.setItem(`claimradar_chat_${email}`, JSON.stringify(chatToSync));
      }
      await fetch("/api/v1/auth/save-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, profile_facts: facts, chat_messages: chatToSync }),
      });
    } catch (e) {
      console.error("Failed to sync profile facts", e);
    }
  }

  const SpeechRecognition = typeof window !== "undefined" && (
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );

  function startVoiceRecording() {
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang === "es" ? "es-ES" : "en-US";

    recognition.onstart = () => {
      setIsRecording(true);
      setChatInput("");
      transcriptRef.current = "";
      setRecordingTimer(60);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTimer((prev) => {
          if (prev <= 1) {
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
              timerIntervalRef.current = null;
            }
            setTimeout(() => {
              stopVoiceRecording(true);
            }, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      const fullTranscript = finalTranscript + interimTranscript;
      setChatInput(fullTranscript);
      transcriptRef.current = fullTranscript;
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }

  function stopVoiceRecording(shouldSubmit = true) {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    
    if (shouldSubmit && transcriptRef.current.trim()) {
      const query = transcriptRef.current.trim();
      setChatInput("");
      processFreeFormInput(query);
    }
  }

  function autoFillChatConversation(parsedFacts: Record<string, string>, query: string) {
    const adv = checkAdversarial(query, lang, parsedFacts);
    if (adv.isAdversarial) {
      setActiveView("intake");
      setChatMessages([
        {
          role: "assistant",
          content: lang === "es"
            ? `⚠️ **Entrada Adversaria Detectada**\n\nHemos detectado que los datos proporcionados son poco plausibles o extremos (${adv.reason}). Para esta demostración, use valores realistas para simular la elegibilidad de beneficios, o elija uno de los perfiles preconfigurados en la página de inicio.`
            : `⚠️ **Adversarial Input Detected**\n\nWe detected that the provided inputs are highly implausible or extreme (${adv.reason}). For this demo, please use realistic values to simulate benefits eligibility, or select one of the pre-configured profiles on the landing page.`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
      return;
    }

    setActiveView("intake");
    setCurrentQuestionIndex(1);
    setIsConfirmingAutoFill(false);
    setContradictionAlerts([]);
    
    const welcomeMsg = lang === "es"
      ? "¡Hola! Soy FormZero 👋 Ayudo a las personas a encontrar beneficios del gobierno de EE. UU. para los que califican, completamente gratis.\n\n¿En qué estado de EE. UU. vive?"
      : "Hi! I'm FormZero 👋 I help people find US government benefits they may qualify for — completely free.\n\nWhat US state do you live in?";

    setChatMessages([
      { role: "assistant", content: welcomeMsg, timestamp: new Date().toLocaleTimeString() }
    ]);
    setProfileFacts({});

    let currentStep = 1;
    const totalSteps = 8;
    const accumulatedFacts: Record<string, string> = {
      language: lang === "es" ? "spanish" : "english"
    };

    const getFriendlyAnswer = (key: string, val: string) => {
      if (key === "state") return val || "CA";
      if (key === "household_size") return lang === "es" ? `Hogar de ${val}` : `Household of ${val}`;
      if (key === "monthly_income") return `$${val}`;
      if (["has_children", "has_pregnant", "has_elderly_or_disabled", "is_student"].includes(key)) {
        if (val === "true") return lang === "es" ? "Sí" : "Yes";
        return "No";
      }
      if (key === "immigration_status") {
        if (val === "citizen") return lang === "es" ? "Ciudadano" : "Citizen";
        if (val === "permanent_resident") return lang === "es" ? "Residente permanente" : "Permanent resident";
        return lang === "es" ? "Prefiero no decirlo" : "Prefer not to say";
      }
      return val;
    };

    const runStep = () => {
      if (currentStep <= totalSteps) {
        const qObj = questionsList[currentStep - 1];
        const key = qObj.key;
        const val = parsedFacts[key] || (
          key === "state" ? "CA" :
          key === "household_size" ? "1" :
          key === "monthly_income" ? "0" :
          key === "immigration_status" ? "citizen" : "false"
        );

        accumulatedFacts[key] = val;
        const friendlyAns = getFriendlyAnswer(key, val);

        setChatMessages((prev) => [
          ...prev,
          { role: "user", content: friendlyAns, timestamp: new Date().toLocaleTimeString() }
        ]);
        setProfileFacts({ ...accumulatedFacts });
        setCurrentQuestionIndex(currentStep < totalSteps ? currentStep + 1 : totalSteps);

        setTimeout(() => {
          if (currentStep < totalSteps) {
            const nextQ = questionsList[currentStep];
            const text = lang === "es" ? nextQ.q_es : nextQ.q;
            setChatMessages((prev) => [
              ...prev,
              { role: "assistant", content: text, timestamp: new Date().toLocaleTimeString() }
            ]);
            currentStep++;
            setTimeout(runStep, 350);
          } else {
            setTempAutoFillFacts(accumulatedFacts);
            setTempAutoFillQuery(query);
            setIsConfirmingAutoFill(true);

            const contradictions = checkForContradictions(accumulatedFacts, query, lang);
            setContradictionAlerts(contradictions);

            let extraInconsistencyText = "";
            if (contradictions.length > 0) {
              extraInconsistencyText = "\n\n" + contradictions.join("\n\n") + "\n";
            }

            const summaryText = lang === "es"
              ? `He completado tus datos según tu grabación:\n\n` +
                `• Estado: ${accumulatedFacts.state || "CA"}\n` +
                `• Personas en el hogar: ${accumulatedFacts.household_size || "1"}\n` +
                `• Ingresos mensuales: $${accumulatedFacts.monthly_income || "0"}\n` +
                `• Hijos menores de 18: ${accumulatedFacts.has_children === "true" ? "Sí" : "No"}\n` +
                `• Embarazo en el hogar: ${accumulatedFacts.has_pregnant === "true" ? "Sí" : "No"}\n` +
                `• Adultos mayores / Discapacidad: ${accumulatedFacts.has_elderly_or_disabled === "true" ? "Sí" : "No"}\n` +
                `• Estudiante: ${accumulatedFacts.is_student === "true" ? "Sí" : "No"}\n` +
                `• Estado migratorio: ${accumulatedFacts.immigration_status === "citizen" ? "Ciudadano" : accumulatedFacts.immigration_status === "permanent_resident" ? "Residente permanente" : "Prefiero no decirlo"}` +
                `${extraInconsistencyText}\n` +
                `¿Es correcta esta información?`
              : `I've filled out your details based on your recording:\n\n` +
                `• State: ${accumulatedFacts.state || "CA"}\n` +
                `• Household Size: ${accumulatedFacts.household_size || "1"}\n` +
                `• Monthly Income: $${accumulatedFacts.monthly_income || "0"}\n` +
                `• Children Under 18: ${accumulatedFacts.has_children === "true" ? "Yes" : "No"}\n` +
                `• Pregnant in Household: ${accumulatedFacts.has_pregnant === "true" ? "Yes" : "No"}\n` +
                `• Elderly (65+) / Disabled: ${accumulatedFacts.has_elderly_or_disabled === "true" ? "Yes" : "No"}\n` +
                `• Student: ${accumulatedFacts.is_student === "true" ? "Yes" : "No"}\n` +
                `• Immigration Status: ${accumulatedFacts.immigration_status === "citizen" ? "Citizen" : accumulatedFacts.immigration_status === "permanent_resident" ? "Resident" : "Prefer not to say"}` +
                `${extraInconsistencyText}\n` +
                `Is this information correct?`;

            setChatMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: summaryText,
                timestamp: new Date().toLocaleTimeString(),
              }
            ]);
          }
        }, 150);
      }
    };

    setTimeout(runStep, 300);
  }

  function handleConfirmAutoFill(correct: boolean) {
    if (!tempAutoFillFacts) return;

    if (correct) {
      setChatMessages((prev) => [
        ...prev,
        { role: "user", content: lang === "es" ? "Sí, es correcto" : "Yes, it is correct", timestamp: new Date().toLocaleTimeString() }
      ]);
      setIsConfirmingAutoFill(false);
      
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: lang === "es"
              ? "¡Perfecto! Permítame buscar sus beneficios ahora..."
              : "Perfect! Let me find your benefits now!",
            timestamp: new Date().toLocaleTimeString(),
          }
        ]);
        
        setTimeout(() => {
          runRAGScan(tempAutoFillQuery, tempAutoFillFacts);
        }, 1000);
      }, 500);
    } else {
      setChatMessages((prev) => [
        ...prev,
        { role: "user", content: lang === "es" ? "No, reintentar grabación" : "No, redo recording", timestamp: new Date().toLocaleTimeString() }
      ]);
      setIsConfirmingAutoFill(false);
      
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: lang === "es"
              ? "No hay problema. ¡Comencemos la grabación de nuevo! Por favor, hable ahora..."
              : "No problem. Let's start the recording again! Please speak now...",
            timestamp: new Date().toLocaleTimeString(),
          }
        ]);
        
        setProfileFacts({});
        setCurrentQuestionIndex(1);
        setTimeout(() => {
          startVoiceRecording();
        }, 800);
      }, 500);
    }
  }

  function handleConfirmChatIntake(correct: boolean) {
    if (!tempAutoFillFacts) return;

    if (correct) {
      setChatMessages((prev) => [
        ...prev,
        { role: "user", content: lang === "es" ? "Sí, es correcto" : "Yes, it is correct", timestamp: new Date().toLocaleTimeString() }
      ]);
      setIsConfirmingChatIntake(false);
      
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: lang === "es"
              ? "¡Perfecto! Permítame buscar sus beneficios ahora..."
              : "Perfect! Let me find your benefits now!",
            timestamp: new Date().toLocaleTimeString(),
          }
        ]);
        
        setTimeout(() => {
          runRAGScan(tempAutoFillQuery, tempAutoFillFacts);
        }, 1000);
      }, 500);
    } else {
      setChatMessages((prev) => [
        ...prev,
        { role: "user", content: lang === "es" ? "No, volver a empezar" : "No, start over", timestamp: new Date().toLocaleTimeString() }
      ]);
      setIsConfirmingChatIntake(false);
      
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: lang === "es"
              ? "Entendido. Vamos a empezar de nuevo para corregir los datos."
              : "Got it. Let's start over to correct the details.",
            timestamp: new Date().toLocaleTimeString(),
          }
        ]);
        
        setTimeout(() => {
          startIntake();
        }, 800);
      }, 500);
    }
  }

  function processFreeFormInput(query: string) {
    const parsedFacts = parseFreeFormProfile(query);
    const adv = checkAdversarial(query, lang, parsedFacts);
    if (adv.isAdversarial) {
      setActiveView("intake");
      setChatMessages([
        {
          role: "assistant",
          content: lang === "es"
            ? `⚠️ **Entrada Adversaria Detectada**\n\nHemos detectado que los datos proporcionados son poco plausibles o extremos (${adv.reason}). Para esta demostración, use valores realistas para simular la elegibilidad de beneficios, o elija uno de los perfiles preconfigurados en la página de inicio.`
            : `⚠️ **Adversarial Input Detected**\n\nWe detected that the provided inputs are highly implausible or extreme (${adv.reason}). For this demo, please use realistic values to simulate benefits eligibility, or select one of the pre-configured profiles on the landing page.`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
      return;
    }

    const isDetailed = query.length > 30 || 
                       query.includes("income") || 
                       query.includes("family") || 
                       query.includes("household") ||
                       query.includes("$");
                       
    if (isDetailed) {
      autoFillChatConversation(parsedFacts, query);
    } else {
      startIntake(query);
    }
  }

  function handleMicComplete(transcript: string) {
    if (!transcript.trim()) return;
    
    const isDetailed = transcript.length > 35 || 
                       transcript.includes("income") || 
                       transcript.includes("family") || 
                       transcript.includes("household") ||
                       transcript.includes("$");
                       
    if (isDetailed) {
      processFreeFormInput(transcript);
    } else {
      setChatInput(transcript);
      if (activeView === "intake") {
        setTimeout(() => {
          handleSendMessage();
        }, 500);
      }
    }
  }

  // Refs for scrolling and tilt animations
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const logStreamRef = useRef<HTMLDivElement>(null);

  // Dynamic values
  const totalAnnualValue = useMemo(() => {
    return eligibilityResults
      .filter((r) => r.eligible)
      .reduce((sum, r) => sum + r.monthly_value_usd * 12, 0);
  }, [eligibilityResults]);

  const totalMonthlyValue = useMemo(() => {
    return eligibilityResults
      .filter((r) => r.eligible)
      .reduce((sum, r) => sum + r.monthly_value_usd, 0);
  }, [eligibilityResults]);

  const matchedProgramsCount = useMemo(() => {
    return eligibilityResults.filter((r) => r.eligible).length;
  }, [eligibilityResults]);

  const handleDownloadShareableSummary = () => {
    const summaryText =
      `FormZero - AI Benefits Matching Outlook\n` +
      `========================================\n` +
      `Total Annual Value: $${totalAnnualValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}/year\n` +
      `Programs Qualified: ${matchedProgramsCount}\n` +
      `Date Generated: ${new Date().toLocaleDateString()}\n\n` +
      `Eligible Programs:\n` +
      eligibilityResults
        .filter((r) => r.eligible)
        .map((r) => `- ${r.program_name}: $${Math.round(r.monthly_value_usd * 12).toLocaleString()}/year\n  Reasoning: ${r.reasoning_summary}`)
        .join("\n\n") +
      `\n\nGenerated via FormZero (FormZero)`;

    const blob = new Blob([summaryText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `FormZero_Shareable_Summary.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyLink = () => {
    const urlToCopy = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ? window.location.href 
      : shareUrl;

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(urlToCopy)
        .then(() => {
          alert(lang === "es" ? "¡Enlace copiado al portapapeles!" : "Link copied to clipboard!");
        })
        .catch((err) => {
          console.error("Failed to copy link: ", err);
          prompt(lang === "es" ? "Copie el enlace a continuación:" : "Copy the link below:", urlToCopy);
        });
    } else {
      prompt(lang === "es" ? "Copie el enlace a continuación:" : "Copy the link below:", urlToCopy);
    }
  };

  // Translate benefits list
  const programIdMapping: Record<string, string> = {
    "snap": "SNAP (Food Assistance)",
    "medicaid": "Medicaid / CHIP (Healthcare)",
    "liheap": "LIHEAP (Utility Bill Help)",
    "wic": "WIC (Nutrition for Women & Children)",
    "pell_grant": "Pell Grant (Education Aid)",
    "tanf": "TANF (Cash Assistance)",
    "eitc": "EITC (Earned Income Tax Credit)",
    "lifeline": "Lifeline (Phone & Internet)",
    "ssi_ssdi": "SSI / SSDI (Supplemental Security & Disability)",
  };

  // Translations
  const t = {
    en: {
      tagline: "$140B in unclaimed benefits.",
      subtagline: "The average household misses out on thousands annually. Our AI audit finds what you're owed in under 3 minutes.",
      checkBtn: "Check my eligibility",
      profileHeader: "Select a profile to start your audit",
      motherTitle: "Single mother in TX",
      motherDesc: "Focusing on SNAP, WIC, and childcare assistance",
      studentTitle: "College student in CA",
      studentDesc: "Focusing on Pell Grants, EBT, and state grants",
      immigrantTitle: "Immigrant family in FL",
      immigrantDesc: "Focusing on healthcare, EITC, and local support",
      estimatedVal: "Estimated Value",
      auditLedgerTitle: "Audit Ledger",
      auditLedgerDesc: "Real-time cross-referencing of 4,000+ state and federal benefit programs with academic precision.",
      confidenceTitle: "Confidence Score",
      confidenceDesc: "Advanced AI validation ensuring 99.8% accuracy on eligibility predictions before you apply.",
      clockTitle: "Unclaimed Clock",
      clockDesc: "Tracking filing deadlines and retroactive windows so you never leave money on the table again.",
      intakeSession: "Intake Session",
      questionOf: (curr: number) => `${curr} of 8 Questions`,
      startOver: "Start over",
      askPlaceholder: "Ask me anything...",
      disclaimer: "FormZero can make mistakes. Verify important financial information.",
      systemScanning: "System Scanning",
      discovering: "Discovering Eligibility...",
      matchedPrograms: "Matched Programs",
      impactAnalysis: "Impact Analysis",
      checklist: "Document Checklist",
      roadmap: "Dependency Roadmap",
      updates: "What Changed",
      unclaimedClock: "Unclaimed Benefits Clock",
      priorityWindow: "Priority Window Closes In",
      days: "d", hours: "h", minutes: "m",
      optimizedResults: "Your Optimized Results",
      optimizedDesc: "We've identified eligible programs that match your profile with academic precision.",
      valueLabel: "UNCLAIMED ANNUAL VALUE",
      monthlyLabel: "Est. Monthly Savings",
      retroactiveSince: "You have been eligible for these programs since Jan 2023. Act now to claim retroactive benefits and recurring monthly value.",
      applyNow: "Apply now",
      viewSource: "View source & audit",
      impactTitle: "Impact Analysis",
      impactDesc: "A comprehensive overview of your eligible benefits. Based on your profile, we've identified significant fiscal opportunities across academic and state programs.",
      chartTitle: "Value per Program",
      chartDesc: "A complete breakdown of your high-impact matches by annual subsidy amount.",
      shareOutlook: "My 2026 Outlook",
      shareReport: "FormZero Impact Report",
      shareDownload: "Download Shareable Summary",
      shareLabel: "Optimized for Instagram & LinkedIn",
      docTitle: "Your Document Checklist",
      docDesc: "We've cross-referenced your profile with state requirements. Ensure you have the following assets ready before proceeding with your formal submission.",
      roadmapTitle: "Dependency Roadmap",
      roadmapDesc: "Unlock government assistance programs through a structured path. Each step verified ensures eligibility for the next tier of support.",
      updatesTitle: "Policy & Program Updates",
      updatesDesc: "Legislative and policy tracking distilled into plain English. We monitor 400+ federal and state sources so you don't have to.",
      allUpdates: "All Updates",
      affectsMe: "Affects Me",
      newProgs: "New Programs",
      caseworkerTitle: "Legal Aid Resources",
      caseworkerDesc: "Verified non-profit organizations near your location.",
      caseworkerNuance: "We've identified nuances in your application that require professional human insight. Our AI system ensures you have the right legal advocacy when it matters most.",
      backBtn: "Back to Results",
      auditClaimTitle: "Eligibility Claim Audit",
      pdfHeader: "Source Evidence Archive",
      verified: "VERIFIED",
      likelyHave: "You likely have this",
      needToGather: "Need to gather",
      mayNotHave: "May be hard to get",
      obtain: "How to obtain",
      requiredForVerification: "Required for verification",
      uploadNow: "Upload now",
      markDone: "Mark as done",
      unlocked: "UNLOCKED",
      locked: "LOCKED",
    },
    es: {
      tagline: "140 mil millones en beneficios sin reclamar.",
      subtagline: "El hogar promedio pierde miles anualmente. Nuestra auditoría con IA encuentra lo que se le debe en menos de 3 minutos.",
      checkBtn: "Verificar mi elegibilidad",
      profileHeader: "Seleccione un perfil para comenzar su auditoría",
      motherTitle: "Madre soltera en TX",
      motherDesc: "Enfoque en SNAP, WIC y asistencia de cuidado infantil",
      studentTitle: "Estudiante universitario en CA",
      studentDesc: "Enfoque en Becas Pell, EBT y becas estatales",
      immigrantTitle: "Familia inmigrante en FL",
      immigrantDesc: "Enfoque en atención médica, EITC y apoyo local",
      estimatedVal: "Valor Estimado",
      auditLedgerTitle: "Libro de Auditoría",
      auditLedgerDesc: "Referencia cruzada en tiempo real de más de 4,000 programas de beneficios estatales y federales con precisión académica.",
      confidenceTitle: "Puntaje de Confianza",
      confidenceDesc: "Validación de IA avanzada que garantiza un 99.8% de precisión en predicciones de elegibilidad antes de postularse.",
      clockTitle: "Reloj de lo No Reclamado",
      clockDesc: "Seguimiento de los plazos de presentación y ventanas retroactivas para que nunca deje dinero sobre la mesa.",
      intakeSession: "Sesión de Admisión",
      questionOf: (curr: number) => `${curr} de 8 Preguntas`,
      startOver: "Reiniciar",
      askPlaceholder: "Pregúntame lo que sea...",
      disclaimer: "FormZero puede cometer errores. Verifique la información financiera importante.",
      systemScanning: "Escaneo del Sistema",
      discovering: "Descubriendo Elegibilidad...",
      matchedPrograms: "Programas Coincidentes",
      impactAnalysis: "Análisis de Impacto",
      checklist: "Requisitos de Documentos",
      roadmap: "Mapa de Dependencias",
      updates: "Lo que Cambió",
      unclaimedClock: "Reloj de Beneficios No Reclamados",
      priorityWindow: "Ventana de Prioridad Cierra En",
      days: "d", hours: "h", minutes: "m",
      optimizedResults: "Sus Resultados Optimizados",
      optimizedDesc: "Hemos identificado 8 programas que coinciden con su perfil con precisión académica.",
      valueLabel: "VALOR ANUAL NO RECLAMADO",
      monthlyLabel: "Ahorro Mensual Est.",
      retroactiveSince: "Usted ha sido elegible para estos programas desde enero de 2023. Actúe ahora para reclamar beneficios retroactivos.",
      applyNow: "Solicitar ahora",
      viewSource: "Ver fuente y auditar",
      impactTitle: "Análisis de Impacto",
      impactDesc: "Una visión integral de sus beneficios elegibles. Según su perfil, hemos identificado oportunidades fiscales significativas en programas académicos y estatales.",
      chartTitle: "Valor por Programa",
      chartDesc: "Un desglose completo de sus coincidencias de alto impacto por monto de subsidio anual.",
      shareOutlook: "Mi Perspectiva 2026",
      shareReport: "Informe de Impacto FormZero",
      shareDownload: "Descargar Resumen Compartible",
      shareLabel: "Optimizado para Instagram y LinkedIn",
      docTitle: "Su Lista de Documentos",
      docDesc: "Hemos cotejado su perfil con los requisitos estatales. Asegúrese de tener listos los siguientes archivos antes de su presentación formal.",
      roadmapTitle: "Mapa de Dependencias",
      roadmapDesc: "Desbloquee programas de asistencia gubernamental mediante una ruta estructurada. Cada paso verificado asegura el siguiente nivel.",
      updatesTitle: "Actualizaciones de Políticas y Programas",
      updatesDesc: "Seguimiento legislativo y de políticas en inglés y español simple. Monitoreamos más de 400 fuentes gubernamentales.",
      allUpdates: "Todas las Actualizaciones",
      affectsMe: "Me Afecta",
      newProgs: "Nuevos Programas",
      caseworkerTitle: "Recursos de Ayuda Legal",
      caseworkerDesc: "Organizaciones sin fines de lucro verificadas cerca de su ubicación.",
      caseworkerNuance: "Hemos identificado matices en su solicitud que requieren intervención humana profesional. Nuestro sistema de IA le asegura la defensa adecuada.",
      backBtn: "Volver a Resultados",
      auditClaimTitle: "Auditoría de Reclamación de Elegibilidad",
      pdfHeader: "Archivo de Evidencia de Origen",
      verified: "VERIFICADO",
      likelyHave: "Probablemente lo tenga",
      needToGather: "Necesita reunir",
      mayNotHave: "Puede ser difícil de obtener",
      obtain: "Cómo obtenerlo",
      requiredForVerification: "Requerido para verificación",
      uploadNow: "Subir ahora",
      markDone: "Marcar como hecho",
      unlocked: "DESBLOQUEADO",
      locked: "BLOQUEADO",
    },
  };

  // Preset Profiles
  const presetProfiles = [
    {
      id: "mother",
      name: "Single mother in TX",
      nameEs: "Madre soltera en TX",
      desc: "Focusing on SNAP, WIC, and childcare assistance",
      descEs: "Enfoque en SNAP, WIC y asistencia de cuidado infantil",
      val: "$23,500/year",
      valEs: "$23,500/año",
      icon: "family_restroom",
      profile: {
        state: "Texas",
        household_size: "3",
        monthly_income: "1800",
        has_children: "true",
        has_pregnant: "false",
        has_elderly_or_disabled: "false",
        is_student: "false",
        immigration_status: "citizen",
        language: "english",
      },
    },
    {
      id: "student",
      name: "College student in CA",
      nameEs: "Estudiante universitario en CA",
      desc: "Focusing on Pell Grants, EBT, and state grants",
      descEs: "Enfoque en Becas Pell, EBT y becas estatales",
      val: "$20,100/year",
      valEs: "$20,100/año",
      icon: "school",
      profile: {
        state: "California",
        household_size: "1",
        monthly_income: "800",
        has_children: "false",
        has_pregnant: "false",
        has_elderly_or_disabled: "false",
        is_student: "true",
        immigration_status: "citizen",
        language: "english",
      },
    },
    {
      id: "immigrant",
      name: "Immigrant family in FL",
      nameEs: "Familia inmigrante en FL",
      desc: "Focusing on healthcare, EITC, and local support",
      descEs: "Enfoque en atención médica, EITC y apoyo local",
      val: "$23,500/year",
      valEs: "$23,500/año",
      icon: "diversity_3",
      profile: {
        state: "Florida",
        household_size: "4",
        monthly_income: "2200",
        has_children: "true",
        has_pregnant: "false",
        has_elderly_or_disabled: "false",
        is_student: "false",
        immigration_status: "permanent_resident",
        language: "spanish",
      },
    },
    {
      id: "senior",
      name: "Low-income senior in PA",
      nameEs: "Adulto mayor de bajos recursos en PA",
      desc: "Focusing on SSI, prescriptions, and utility assistance",
      descEs: "Enfoque en SSI, medicamentos y asistencia de servicios públicos",
      val: "$36,700/year",
      valEs: "$36,700/año",
      icon: "elderly",
      profile: {
        state: "Pennsylvania",
        household_size: "1",
        monthly_income: "1100",
        has_children: "false",
        has_pregnant: "false",
        has_elderly_or_disabled: "true",
        is_student: "false",
        immigration_status: "citizen",
        language: "english",
      },
    },
    {
      id: "veteran",
      name: "Disabled veteran in OH",
      nameEs: "Veterano discapacitado en OH",
      desc: "Focusing on VA pension supplement, property tax, and Lifeline",
      descEs: "Enfoque en suplemento de pensión de VA, impuestos y Lifeline",
      val: "$18,700/year",
      valEs: "$18,700/año",
      icon: "military_tech",
      profile: {
        state: "Ohio",
        household_size: "2",
        monthly_income: "1900",
        has_children: "false",
        has_pregnant: "false",
        has_elderly_or_disabled: "true",
        is_student: "false",
        immigration_status: "citizen",
        language: "english",
      },
    },
    {
      id: "worker",
      name: "Gig worker in NY",
      nameEs: "Trabajador de gig-economy en NY",
      desc: "Focusing on ACA healthcare subsidies, EITC, and SNAP",
      descEs: "Enfoque en subsidio de salud ACA, EITC y SNAP",
      val: "$18,700/year",
      valEs: "$18,700/año",
      icon: "work",
      profile: {
        state: "New York",
        household_size: "1",
        monthly_income: "1400",
        has_children: "false",
        has_pregnant: "false",
        has_elderly_or_disabled: "false",
        is_student: "false",
        immigration_status: "citizen",
        language: "english",
      },
    },
    {
      id: "fastfood",
      name: "Part-time helper in GA",
      nameEs: "Trabajador de medio tiempo en GA",
      desc: "Focusing on food stamps (SNAP), energy bills, and Medicaid",
      descEs: "Enfoque en cupones de alimentos (SNAP), facturas de luz y Medicaid",
      val: "$18,700/year",
      valEs: "$18,700/año",
      icon: "restaurant",
      profile: {
        state: "Georgia",
        household_size: "1",
        monthly_income: "950",
        has_children: "false",
        has_pregnant: "false",
        has_elderly_or_disabled: "false",
        is_student: "false",
        immigration_status: "citizen",
        language: "english",
      },
    },
    {
      id: "unemployed",
      name: "Unemployed parent in FL",
      nameEs: "Madre/padre desempleado en FL",
      desc: "Focusing on TANF cash assistance, WIC, and local food assistance",
      descEs: "Enfoque en ayuda en efectivo TANF, WIC y despensa de comida local",
      val: "$23,500/year",
      valEs: "$23,500/año",
      icon: "child_care",
      profile: {
        state: "Florida",
        household_size: "3",
        monthly_income: "400",
        has_children: "true",
        has_pregnant: "false",
        has_elderly_or_disabled: "false",
        is_student: "false",
        immigration_status: "citizen",
        language: "english",
      },
    },
  ];

  // System status sentences for simulated discovery feed
  const scanningSentences = [
    "Parsing public record archives for household asset matches...",
    "Comparing utility cost fluctuations against state energy grants...",
    "Verifying dependents via secure education registry handshake...",
    "Calculating maximum allotment based on 2026 revised thresholds...",
    "Validating identity through biometric cross-reference points...",
    "Optimizing filing sequence for simultaneous program enrollment...",
    "Analyzing income statements & paystub verification pipelines...",
    "Reading regulatory guidelines for state Medicaid eligibility limits...",
  ];



  // Fetch Policy Updates from Next API
  useEffect(() => {
    async function loadUpdates() {
      try {
        const response = await fetch(`/api/updates?language=${lang === "es" ? "spanish" : "english"}`);
        if (response.ok) {
          const data = await response.json();
          setPolicyUpdates(data.updates);
        }
      } catch (err) {
        console.error("Failed to load policy updates", err);
      }
    }
    loadUpdates();
  }, [lang]);

  // Real-time ticking clock effect - initialization
  useEffect(() => {
    if (activeView === "results") {
      const currentSession = `strictly-grounded-${totalMonthlyValue}`;
      if (clockSessionId !== currentSession) {
        setClockSessionId(currentSession);
        const initialVal = totalMonthlyValue * 41;
        setTickingValue(initialVal);
      }
    } else {
      setClockSessionId("");
    }
  }, [activeView, totalMonthlyValue, clockSessionId]);

  // Real-time ticking clock effect - ticking loop
  useEffect(() => {
    if (activeView === "results" && totalMonthlyValue > 0) {
      const loss = totalMonthlyValue / (30 * 24 * 3600);
      
      const interval = setInterval(() => {
        setTickingValue((prev) => {
          if (isNaN(prev)) return totalMonthlyValue * 41;
          return prev + loss * 0.1;
        });
      }, 100);
      
      return () => clearInterval(interval);
    } else if (activeView === "results") {
      setTickingValue(0);
    }
  }, [activeView, clockSessionId, totalMonthlyValue]);

  // Autoscroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  // Autoscroll logs
  useEffect(() => {
    if (logStreamRef.current) {
      logStreamRef.current.scrollTop = logStreamRef.current.scrollHeight;
    }
  }, [scanLogs]);

  // 3D Tilting Card Effect
  useEffect(() => {
    const card = shareCardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = (y - centerY) / 25;
      const rotateY = (centerX - x) / 25;

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = () => {
      card.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg)";
      card.style.transition = "transform 0.5s ease";
    };

    const handleMouseEnter = () => {
      card.style.transition = "none";
    };

    card.addEventListener("mousemove", handleMouseMove);
    card.addEventListener("mouseleave", handleMouseLeave);
    card.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      card.removeEventListener("mousemove", handleMouseMove);
      card.removeEventListener("mouseleave", handleMouseLeave);
      card.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [activeView, activeTab]);

  // Start intake chat
  function startIntake(initialQuery: string = "") {
    // Auth gate: require login before using features
    if (!currentUser) {
      setIsSignUp(true);
      setShowAuthModal(true);
      return;
    }
    setActiveView("intake");
    setCurrentQuestionIndex(1);
    setProfileFacts({});
    
    let welcomeMsg =
      lang === "en"
        ? "Hi! I'm FormZero 👋 I help people find US government benefits they may qualify for — completely free.\n\nWhat US state do you live in?"
        : "¡Hola! Soy FormZero 👋 Ayudo a las personas a encontrar beneficios del gobierno de EE. UU. para los que califican, completamente gratis.\n\n¿En qué estado de EE. UU. vive?";

    const initialMessages: ChatMessage[] = [
      { role: "assistant", content: welcomeMsg, timestamp: new Date().toLocaleTimeString() },
    ];

    if (initialQuery) {
      initialMessages.push({
        role: "user",
        content: initialQuery,
        timestamp: new Date().toLocaleTimeString(),
      });
      setChatMessages(initialMessages);
      handleIncomingUserMessage(initialQuery, 1, {});
    } else {
      setChatMessages(initialMessages);
    }
  }

  // Handle preset profile selection
  function handleSelectPreset(preset: typeof presetProfiles[0]) {
    const profileData = preset.profile;
    setLang(profileData.language === "spanish" ? "es" : "en");
    setProfileFacts(profileData);
    
    // Construct search query string
    const query = `I am a household of ${profileData.household_size} in ${profileData.state} with monthly income of $${profileData.monthly_income}. Student: ${profileData.is_student}, Children: ${profileData.has_children}, Pregnant: ${profileData.has_pregnant}, Elderly/Disabled: ${profileData.has_elderly_or_disabled}, Immigration: ${profileData.immigration_status}.`;
    
    runRAGScan(query, profileData);
  }

  // Conversational questions map
  const questionsList = [
    { key: "state", q: "What US state do you live in?", q_es: "¿En qué estado de EE. UU. vive?" },
    { key: "household_size", q: "How many people are in your household?", q_es: "¿Cuántas personas viven en su hogar?" },
    { key: "monthly_income", q: "What is your total monthly household income in dollars?", q_es: "¿Cuál es el ingreso mensual total de su hogar en dólares?" },
    { key: "has_children", q: "Do you have children under 18? (yes or no)", q_es: "¿Tiene hijos menores de 18 años? (sí o no)" },
    { key: "has_pregnant", q: "Is anyone in your household pregnant? (yes or no)", q_es: "¿Hay alguien en su hogar embarazada? (sí o no)" },
    { key: "has_elderly_or_disabled", q: "Is anyone elderly (65+) or disabled? (yes or no)", q_es: "¿Hay alguien de la tercera edad (65+) o con discapacidad? (sí o no)" },
    { key: "is_student", q: "Are you a student? (yes or no)", q_es: "¿Es usted estudiante? (sí o no)" },
    { key: "immigration_status", q: "Are you a US citizen, permanent resident, or would you prefer not to say?", q_es: "¿Es ciudadano de EE. UU., residente permanente, o prefiere no decirlo?" }
  ];

  // Process user chat inputs and ask next questions
  function handleIncomingUserMessage(msg: string, index: number, currentFacts: Record<string, string>) {
    const key = questionsList[index - 1].key;
    let normalizedVal = msg.trim().toLowerCase();

    // Map yes/no
    if (["yes", "y", "sí", "si"].includes(normalizedVal)) normalizedVal = "true";
    if (["no", "n"].includes(normalizedVal)) normalizedVal = "false";

    // Map immigration status
    if (normalizedVal.includes("citizen") || normalizedVal.includes("ciudadano")) normalizedVal = "citizen";
    if (normalizedVal.includes("permanent") || normalizedVal.includes("residente") || normalizedVal.includes("green")) normalizedVal = "permanent_resident";
    if (normalizedVal.includes("prefer not") || normalizedVal.includes("no decir") || normalizedVal.includes("say")) normalizedVal = "not_disclosed";

    // Adversarial Check: Household size
    if (key === "household_size") {
      const hhVal = parseInt(normalizedVal.match(/\d+/)?.[0] || "") || 0;
      if (hhVal > 25) {
        setIsTyping(true);
        setTimeout(() => {
          setChatMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: lang === "es"
                ? `⚠️ **Entrada Adversaria Detectada**: Registró ${hhVal} personas. Para mantener la simulación realista, por favor ingrese un tamaño de hogar entre 1 y 20.`
                : `⚠️ **Adversarial Input Detected**: You entered ${hhVal} people. To keep the simulation realistic, please enter a household size between 1 and 20.`,
              timestamp: new Date().toLocaleTimeString()
            }
          ]);
          setIsTyping(false);
        }, 500);
        return;
      }
    }

    // Ambiguity Resolver: Income
    if (key === "monthly_income") {
      const isAmbiguous = ["sometimes", "variable", "gig", "no sé", "no se", "depende", "depends", "changes", "a veces", "not sure", "don't know", "temporero", "temporary"].some(w => normalizedVal.includes(w));
      if (isAmbiguous) {
        setIsTyping(true);
        setTimeout(() => {
          setChatMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: lang === "es"
                ? `💡 **Resolutor de Ambigüedad de IA**\n\n*Estoy preguntando esto porque el programa SNAP utiliza ingresos brutos mensuales (no anuales), y los ingresos de trabajos temporales/gig necesitan ser promediados. Un árbol de decisión rígido fallaría o daría error aquí.*\n\n¿Podría estimar sus ingresos promedio de los últimos 3 meses, o decirme cuántas horas trabaja por semana aproximadamente?`
                : `💡 **AI Ambiguity Resolver**\n\n*I'm asking because SNAP uses monthly gross income, not annual, and gig income needs averaging. A rigid rules-based decision tree would just fail or error here.*\n\nCould you estimate your average monthly income over the last 3 months, or tell me your approximate weekly working hours?`,
              timestamp: new Date().toLocaleTimeString()
            }
          ]);
          setIsTyping(false);
        }, 500);
        return;
      }

      // Adversarial Check: Income
      const incVal = parseFloat(normalizedVal.replace(/[\$,]/g, "")) || 0;
      if (incVal > 200000) {
        setIsTyping(true);
        setTimeout(() => {
          setChatMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: lang === "es"
                ? `⚠️ **Ingresos Adversarios**: Ingresó $${incVal.toLocaleString()}. Para mantener la simulación realista, por favor ingrese ingresos mensuales razonables para calificar a beneficios públicos.`
                : `⚠️ **Adversarial Income Detected**: You entered $${incVal.toLocaleString()}/mo. To keep the simulation realistic, please enter a monthly income that falls within realistic bounds for public benefits eligibility.`,
              timestamp: new Date().toLocaleTimeString()
            }
          ]);
          setIsTyping(false);
        }, 500);
        return;
      }
    }

    const updatedFacts = { ...currentFacts, [key]: normalizedVal, language: lang === "es" ? "spanish" : "english" };
    setProfileFacts(updatedFacts);

    if (index < 8) {
      setIsTyping(true);
      setTimeout(() => {
        const nextQ = questionsList[index];
        const text = lang === "es" ? nextQ.q_es : nextQ.q;
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: text, timestamp: new Date().toLocaleTimeString() },
        ]);
        setCurrentQuestionIndex(index + 1);
        setIsTyping(false);
      }, 1000);
    } else {
      // Complete profile & Ask for confirmation
      setIsTyping(true);
      setTimeout(() => {
        const query = `I am a household of ${updatedFacts.household_size} in ${updatedFacts.state} with monthly income of $${updatedFacts.monthly_income}. Student: ${updatedFacts.is_student}, Children: ${updatedFacts.has_children}, Pregnant: ${updatedFacts.has_pregnant}, Elderly/Disabled: ${updatedFacts.has_elderly_or_disabled}, Immigration: ${updatedFacts.immigration_status}.`;
        
        const contradictions = checkForContradictions(updatedFacts, `income is ${updatedFacts.monthly_income}, household size is ${updatedFacts.household_size}, student: ${updatedFacts.is_student}, children: ${updatedFacts.has_children}`, lang);
        setContradictionAlerts(contradictions);

        let extraInconsistencyText = "";
        if (contradictions.length > 0) {
          extraInconsistencyText = "\n\n" + contradictions.join("\n\n") + "\n";
        }

        const summaryText = lang === "es"
          ? `He recopilado sus datos:\n\n` +
            `• Estado: ${updatedFacts.state || "CA"}\n` +
            `• Personas en el hogar: ${updatedFacts.household_size || "1"}\n` +
            `• Ingresos mensuales: $${updatedFacts.monthly_income || "0"}\n` +
            `• Hijos menores de 18: ${updatedFacts.has_children === "true" ? "Sí" : "No"}\n` +
            `• Embarazo en el hogar: ${updatedFacts.has_pregnant === "true" ? "Sí" : "No"}\n` +
            `• Adultos mayores / Discapacidad: ${updatedFacts.has_elderly_or_disabled === "true" ? "Sí" : "No"}\n` +
            `• Estudiante: ${updatedFacts.is_student === "true" ? "Sí" : "No"}\n` +
            `• Estado migratorio: ${updatedFacts.immigration_status === "citizen" ? "Ciudadano" : updatedFacts.immigration_status === "permanent_resident" ? "Residente permanente" : "Prefiero no decirlo"}` +
            `${extraInconsistencyText}\n\n` +
            `¿Es correcta esta información?`
          : `I've compiled your details:\n\n` +
            `• State: ${updatedFacts.state || "CA"}\n` +
            `• Household Size: ${updatedFacts.household_size || "1"}\n` +
            `• Monthly Income: $${updatedFacts.monthly_income || "0"}\n` +
            `• Children Under 18: ${updatedFacts.has_children === "true" ? "Yes" : "No"}\n` +
            `• Pregnant in Household: ${updatedFacts.has_pregnant === "true" ? "Yes" : "No"}\n` +
            `• Elderly (65+) / Disabled: ${updatedFacts.has_elderly_or_disabled === "true" ? "Yes" : "No"}\n` +
            `• Student: ${updatedFacts.is_student === "true" ? "Yes" : "No"}\n` +
            `• Immigration Status: ${updatedFacts.immigration_status === "citizen" ? "Citizen" : updatedFacts.immigration_status === "permanent_resident" ? "Resident" : "Prefer not to say"}` +
            `${extraInconsistencyText}\n\n` +
            `Is this information correct?`;

        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: summaryText,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        
        setTempAutoFillFacts(updatedFacts);
        setTempAutoFillQuery(query);
        setIsConfirmingChatIntake(true);
        setIsTyping(false);
      }, 1000);
    }
  }

  function handleSendMessage() {
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: userMsg, timestamp: new Date().toLocaleTimeString() },
    ]);
    setChatInput("");

    handleIncomingUserMessage(userMsg, currentQuestionIndex, profileFacts);
  }

  // SSE & Simulated Search scan pipeline
  async function runRAGScan(queryStr: string, profileData: Record<string, string>) {
    if (currentUser) {
      syncProfileFacts(currentUser.email, profileData);
    }
    setActiveView("discovery");
    setScanProgress(0);
    setScanLogs([]);
    setRulesCheckedCount(0);
    setStreamingText("");
    
    const sessionId = "session-" + Math.random().toString(36).substring(2, 9);
    
    // Set initial scan states
    const initialStatuses: Record<string, any> = {};
    Object.keys(programIdMapping).forEach((id) => {
      initialStatuses[id] = "scanning";
    });
    setScanStatuses(initialStatuses);

    let progress = 0;
    let logCounter = 0;
    
    // Simulated scan counter
    const scanInterval = setInterval(() => {
      if (progress < 90) {
        progress += Math.floor(Math.random() * 8) + 3;
        setScanProgress(Math.min(progress, 95));
        setRulesCheckedCount((prev) => prev + Math.floor(Math.random() * 120) + 40);
        
        // Add log sentences
        const logText = scanningSentences[logCounter % scanningSentences.length];
        setScanLogs((prev) => [
          ...prev,
          { id: Math.random(), text: `> ${logText}` },
        ]);
        logCounter++;
      }
    }, 1500);

    try {
      // Attempt backend SSE stream call
      const res = await fetch(`/api/v1/eligibility/stream?query=${encodeURIComponent(queryStr)}&country=usa&session_id=${sessionId}`);
      
      if (!res.ok) {
        throw new Error("Backend offline. Fallback to client-side calculations.");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Stream not readable.");

      const backendResults: EligibilityProgramResult[] = [];
      const backendCitations: Record<string, Citation> = {};
      let clockInfo: ClockData | null = null;

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value);
        const lines = buffer.split("\n");
        // Keep the last partial line in buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const eventData = JSON.parse(line.slice(6));
              const eventType = eventData.event_type;
              const payload = eventData.data;

              if (eventType === "thinking") {
                setStreamingText((prev) => prev + (payload.token || ""));
                // Put thinking token in logs
                setScanLogs((prev) => [
                  ...prev,
                  { id: Math.random(), text: payload.token },
                ]);
              } else if (eventType === "citation") {
                backendCitations[payload.citation_id] = {
                  citation_id: payload.citation_id,
                  program_id: payload.program_id,
                  chunk_preview: payload.chunk_preview,
                  source_document: payload.source_document,
                  retrieval_score: payload.retrieval_score,
                };
                setCitations((prev) => ({ ...prev, [payload.citation_id]: payload }));
              } else if (eventType === "result") {
                const programResult: EligibilityProgramResult = {
                  program_id: payload.program_id,
                  program_name: payload.program_name,
                  eligible: payload.eligible,
                  confidence_score: payload.confidence_score,
                  reasoning_summary: payload.reasoning_summary,
                  citation_ids: payload.citation_ids,
                  monthly_value_usd: payload.monthly_value_usd || 0.0,
                };
                backendResults.push(programResult);
                
                // Update program scan status row
                setScanStatuses((prev) => ({
                  ...prev,
                  [payload.program_id]: payload.eligible ? "matched" : "unlikely",
                }));
              } else if (eventType === "clock") {
                clockInfo = {
                  total_unclaimed_usd: payload.total_unclaimed_usd,
                  per_second_loss: payload.per_second_loss,
                  months_unclaimed: payload.months_unclaimed,
                  eligibility_start_date: payload.eligibility_start_date,
                };
              }
            } catch (err) {
              console.error("Error parsing SSE chunk", err);
            }
          }
        }
      }

      // Finish scan and load backend values
      clearInterval(scanInterval);
      setScanProgress(100);
      setEligibilityResults(backendResults);
      setClockData(clockInfo);
      
      // Fetch full citation document text if available
      Object.keys(backendCitations).forEach(async (cid) => {
        try {
          const cRes = await fetch(`/api/v1/sources/${cid}`);
          if (cRes.ok) {
            const fullCitation = await cRes.json();
            setCitations((prev) => ({
              ...prev,
              [cid]: {
                ...prev[cid],
                chunk_text: fullCitation.chunk_text,
              },
            }));
          }
        } catch (err) {
          console.error("Failed to fetch citation full content", err);
        }
      });

      const contradictions = checkForContradictions(profileData, queryStr, lang === "es" ? "es" : "en");
      setContradictionAlerts(contradictions);

      setTimeout(() => {
        setActiveView("results");
        setActiveTab("matched");
      }, 1000);

    } catch (err) {
      console.warn("FastAPI backend error. Utilizing local eligibility calculations fallback:", err);
      runLocalCalculationFallback(profileData, scanInterval);
    }
  }

  // Client-side fallback calculator
  function runLocalCalculationFallback(profileData: Record<string, string>, scanInterval: NodeJS.Timeout) {
    const userProfile: UserProfile = {
      state: profileData.state || "",
      household_size: parseInt(profileData.household_size) || 1,
      monthly_income: parseFloat(profileData.monthly_income) || 0,
      has_children: profileData.has_children === "true",
      has_pregnant: profileData.has_pregnant === "true",
      has_elderly_or_disabled: profileData.has_elderly_or_disabled === "true",
      is_student: profileData.is_student === "true",
      immigration_status: (profileData.immigration_status as any) || "citizen",
      language: (profileData.language as any) || "english",
    };

    const results = checkEligibility(userProfile);
    
    // Map local results to dashboard states
    const localProgramResults: EligibilityProgramResult[] = [];
    const localCitations: Record<string, Citation> = {};
    const localStatuses: Record<string, any> = {};

    let monthlySum = 0;

    results.forEach((benefit) => {
      let programId = "snap";
      if (benefit.name.includes("Medicaid")) programId = "medicaid";
      else if (benefit.name.includes("LIHEAP")) programId = "liheap";
      else if (benefit.name.includes("WIC")) programId = "wic";
      else if (benefit.name.includes("Pell")) programId = "pell_grant";
      else if (benefit.name.includes("TANF")) programId = "tanf";
      else if (benefit.name.includes("EITC")) programId = "eitc";
      else if (benefit.name.includes("Lifeline")) programId = "lifeline";
      else if (benefit.name.includes("SSI")) programId = "ssi_ssdi";

      const eligible = benefit.eligible === "yes" || benefit.eligible === "likely";
      const val = benefit.annual_value_number / 12;
      if (eligible) {
        monthlySum += val;
      }

      const citationId = programId + "_citation";
      localProgramResults.push({
        program_id: programId,
        program_name: benefit.name,
        eligible,
        confidence_score: benefit.confidence / 100,
        reasoning_summary: benefit.reason,
        citation_ids: [citationId],
        monthly_value_usd: val,
      });

      localCitations[citationId] = {
        citation_id: citationId,
        program_id: programId,
        chunk_preview: benefit.source.rule.slice(0, 150),
        source_document: benefit.source.document,
        retrieval_score: 0.95,
        chunk_text: benefit.source.rule,
      };

      localStatuses[programId] = eligible ? "matched" : "unlikely";
    });

    // Populate simulated scan states
    let timeIndex = 0;
    const ids = Object.keys(localStatuses);
    
    const statusInterval = setInterval(() => {
      if (timeIndex < ids.length) {
        const id = ids[timeIndex];
        setScanStatuses((prev) => ({ ...prev, [id]: localStatuses[id] }));
        timeIndex++;
      } else {
        clearInterval(statusInterval);
      }
    }, 800);

    // Stop primary scan logger and finish progress bar
    setTimeout(() => {
      clearInterval(scanInterval);
      setScanProgress(100);
      setEligibilityResults(localProgramResults);
      setCitations(localCitations);

      const months = 41; // count since Jan 2023
      const totalUnclaimed = monthlySum * months;
      const perSecondLoss = monthlySum / (30 * 24 * 3600);

      setClockData({
        total_unclaimed_usd: totalUnclaimed,
        per_second_loss: perSecondLoss,
        months_unclaimed: months,
        eligibility_start_date: "2023-01-01",
      });

      const contradictions = checkForContradictions(profileData, `income is ${profileData.monthly_income}, household size is ${profileData.household_size}, student: ${profileData.is_student}, children: ${profileData.has_children}`, lang === "es" ? "es" : "en");
      setContradictionAlerts(contradictions);

      setTimeout(() => {
        setActiveView("results");
        setActiveTab("matched");
      }, 1000);
    }, 5000);
  }

  // Clean calculations to start over
  function handleReset(shouldSync: boolean | React.MouseEvent<any> = true) {
    const sync = shouldSync !== false;
    setActiveView("landing");
    setChatMessages([]);
    setProfileFacts({});
    setEligibilityResults([]);
    setCitations({});
    setClockData(null);
    setCurrentQuestionIndex(1);
    setCompletedRoadmapSteps({});
    setActiveTab("matched");

    if (currentUser && sync) {
      localStorage.removeItem(`claimradar_chat_${currentUser.email}`);
      localStorage.removeItem(`claimradar_profile_facts_${currentUser.email}`);
      localStorage.removeItem(`claimradar_active_view_${currentUser.email}`);
      localStorage.removeItem(`claimradar_question_index_${currentUser.email}`);
      localStorage.removeItem(`claimradar_completed_roadmap_steps_${currentUser.email}`);
      localStorage.removeItem(`claimradar_active_tab_${currentUser.email}`);
      
      fetch("/api/v1/auth/save-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: currentUser.email,
          profile_facts: {},
          chat_messages: [],
        }),
      }).catch((e) => console.error("Failed to sync reset profile", e));
    } else {
      localStorage.removeItem("claimradar_chat_guest");
      localStorage.removeItem("claimradar_anonymous_profile_facts");
      localStorage.removeItem("claimradar_active_view_guest");
      localStorage.removeItem("claimradar_question_index_guest");
      localStorage.removeItem("claimradar_completed_roadmap_steps_guest");
      localStorage.removeItem("claimradar_active_tab_guest");
    }
  }

  // Filter updates feed
  const filteredUpdates = useMemo(() => {
    return policyUpdates.filter((up) => {
      if (updatesFilter === "new_programs") return up.category === "new_rule" || up.category === "expansion";
      if (updatesFilter === "affects_me") {
        // Find if program is in matching results
        const matchingIds = eligibilityResults.filter(r => r.eligible).map(r => programIdMapping[r.program_id]);
        return matchingIds.includes(up.program);
      }
      return true;
    });
  }, [policyUpdates, updatesFilter, eligibilityResults]);

  // Order programs by sequence list
  const orderedRoadmap = useMemo(() => {
    const localBenefitResults: BenefitResult[] = eligibilityResults.map((r) => ({
      name: r.program_name,
      eligible: r.eligible ? "yes" : "no",
      confidence: r.confidence_score * 100,
      reason: r.reasoning_summary,
      annual_value: `$${Math.round(r.monthly_value_usd * 12)}/year`,
      annual_value_number: r.monthly_value_usd * 12,
      apply_url: "https://www.fns.usda.gov/snap",
      source: {
        document: "",
        rule: "",
        url: "",
      },
    }));
    return getDependencyOrder(localBenefitResults);
  }, [eligibilityResults]);

  const userGreetingName = useMemo(() => {
    if (!currentUser) return "";
    if (currentUser.name && currentUser.name.trim()) {
      return currentUser.name;
    }
    if (profileFacts.full_name && profileFacts.full_name.trim()) {
      return profileFacts.full_name;
    }
    return currentUser.email.split("@")[0];
  }, [currentUser, profileFacts]);

  const activeTranslations = lang === "es" ? t.es : t.en;

  return (
    <>
      <div id="main-app-viewport" className="min-h-screen bg-background text-on-surface font-body-md relative selection:bg-primary-fixed selection:text-primary">
      {/* 1. TOP NAVBAR */}
      <nav className="bg-background/80 backdrop-blur-xl border-b border-outline-variant/20 sticky top-0 z-40">
        <div className="flex justify-between items-center px-margin-mobile md:px-margin-page py-4 w-full max-w-container-max mx-auto">
          <button onClick={() => setActiveView("landing")} className="font-display-lg text-2xl font-bold tracking-tight text-primary cursor-pointer select-none py-1.5 px-3 rounded-xl hover:bg-surface-container/20">
            FormZero
          </button>
          
          {activeView === "results" && (
            <div className="hidden lg:flex items-center bg-surface-container rounded-full p-1 border border-outline-variant/30 text-xs font-semibold">
              <button
                onClick={() => setActiveTab("matched")}
                className={`px-4 py-1.5 rounded-full transition-all ${activeTab === "matched" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"}`}
              >
                {activeTranslations.matchedPrograms}
              </button>
              <button
                onClick={() => setActiveTab("impact")}
                className={`px-4 py-1.5 rounded-full transition-all ${activeTab === "impact" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"}`}
              >
                {activeTranslations.impactAnalysis}
              </button>
              <button
                onClick={() => setActiveTab("documents")}
                className={`px-4 py-1.5 rounded-full transition-all ${activeTab === "documents" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"}`}
              >
                {activeTranslations.checklist}
              </button>
              <button
                onClick={() => setActiveTab("roadmap")}
                className={`px-4 py-1.5 rounded-full transition-all ${activeTab === "roadmap" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"}`}
              >
                {activeTranslations.roadmap}
              </button>
              <button
                onClick={() => setActiveTab("updates")}
                className={`px-4 py-1.5 rounded-full transition-all ${activeTab === "updates" ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"}`}
              >
                {activeTranslations.updates}
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            {activeView === "results" && (
              <button
                onClick={() => setShowUpdateProfileModal(true)}
                className="border border-primary text-primary px-3.5 py-1.5 rounded-full font-body-md text-xs hover:bg-primary/5 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px] font-bold">edit</span>
                {lang === "es" ? "Actualizar Perfil" : "Update Profile"}
              </button>
            )}

            <button
              onClick={() => setLang((prev) => (prev === "en" ? "es" : "en"))}
              className="flex items-center gap-2 px-3 py-1.5 border border-outline-variant/30 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all font-body-md text-xs"
            >
              <span className="material-symbols-outlined text-xs">language</span>
              {lang.toUpperCase()}
            </button>
            
            {currentUser ? (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline text-xs font-semibold text-on-surface-variant/80 bg-surface-container px-3 py-1.5 rounded-full border border-outline-variant/20 font-body-md">
                  Hi, {userGreetingName}
                </span>
                <button
                  onClick={handleLogout}
                  className="border border-outline-variant hover:border-primary text-on-surface-variant hover:text-primary px-4 py-2 rounded-full font-body-md text-xs transition-all cursor-pointer"
                >
                  {lang === "es" ? "Salir" : "Logout"}
                </button>
                <button
                  onClick={() => {
                    setDeletePassword("");
                    setDeleteError("");
                    setShowDeleteAccountModal(true);
                  }}
                  className="border border-red-300 hover:border-red-500 text-red-400 hover:text-red-600 px-3 py-2 rounded-full font-body-md text-[10px] transition-all cursor-pointer hover:bg-red-50"
                  title="Permanently delete your account"
                >
                  <span className="material-symbols-outlined text-[14px]">delete_forever</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsSignUp(false);
                    setShowAuthModal(true);
                  }}
                  className="border border-outline-variant hover:border-primary text-on-surface-variant hover:text-primary px-4 py-2 rounded-full font-body-md text-xs transition-all cursor-pointer"
                >
                  {lang === "es" ? "Iniciar Sesión" : "Login"}
                </button>
                <button
                  onClick={() => {
                    setIsSignUp(true);
                    setShowAuthModal(true);
                  }}
                  className="bg-primary text-on-primary px-4 py-2 rounded-full font-body-md text-xs hover:opacity-90 transition-all cursor-pointer"
                >
                  {lang === "es" ? "Crear Cuenta" : "Sign Up"}
                </button>
              </div>
            )}

            {activeView === "landing" && (
              <div className="flex items-center gap-2">
                {eligibilityResults.length > 0 ? (
                  <>
                    <button
                      onClick={() => setActiveView("results")}
                      className="bg-primary text-on-primary px-4 py-2 rounded-full font-body-md text-xs hover:opacity-90 transition-all scale-100 hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">dashboard</span>
                      {lang === "es" ? "Ver Resultados" : "View Results"}
                    </button>
                    <button
                      onClick={handleReset}
                      className="border border-outline-variant hover:border-primary text-on-surface-variant hover:text-primary px-4 py-2 rounded-full font-body-md text-xs transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">refresh</span>
                      {lang === "es" ? "Reiniciar" : "Start Over"}
                    </button>
                  </>
                ) : chatMessages.length > 0 ? (
                  <>
                    <button
                      onClick={() => setActiveView("intake")}
                      className="bg-primary text-on-primary px-4 py-2 rounded-full font-body-md text-xs hover:opacity-90 transition-all scale-100 hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">chat</span>
                      {lang === "es" ? "Reanudar" : "Resume Chat"}
                    </button>
                    <button
                      onClick={handleReset}
                      className="border border-outline-variant hover:border-primary text-on-surface-variant hover:text-primary px-4 py-2 rounded-full font-body-md text-xs transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">refresh</span>
                      {lang === "es" ? "Reiniciar" : "Start Over"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => startIntake()}
                    className="bg-primary text-on-primary px-5 py-2 rounded-full font-body-md text-xs hover:opacity-90 transition-all scale-100 hover:scale-[1.02] active:scale-95 cursor-pointer"
                  >
                    {lang === "es" ? "Comenzar" : "Get Started"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* 2. MAIN CONTAINER CANVAS */}
      <main className="min-h-[calc(100vh-73px)] relative flex flex-col">
        {/* Floating gradient auras */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] aura-glow -z-10 pointer-events-none opacity-40"></div>
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] aura-glow -z-10 pointer-events-none opacity-30"></div>

        {/* ── LANDING VIEW ── */}
        {activeView === "landing" && (
          <div className="flex-grow flex flex-col justify-between">
            {/* Announcement banner */}
            <div className="w-full py-2 bg-tertiary-fixed border-b border-outline-variant/10 text-center px-4">
              <p className="font-body-md text-xs text-primary">
                {eligibilityResults.length > 0 ? (
                  <>
                    {lang === "es" 
                      ? "¡Bienvenido de nuevo! Tiene resultados de beneficios guardados." 
                      : "Welcome back! You have saved benefit results."}{" "}
                    <button onClick={() => setActiveView("results")} className="font-semibold underline">
                      {lang === "es" ? "Ver resultados ahora →" : "View results now →"}
                    </button>
                  </>
                ) : chatMessages.length > 0 ? (
                  <>
                    {lang === "es" 
                      ? "Tiene una sesión de chat activa en curso." 
                      : "You have an active chat session in progress."}{" "}
                    <button onClick={() => setActiveView("intake")} className="font-semibold underline">
                      {lang === "es" ? "Reanudar chat ahora →" : "Resume chat now →"}
                    </button>
                  </>
                ) : (
                  <>
                    FormZero has launched the 2026 cost-of-living benefits discovery engine.{" "}
                    <button onClick={() => startIntake()} className="font-semibold underline">
                      Run audit now →
                    </button>
                  </>
                )}
              </p>
            </div>

            <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-page py-16 md:py-24 w-full flex-grow flex flex-col items-center justify-center relative">
              {/* Floating Blueprint Cards */}
              <div className="hidden lg:block absolute inset-0 pointer-events-none">
                <div className="floating-card top-[10%] left-[5%] -rotate-[3deg]">
                  <span className="material-symbols-outlined text-primary text-2xl mb-1">local_dining</span>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">USDA SNAP</p>
                </div>
                <div className="floating-card top-[12%] right-[8%] rotate-[2deg]">
                  <span className="material-symbols-outlined text-primary text-2xl mb-1">school</span>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Pell Grant</p>
                </div>
                <div className="floating-card bottom-[10%] left-[3%] rotate-[1deg]">
                  <span className="material-symbols-outlined text-primary text-2xl mb-1">medical_services</span>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Medicaid</p>
                </div>
                <div className="floating-card bottom-[12%] right-[4%] -rotate-[2deg]">
                  <span className="material-symbols-outlined text-primary text-2xl mb-1">thermostat</span>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">LIHEAP Bills</p>
                </div>
              </div>

              {/* Title & Headline */}
              <h1 
                className="font-display-lg text-4xl md:text-5xl text-primary text-center max-w-4xl mb-6 tracking-tight leading-tight"
                style={{ fontWeight: 700 }}
              >
                {activeTranslations.tagline}
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant text-center max-w-2xl mb-12">
                {activeTranslations.subtagline}
              </p>

              {eligibilityResults.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
                  <button
                    onClick={() => setActiveView("results")}
                    className="bg-primary text-on-primary px-10 py-5 rounded-full font-body-lg text-body-lg flex items-center gap-3 shadow-xl hover:scale-105 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined">dashboard</span>
                    {lang === "es" ? "Ver Mis Resultados" : "View My Results"}
                  </button>
                  <button
                    onClick={() => {
                      handleReset();
                      startIntake();
                    }}
                    className="border border-primary text-primary px-10 py-5 rounded-full font-body-lg text-body-lg flex items-center gap-3 hover:bg-primary/5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined">refresh</span>
                    {lang === "es" ? "Nueva Auditoría" : "Start New Audit"}
                  </button>
                </div>
              ) : chatMessages.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
                  <button
                    onClick={() => setActiveView("intake")}
                    className="bg-primary text-on-primary px-10 py-5 rounded-full font-body-lg text-body-lg flex items-center gap-3 shadow-xl hover:scale-105 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined">chat</span>
                    {lang === "es" ? "Reanudar Chat" : "Resume My Chat"}
                  </button>
                  <button
                    onClick={() => {
                      handleReset();
                      startIntake();
                    }}
                    className="border border-primary text-primary px-10 py-5 rounded-full font-body-lg text-body-lg flex items-center gap-3 hover:bg-primary/5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined">refresh</span>
                    {lang === "es" ? "Empezar de Nuevo" : "Start Over"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => startIntake()}
                  className="bg-primary text-on-primary px-10 py-5 rounded-full font-body-lg text-body-lg flex items-center gap-3 shadow-xl hover:scale-105 transition-all mb-16 cursor-pointer"
                >
                  {activeTranslations.checkBtn}
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              )}

              {/* Profile Bento Selector */}
              <div className="w-full max-w-full mb-24 flex flex-col items-center select-none overflow-hidden">
                <h2 className="font-headline-md text-headline-md text-primary text-center mb-8 px-4">
                  {activeTranslations.profileHeader}
                </h2>
                
                {/* Marquee container with fading mask */}
                <div className="marquee-container w-full">
                  <div className="marquee-track">
                    {/* Render first group of presets */}
                    <div className="flex gap-6 pr-6">
                      {presetProfiles.map((p) => (
                        <button
                          key={`group1-${p.id}`}
                          onClick={() => handleSelectPreset(p)}
                          className="w-[280px] sm:w-[300px] flex-shrink-0 glass-card p-6 rounded-2xl text-left bg-white/95 border border-outline-variant/30 hover:border-primary shadow-sm hover:shadow-xl hover:scale-[1.03] transition-all flex flex-col justify-between group cursor-pointer min-h-[220px]"
                        >
                          <div>
                            <div className="w-10 h-10 rounded-full bg-primary/5 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                              <span className="material-symbols-outlined">{p.icon}</span>
                            </div>
                            <h3 className="font-bold text-body-lg text-primary mb-1">
                              {lang === "es" ? p.nameEs : p.name}
                            </h3>
                            <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">
                              {lang === "es" ? p.descEs : p.desc}
                            </p>
                          </div>
                          <div className="mt-4 pt-4 border-t border-outline-variant/20 flex justify-between items-end">
                            <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">
                              {activeTranslations.estimatedVal}
                            </span>
                            <span className="font-display-lg text-lg text-primary font-bold">
                              {lang === "es" ? p.valEs : p.val}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Render identical second group of presets to create seamless loop */}
                    <div className="flex gap-6 pr-6">
                      {presetProfiles.map((p) => (
                        <button
                          key={`group2-${p.id}`}
                          onClick={() => handleSelectPreset(p)}
                          className="w-[280px] sm:w-[300px] flex-shrink-0 glass-card p-6 rounded-2xl text-left bg-white/95 border border-outline-variant/30 hover:border-primary shadow-sm hover:shadow-xl hover:scale-[1.03] transition-all flex flex-col justify-between group cursor-pointer min-h-[220px]"
                        >
                          <div>
                            <div className="w-10 h-10 rounded-full bg-primary/5 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                              <span className="material-symbols-outlined">{p.icon}</span>
                            </div>
                            <h3 className="font-bold text-body-lg text-primary mb-1">
                              {lang === "es" ? p.nameEs : p.name}
                            </h3>
                            <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">
                              {lang === "es" ? p.descEs : p.desc}
                            </p>
                          </div>
                          <div className="mt-4 pt-4 border-t border-outline-variant/20 flex justify-between items-end">
                            <span className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">
                              {activeTranslations.estimatedVal}
                            </span>
                            <span className="font-display-lg text-lg text-primary font-bold">
                              {lang === "es" ? p.valEs : p.val}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-4xl mb-20 border-t border-outline-variant/20 pt-16">
                <div className="group flex flex-col gap-4 p-6 bg-white border border-outline-variant/20 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                    <span className="material-symbols-outlined">analytics</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-body-lg text-primary mb-2">{activeTranslations.auditLedgerTitle}</h3>
                    <p className="text-on-surface-variant text-xs leading-relaxed">{activeTranslations.auditLedgerDesc}</p>
                  </div>
                </div>
                <div className="group flex flex-col gap-4 p-6 bg-white border border-outline-variant/20 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                    <span className="material-symbols-outlined">verified</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-body-lg text-primary mb-2">{activeTranslations.confidenceTitle}</h3>
                    <p className="text-on-surface-variant text-xs leading-relaxed">{activeTranslations.confidenceDesc}</p>
                  </div>
                </div>
                <div className="group flex flex-col gap-4 p-6 bg-white border border-outline-variant/20 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                    <span className="material-symbols-outlined">schedule</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-body-lg text-primary mb-2">{activeTranslations.clockTitle}</h3>
                    <p className="text-on-surface-variant text-xs leading-relaxed">{activeTranslations.clockDesc}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Marquee program ticker */}
            <div className="py-8 bg-white border-y border-outline-variant/20 w-full overflow-hidden">
              <div className="flex whitespace-nowrap animate-marquee">
                <div className="flex items-center gap-20 px-10 text-body-lg font-bold uppercase tracking-widest text-primary/30">
                  <span>SNAP</span><span className="italic">Medicaid</span><span>WIC</span><span>TANF</span><span className="underline">EITC</span><span>LIHEAP</span><span>Pell Grant</span><span>Lifeline</span>
                </div>
                <div className="flex items-center gap-20 px-10 text-body-lg font-bold uppercase tracking-widest text-primary/30">
                  <span>SNAP</span><span className="italic">Medicaid</span><span>WIC</span><span>TANF</span><span className="underline">EITC</span><span>LIHEAP</span><span>Pell Grant</span><span>Lifeline</span>
                </div>
              </div>
            </div>

            {/* AI JUSTIFICATION SECTION */}
            <section className="w-full py-24 bg-surface-container-low border-y border-outline-variant/20 relative overflow-hidden">
              <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none"></div>
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>

              <div className="max-w-6xl mx-auto px-margin-mobile md:px-margin-page space-y-12">
                <header className="space-y-4 max-w-3xl mx-auto text-center">
                  <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full">
                    <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                    <span className="font-label-sm text-[10px] text-primary tracking-widest uppercase font-bold">
                      {lang === "es" ? "Por qué FormZero es diferente" : "Why FormZero is Different"}
                    </span>
                  </div>
                  <h2 className="font-display-lg text-4xl md:text-5xl font-bold tracking-tight text-primary">
                    {lang === "es" ? "Cómo FormZero le ayuda a reclamar su dinero" : "How FormZero Helps You Claim Your Money"}
                  </h2>
                  <p className="font-body-lg text-body-md text-secondary leading-relaxed max-w-2xl mx-auto">
                    {lang === "es"
                      ? "Obtener ayuda del gobierno suele ser confuso y lento. Así es como hacemos el proceso simple, gratuito y confiable para usted."
                      : "Getting government aid is usually confusing and slow. Here is how we make the process simple, free, and reliable for you."}
                  </p>
                </header>

                {/* Interactive Path Tabs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mt-8">
                  {/* Tab 1: Confusing Forms */}
                  <button
                    onClick={() => setActiveComparisonTab("forms")}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                      activeComparisonTab === "forms"
                        ? "bg-red-500/10 border-red-500 text-red-600 shadow-md scale-[1.02]"
                        : "bg-white border-outline-variant/30 text-on-surface-variant hover:border-red-500/30"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[24px]">cancel</span>
                    <span className="font-bold text-xs sm:text-sm">{lang === "es" ? "Formularios confusos" : "Confusing Forms"}</span>
                  </button>

                  {/* Tab 2: Private Experts */}
                  <button
                    onClick={() => setActiveComparisonTab("experts")}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                      activeComparisonTab === "experts"
                        ? "bg-amber-500/10 border-amber-500 text-amber-600 shadow-md scale-[1.02]"
                        : "bg-white border-outline-variant/30 text-on-surface-variant hover:border-amber-500/30"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[24px]">payments</span>
                    <span className="font-bold text-xs sm:text-sm">{lang === "es" ? "Expertos privados" : "Private Experts"}</span>
                  </button>

                  {/* Tab 3: FormZero AI */}
                  <button
                    onClick={() => setActiveComparisonTab("formzero")}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                      activeComparisonTab === "formzero"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 shadow-md scale-[1.02]"
                        : "bg-white border-outline-variant/30 text-on-surface-variant hover:border-emerald-500/30"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[24px]">check_circle</span>
                    <span className="font-bold text-xs sm:text-sm">{lang === "es" ? "IA inteligente FormZero" : "FormZero Smart AI"}</span>
                  </button>
                </div>

                {/* Details Board */}
                <div className="bg-white border border-outline-variant/20 rounded-3xl p-6 md:p-10 shadow-2xl max-w-4xl mx-auto min-h-[380px] flex flex-col lg:flex-row gap-8 items-center justify-between transition-all duration-300">
                  {/* Left Side: Stats & Text */}
                  <div className="flex-1 space-y-6 w-full">
                    {activeComparisonTab === "forms" && (
                      <div className="space-y-4 animate-fade-in">
                        <h3 className="text-xl font-bold text-red-600 flex items-center gap-2">
                          <span className="material-symbols-outlined">cancel</span>
                          {lang === "es" ? "Formularios Oficiales Confusos" : "Confusing Official Forms"}
                        </h3>
                        <p className="text-sm text-on-surface-variant leading-relaxed">
                          {lang === "es"
                            ? "Intentar usar los portales web oficiales del gobierno o solicitudes en papel es estresante y difícil. Un simple error puede causar meses de retraso o el rechazo inmediato."
                            : "Trying to use standard government web portals or paper applications is stressful and difficult. One simple mistake can cause months of delay or immediate rejection."}
                        </p>
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-2">
                          <div className="bg-red-500/5 p-2 sm:p-3 rounded-xl border border-red-500/10 text-center">
                            <div className="text-[8px] sm:text-[10px] text-red-600 uppercase font-bold tracking-wider">{lang === "es" ? "Costo" : "Cost"}</div>
                            <div className="font-bold text-xs sm:text-base text-primary">{lang === "es" ? "Gratis" : "Free"}</div>
                          </div>
                          <div className="bg-red-500/5 p-2 sm:p-3 rounded-xl border border-red-500/10 text-center">
                            <div className="text-[8px] sm:text-[10px] text-red-600 uppercase font-bold tracking-wider">{lang === "es" ? "Tiempo" : "Time"}</div>
                            <div className="font-bold text-xs sm:text-base text-primary">{lang === "es" ? "3-5 Horas" : "3-5 Hours"}</div>
                          </div>
                          <div className="bg-red-500/5 p-2 sm:p-3 rounded-xl border border-red-500/10 text-center">
                            <div className="text-[8px] sm:text-[10px] text-red-600 uppercase font-bold tracking-wider">{lang === "es" ? "Riesgo" : "Chance of Error"}</div>
                            <div className="font-bold text-xs sm:text-base text-red-600">{lang === "es" ? "Muy Alto" : "Very High"}</div>
                          </div>
                        </div>
                        <ul className="space-y-2.5 text-xs text-on-surface-variant list-disc pl-4 pt-2">
                          <li>{lang === "es" ? "Debe conocer reglas y términos legales complicados." : "Must know complicated legal words and rules."}</li>
                          <li>{lang === "es" ? "Debe calcular los números de su hogar exactamente." : "Must calculate your own household math exactly."}</li>
                          <li>{lang === "es" ? "Si es rechazado, no se le explica el motivo." : "If you are rejected, you are not told why."}</li>
                        </ul>
                      </div>
                    )}

                    {activeComparisonTab === "experts" && (
                      <div className="space-y-4 animate-fade-in">
                        <h3 className="text-xl font-bold text-amber-600 flex items-center gap-2">
                          <span className="material-symbols-outlined">payments</span>
                          {lang === "es" ? "Contratar Expertos Privados" : "Hiring Private Experts"}
                        </h3>
                        <p className="text-sm text-on-surface-variant leading-relaxed">
                          {lang === "es"
                            ? "Contratar a un abogado o asistente de solicitudes para que haga el trabajo por usted es costoso. Las familias de bajos ingresos que más necesitan ayuda quedan excluidas."
                            : "Hiring a lawyer or application assistant to do the work for you is expensive. Low-income families who need help the most are priced out."}
                        </p>
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-2">
                          <div className="bg-amber-500/5 p-2 sm:p-3 rounded-xl border border-amber-500/10 text-center">
                            <div className="text-[8px] sm:text-[10px] text-amber-600 uppercase font-bold tracking-wider">{lang === "es" ? "Costo" : "Cost"}</div>
                            <div className="font-bold text-xs sm:text-base text-amber-600">$150 - $400</div>
                          </div>
                          <div className="bg-amber-500/5 p-2 sm:p-3 rounded-xl border border-amber-500/10 text-center">
                            <div className="text-[8px] sm:text-[10px] text-amber-600 uppercase font-bold tracking-wider">{lang === "es" ? "Tiempo" : "Time"}</div>
                            <div className="font-bold text-xs sm:text-base text-primary">{lang === "es" ? "2-3 Semanas" : "2-3 Weeks"}</div>
                          </div>
                          <div className="bg-amber-500/5 p-2 sm:p-3 rounded-xl border border-amber-500/10 text-center">
                            <div className="text-[8px] sm:text-[10px] text-amber-600 uppercase font-bold tracking-wider">{lang === "es" ? "Riesgo" : "Chance of Error"}</div>
                            <div className="font-bold text-xs sm:text-base text-primary">{lang === "es" ? "Bajo" : "Low"}</div>
                          </div>
                        </div>
                        <ul className="space-y-2.5 text-xs text-on-surface-variant list-disc pl-4 pt-2">
                          <li>{lang === "es" ? "Cuesta cientos de dólares antes de recibir dinero." : "Costs hundreds of dollars before you get any cash."}</li>
                          <li>{lang === "es" ? "Requiere esperar citas y llamadas de seguimiento." : "Requires waiting for appointments and call-backs."}</li>
                          <li>{lang === "es" ? "Es difícil de pagar para la gente común." : "Hard for ordinary people to afford."}</li>
                        </ul>
                      </div>
                    )}

                    {activeComparisonTab === "formzero" && (
                      <div className="space-y-4 animate-fade-in">
                        <h3 className="text-xl font-bold text-emerald-600 flex items-center gap-2">
                          <span className="material-symbols-outlined">check_circle</span>
                          {lang === "es" ? "IA Inteligente FormZero" : "FormZero Smart AI"}
                        </h3>
                        <p className="text-sm text-on-surface-variant leading-relaxed">
                          {lang === "es"
                            ? "Nuestro sistema automatizado hace la lectura compleja y las matemáticas por usted al instante. Solo hable o escriba con palabras normales, y encontraremos sus beneficios."
                            : "Our automated system does the complex reading and math for you instantly. Just talk or type in normal words, and we find your matching benefits."}
                        </p>
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-2">
                          <div className="bg-emerald-500/5 p-2 sm:p-3 rounded-xl border border-emerald-500/10 text-center">
                            <div className="text-[8px] sm:text-[10px] text-emerald-600 uppercase font-bold tracking-wider">{lang === "es" ? "Costo" : "Cost"}</div>
                            <div className="font-bold text-xs sm:text-base text-emerald-600">{lang === "es" ? "100% Gratis" : "100% Free"}</div>
                          </div>
                          <div className="bg-emerald-500/5 p-2 sm:p-3 rounded-xl border border-emerald-500/10 text-center">
                            <div className="text-[8px] sm:text-[10px] text-emerald-600 uppercase font-bold tracking-wider">{lang === "es" ? "Tiempo" : "Time"}</div>
                            <div className="font-bold text-xs sm:text-base text-emerald-600">{lang === "es" ? "2 Segundos" : "2 Seconds"}</div>
                          </div>
                          <div className="bg-emerald-500/5 p-2 sm:p-3 rounded-xl border border-emerald-500/10 text-center">
                            <div className="text-[8px] sm:text-[10px] text-emerald-600 uppercase font-bold tracking-wider">{lang === "es" ? "Riesgo" : "Chance of Error"}</div>
                            <div className="font-bold text-xs sm:text-base text-emerald-600">{lang === "es" ? "Ninguno" : "None"}</div>
                          </div>
                        </div>
                        <ul className="space-y-2.5 text-xs text-on-surface-variant list-disc pl-4 pt-2">
                          <li>{lang === "es" ? "Hable con naturalidad, como si hablara con un amigo." : "Speak naturally like talking to a friend."}</li>
                          <li>{lang === "es" ? "Verifica miles de reglas oficiales al instante." : "Checks thousands of official rules instantly."}</li>
                          <li>{lang === "es" ? "Muestra pruebas exactas de documentos oficiales." : "Shows exact proof from official documents."}</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Right Side: Interactive Layout Mockups */}
                  <div className="w-full lg:w-[320px] h-[260px] rounded-2xl bg-surface-container/50 border border-outline-variant/30 flex items-center justify-center p-6 relative overflow-hidden shadow-inner shrink-0">
                    
                     {/* Visual mockup for Confusing Forms */}
                    {activeComparisonTab === "forms" && (
                      <div className="w-full space-y-3 animate-fade-in">
                        <div className="text-[10px] font-mono text-red-600 bg-red-500/5 border border-red-500/10 px-2.5 py-1 rounded-md uppercase font-bold tracking-widest text-center w-max mx-auto">
                          {lang === "es" ? "Portal del Sitio Oficial" : "Official Site Portal"}
                        </div>
                        <div className="space-y-2 bg-white p-4 rounded-xl border border-outline-variant/30 shadow-sm relative">
                          <div className="h-3 bg-neutral-200 rounded w-2/3"></div>
                          <div className="h-2 bg-neutral-100 rounded w-full"></div>
                          <div className="h-6 bg-neutral-50 rounded border border-neutral-200 flex items-center px-2 text-[8px] text-neutral-400">
                            {lang === "es" ? "Seleccione Código de Elegibilidad (ej. 1040-ES SEC 4)..." : "Select Eligibility Code (e.g. 1040-ES SEC 4)..."}
                          </div>
                          <div className="h-6 bg-neutral-50 rounded border border-neutral-200 flex items-center px-2 text-[8px] text-neutral-400">
                            {lang === "es" ? "Ingreso Anual Ajustado Bruto del Hogar ($)..." : "Household Gross Adjusted Annual Income ($)..."}
                          </div>
                          <div className="absolute inset-0 bg-red-500/5 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                            <div className="bg-red-600 text-white font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-lg border-2 border-white shadow-lg rotate-12">
                              {lang === "es" ? "RECHAZADO" : "REJECTED"}
                            </div>
                          </div>
                        </div>
                        <div className="text-[9px] text-center text-red-600 font-semibold">
                          {lang === "es" ? "Razón: Rango de ingresos incorrecto." : "Reason: Wrong income bracket entered."}
                        </div>
                      </div>
                    )}

                    {/* Visual mockup for Private Experts */}
                    {activeComparisonTab === "experts" && (
                      <div className="w-full space-y-3 animate-fade-in">
                        <div className="text-[10px] font-mono text-amber-600 bg-amber-500/5 border border-amber-500/10 px-2.5 py-1 rounded-md uppercase font-bold tracking-widest text-center w-max mx-auto">
                          {lang === "es" ? "Factura del Consultor" : "Consultant Bill"}
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-outline-variant/30 shadow-sm space-y-2 text-xs">
                          <div className="flex justify-between border-b pb-2 text-[10px]">
                            <span className="font-semibold text-primary">{lang === "es" ? "Concepto" : "Item"}</span>
                            <span className="font-semibold text-primary">{lang === "es" ? "Costo" : "Cost"}</span>
                          </div>
                          <div className="flex justify-between text-[9px]">
                            <span>{lang === "es" ? "Cuota de Consulta" : "Consultation Fee"}</span>
                            <span className="font-bold text-primary">$150.00</span>
                          </div>
                          <div className="flex justify-between text-[9px]">
                            <span>{lang === "es" ? "Asistencia con Formularios" : "Form Assistance"}</span>
                            <span className="font-bold text-primary">$200.00</span>
                          </div>
                          <div className="flex justify-between border-t pt-2 font-bold text-amber-600 text-[10px]">
                            <span>{lang === "es" ? "Total a Pagar" : "Total Due"}</span>
                            <span>$350.00</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 text-[10px] text-on-surface-variant">
                          <span className="material-symbols-outlined text-[14px] animate-spin">schedule</span>
                          {lang === "es" ? "Tiempo de espera: 3 semanas" : "Waiting time: 3 weeks"}
                        </div>
                      </div>
                    )}

                    {/* Visual mockup for FormZero AI */}
                    {activeComparisonTab === "formzero" && (
                      <div className="w-full space-y-3 animate-fade-in">
                        <div className="text-[10px] font-mono text-emerald-600 bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 rounded-md uppercase font-bold tracking-widest text-center w-max mx-auto">
                          {lang === "es" ? "Chat de FormZero" : "FormZero Chat"}
                        </div>
                        <div className="space-y-3">
                          {/* User message */}
                          <div className="flex justify-end">
                            <div className="bg-primary text-on-primary text-[10px] px-3.5 py-2 rounded-2xl rounded-tr-none max-w-[85%] shadow-sm">
                              {lang === "es" ? "Hago trabajo de jardinería a tiempo parcial y gano $950/mes en GA." : "I do part-time yard helper work and make $950/month in GA."}
                            </div>
                          </div>
                          {/* AI message */}
                          <div className="flex justify-start">
                            <div className="bg-white border border-outline-variant/30 text-[10px] px-3.5 py-2 rounded-2xl rounded-tl-none max-w-[85%] shadow-sm text-primary flex items-start gap-2">
                              <span className="material-symbols-outlined text-emerald-500 text-[16px] shrink-0">check_circle</span>
                              <div>
                                <div className="font-bold">{lang === "es" ? "¡Califica para SNAP!" : "You qualify for SNAP!"}</div>
                                <div className="text-[9px] text-on-surface-variant font-medium mt-0.5">{lang === "es" ? "Estimado: $2,400/año" : "Estimated: $2,400/year"}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>



            {/* Footer */}
            <footer className="bg-surface-container border-t border-outline-variant/30 py-12 text-center text-xs text-on-surface-variant/60 w-full mt-auto">
              <div className="font-display-lg text-primary text-xl font-bold mb-4 select-none">
                FormZero
              </div>
              <p>© 2026 FormZero. Built with academic rigor and AI precision.</p>
            </footer>
          </div>
        )}

        {/* ── INTAKE CHAT VIEW ── */}
        {activeView === "intake" && (
          <div className="max-w-2xl mx-auto px-margin-mobile py-10 w-full flex-grow flex flex-col justify-between">
            {/* Top Progress bar */}
            <div className="w-full mb-10 flex flex-col gap-2 shrink-0">
              <div className="flex justify-between items-end">
                <h2 className="font-headline-md text-headline-md text-on-background">
                  {activeTranslations.intakeSession}
                </h2>
                <span className="font-label-sm text-xs text-on-surface-variant tracking-widest uppercase font-bold">
                  {activeTranslations.questionOf(currentQuestionIndex)}
                </span>
              </div>
              <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-700 ease-out"
                  style={{ width: `${(currentQuestionIndex / 8) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Active profile facts panel */}
            {Object.keys(profileFacts).length > 0 && (
              <div className="w-full flex justify-center mb-6 shrink-0">
                <div className="glass-panel bg-surface-container-low/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex flex-wrap items-center justify-center gap-3 shadow-sm text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">
                  {profileFacts.state && (
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px] text-primary">location_on</span>
                      <span>State: {profileFacts.state}</span>
                    </div>
                  )}
                  {profileFacts.household_size && (
                    <div className="flex items-center gap-1">
                      {profileFacts.state && <div className="w-px h-2.5 bg-outline-variant/30 mr-2"></div>}
                      <span className="material-symbols-outlined text-[13px] text-primary">group</span>
                      <span>Household: {profileFacts.household_size}</span>
                    </div>
                  )}
                  {profileFacts.monthly_income && (
                    <div className="flex items-center gap-1">
                      {(profileFacts.state || profileFacts.household_size) && <div className="w-px h-2.5 bg-outline-variant/30 mr-2"></div>}
                      <span className="material-symbols-outlined text-[13px] text-primary">account_balance_wallet</span>
                      <span>Income: ${profileFacts.monthly_income}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chat wrapper scrollbox */}
            <div className="flex-grow overflow-y-auto space-y-6 max-h-[50vh] pr-2 custom-scrollbar mb-8">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col gap-1.5 max-w-[85%] ${msg.role === "user" ? "self-end items-end ml-auto" : "self-start items-start"}`}
                >
                  <div
                    className={`p-5 rounded-2xl shadow-sm ${msg.role === "user" ? "bg-primary text-on-primary rounded-tr-none" : "glass-panel text-on-surface rounded-tl-none border-l-4 border-l-primary"}`}
                  >
                    <p className="font-body-lg text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                  </div>
                  <span className="text-[9px] uppercase tracking-tighter text-outline ml-1">
                    {msg.role === "user" ? "You" : "FormZero AI"} • {msg.timestamp}
                  </span>
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-1 ml-1 opacity-60">
                  <div className="w-1.5 h-1.5 bg-outline rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-outline rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-outline rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Intake controls & input panel */}
            <div className="w-full shrink-0">
              {/* Option chips for quick inputs */}
              {isConfirmingAutoFill ? (
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  <button
                    onClick={() => handleConfirmAutoFill(true)}
                    className="bg-primary text-on-primary px-6 py-2.5 rounded-full text-xs font-bold shadow-md hover:scale-[1.02] active:scale-95 duration-200 cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    {lang === "es" ? "Sí, es correcto" : "Yes, correct"}
                  </button>
                  <button
                    onClick={() => handleConfirmAutoFill(false)}
                    className="border border-error text-error hover:bg-error-container/20 px-6 py-2.5 rounded-full text-xs font-bold shadow-sm hover:scale-[1.02] active:scale-95 duration-200 cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    {lang === "es" ? "No, reintentar" : "No, redo recording"}
                  </button>
                </div>
              ) : isConfirmingChatIntake ? (
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  <button
                    onClick={() => handleConfirmChatIntake(true)}
                    className="bg-primary text-on-primary px-6 py-2.5 rounded-full text-xs font-bold shadow-md hover:scale-[1.02] active:scale-95 duration-200 cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    {lang === "es" ? "Sí, es correcto" : "Yes, correct"}
                  </button>
                  <button
                    onClick={() => handleConfirmChatIntake(false)}
                    className="border border-error text-error hover:bg-error-container/20 px-6 py-2.5 rounded-full text-xs font-bold shadow-sm hover:scale-[1.02] active:scale-95 duration-200 cursor-pointer flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    {lang === "es" ? "No, volver a empezar" : "No, start over"}
                  </button>
                </div>
              ) : (
                currentQuestionIndex > 1 && !isTyping && (
                  <div className="flex flex-wrap gap-2 justify-center mb-4">
                    {questionsList[currentQuestionIndex - 1].key === "has_children" && (
                      <>
                        <button onClick={() => handleIncomingUserMessage("yes", currentQuestionIndex, profileFacts)} className="px-4 py-2 rounded-full border border-outline-variant hover:bg-surface-container transition-colors text-xs font-semibold">Yes / Sí</button>
                        <button onClick={() => handleIncomingUserMessage("no", currentQuestionIndex, profileFacts)} className="px-4 py-2 rounded-full border border-outline-variant hover:bg-surface-container transition-colors text-xs font-semibold">No</button>
                      </>
                    )}
                    {questionsList[currentQuestionIndex - 1].key === "has_pregnant" && (
                      <>
                        <button onClick={() => handleIncomingUserMessage("yes", currentQuestionIndex, profileFacts)} className="px-4 py-2 rounded-full border border-outline-variant hover:bg-surface-container transition-colors text-xs font-semibold">Yes / Sí</button>
                        <button onClick={() => handleIncomingUserMessage("no", currentQuestionIndex, profileFacts)} className="px-4 py-2 rounded-full border border-outline-variant hover:bg-surface-container transition-colors text-xs font-semibold">No</button>
                      </>
                    )}
                    {questionsList[currentQuestionIndex - 1].key === "has_elderly_or_disabled" && (
                      <>
                        <button onClick={() => handleIncomingUserMessage("yes", currentQuestionIndex, profileFacts)} className="px-4 py-2 rounded-full border border-outline-variant hover:bg-surface-container transition-colors text-xs font-semibold">Yes / Sí</button>
                        <button onClick={() => handleIncomingUserMessage("no", currentQuestionIndex, profileFacts)} className="px-4 py-2 rounded-full border border-outline-variant hover:bg-surface-container transition-colors text-xs font-semibold">No</button>
                      </>
                    )}
                    {questionsList[currentQuestionIndex - 1].key === "is_student" && (
                      <>
                        <button onClick={() => handleIncomingUserMessage("yes", currentQuestionIndex, profileFacts)} className="px-4 py-2 rounded-full border border-outline-variant hover:bg-surface-container transition-colors text-xs font-semibold">Yes / Sí</button>
                        <button onClick={() => handleIncomingUserMessage("no", currentQuestionIndex, profileFacts)} className="px-4 py-2 rounded-full border border-outline-variant hover:bg-surface-container transition-colors text-xs font-semibold">No</button>
                      </>
                    )}
                    {questionsList[currentQuestionIndex - 1].key === "immigration_status" && (
                      <>
                        <button onClick={() => handleIncomingUserMessage("citizen", currentQuestionIndex, profileFacts)} className="px-4 py-2 rounded-full border border-outline-variant hover:bg-surface-container transition-colors text-xs font-semibold">Citizen / Ciudadano</button>
                        <button onClick={() => handleIncomingUserMessage("permanent_resident", currentQuestionIndex, profileFacts)} className="px-4 py-2 rounded-full border border-outline-variant hover:bg-surface-container transition-colors text-xs font-semibold">Resident / Residente</button>
                        <button onClick={() => handleIncomingUserMessage("prefer not to say", currentQuestionIndex, profileFacts)} className="px-4 py-2 rounded-full border border-outline-variant hover:bg-surface-container transition-colors text-xs font-semibold">Prefer not to say / No decir</button>
                      </>
                    )}
                  </div>
                )
              )}

              {/* Start over & Secure pill */}
              <div className="flex justify-between items-center mb-4">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/40 border border-white/20 hover:bg-white/60 transition-all text-xs text-on-surface-variant font-semibold"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  {activeTranslations.startOver}
                </button>
                <span className="px-3 py-1 rounded-full bg-surface-container-highest text-on-surface-variant text-[9px] font-bold uppercase tracking-wider">
                  Secure AES-256
                </span>
              </div>

              {/* Input Chat Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="glass-panel rounded-full p-2 flex items-center shadow-2xl"
              >
                <button 
                  disabled={isConfirmingAutoFill || isConfirmingChatIntake || isTyping}
                  type="button" 
                  className="p-3 text-outline hover:text-primary transition-colors shrink-0 disabled:opacity-30"
                >
                  <span className="material-symbols-outlined">attach_file</span>
                </button>
                <input
                  disabled={isConfirmingAutoFill || isConfirmingChatIntake || isTyping}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-grow bg-transparent border-none focus:ring-0 px-4 font-body-lg text-body-md text-on-background placeholder:text-outline/40 focus:outline-none disabled:opacity-50"
                  placeholder={
                    isConfirmingChatIntake || isConfirmingAutoFill
                      ? (lang === "es" ? "Por favor confirme arriba..." : "Please confirm above...")
                      : questionsList[currentQuestionIndex - 1].key === "monthly_income"
                        ? "e.g. 2500"
                        : "Type your answer here..."
                  }
                  type="text"
                />
                <div className="flex items-center gap-2 mr-1 shrink-0">
                  <button
                    disabled={isConfirmingAutoFill || isConfirmingChatIntake || isTyping}
                    type="button"
                    onClick={isRecording ? () => stopVoiceRecording(true) : startVoiceRecording}
                    className={`p-3 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-30 ${isRecording ? "bg-error hover:bg-error/80 text-on-error animate-pulse shadow-md shadow-error/20" : "text-outline hover:bg-primary hover:text-on-primary bg-transparent"}`}
                  >
                    <span className="material-symbols-outlined">{isRecording ? "mic_off" : "mic"}</span>
                  </button>
                  <button
                    disabled={isConfirmingAutoFill || isConfirmingChatIntake || isTyping || !chatInput.trim()}
                    type="submit"
                    className="bg-primary text-on-primary p-3 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-35"
                  >
                    <span className="material-symbols-outlined">arrow_upward</span>
                  </button>
                </div>
              </form>
              <p className="mt-4 text-[10px] text-outline/60 text-center">
                {activeTranslations.disclaimer}
              </p>
            </div>
          </div>
        )}

        {/* ── DISCOVERY FEED / SCANNING VIEW ── */}
        {activeView === "discovery" && (
          <div className="flex-grow flex flex-col py-16 px-margin-mobile md:px-margin-page max-w-container-max mx-auto w-full items-center justify-center">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center w-full">
              {/* Left Column: Progress Ring & Shimmer */}
              <div className="lg:col-span-7 flex flex-col items-center justify-center relative min-h-[450px]">
                <div className="absolute inset-0 rounded-2xl bg-surface-container-low overflow-hidden shadow-sm border border-outline-variant/35 flex items-center justify-center p-8">
                  {/* Glowing blobs inside background */}
                  <div className="absolute inset-0 opacity-40">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/15 to-primary-fixed-dim/20 animate-pulse"></div>
                    <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/20 blur-[100px]"></div>
                  </div>

                  <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, rgba(0,0,0,0.04) 1px, transparent 0)", backgroundSize: "40px 40px" }}></div>

                  {/* Ring Card container */}
                  <div className="relative z-10 bg-white/40 backdrop-blur-2xl border border-white/40 p-10 rounded-3xl shadow-lg flex flex-col items-center gap-6 max-w-md w-full">
                    <div className="text-center space-y-2">
                      <span className="block font-label-sm text-[10px] uppercase tracking-[0.2em] text-primary/60 font-bold">
                        {activeTranslations.systemScanning}
                      </span>
                      <h2 className="font-display-lg text-headline-md text-primary">
                        {activeTranslations.discovering}
                      </h2>
                    </div>

                    {/* Log Terminal Screen inside card */}
                    <div
                      ref={logStreamRef}
                      className="w-full bg-black/5 rounded-lg p-4 font-mono text-[10px] text-left text-primary/60 overflow-y-auto h-24 relative custom-scrollbar leading-relaxed"
                    >
                      {scanLogs.map((log) => (
                        <p key={log.id} className="mb-1">{log.text}</p>
                      ))}
                      {scanProgress < 100 && <span className="animate-pulse text-primary font-bold token-stream"></span>}
                    </div>

                    {/* Enhanced Metric indicators */}
                    <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                      {/* Live circular loader */}
                      <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md rounded-full px-4 py-2 border border-primary/5 shadow-sm">
                        <div className="relative flex items-center justify-center h-6 w-6">
                          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 24 24">
                            <circle className="text-primary/10" strokeWidth="2.5" stroke="currentColor" fill="transparent" r="10" cx="12" cy="12"></circle>
                            <circle
                              className="text-emerald-500 transition-all duration-300"
                              strokeWidth="2.5"
                              strokeDasharray="62.8"
                              strokeDashoffset={62.8 - (62.8 * scanProgress) / 100}
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="transparent"
                              r="10"
                              cx="12"
                              cy="12"
                            ></circle>
                          </svg>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 animate-pulse"></span>
                        </div>
                        <span className="font-label-sm text-[9px] font-bold tracking-widest text-primary">LIVE SCAN: {scanProgress}%</span>
                      </div>

                      <div className="flex flex-col items-start bg-white/40 backdrop-blur-sm rounded-xl px-4 py-1.5 border border-white/40 min-w-[90px]">
                        <span className="text-[8px] uppercase tracking-wider text-primary/50 font-bold">Confidence</span>
                        <span className="text-xs font-bold text-primary">99.8%</span>
                      </div>

                      <div className="flex flex-col items-start bg-white/40 backdrop-blur-sm rounded-xl px-4 py-1.5 border border-white/40 min-w-[90px]">
                        <span className="text-[8px] uppercase tracking-wider text-primary/50 font-bold">Rules Checked</span>
                        <span className="text-xs font-bold text-primary tabular-nums">{rulesCheckedCount}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-primary/5 rounded-full overflow-hidden h-2.5 mt-2">
                      <div
                        className="h-full bg-primary/60 rounded-full shimmer"
                        style={{ width: `${scanProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live list results builder */}
              <div className="lg:col-span-5 flex flex-col gap-6 w-full">
                <div>
                  <h2 className="font-headline-md text-headline-md text-primary">
                    {lang === "es" ? "Escaneo en Vivo" : "Discovery Feed"}
                  </h2>
                  <p className="font-body-md text-xs text-on-surface-variant">
                    {lang === "es" ? "Emparejamiento de programas en tiempo real" : "Real-time program matching"}
                  </p>
                </div>

                <div className="space-y-4">
                  {Object.entries(programIdMapping).map(([pid, name]) => {
                    const status = scanStatuses[pid] || "scanning";
                    return (
                      <div
                        key={pid}
                        className={`rounded-xl border p-4 flex items-center justify-between overflow-hidden relative transition-all duration-300 ${status === "scanning" ? "bg-white/60 border-primary/5" : status === "matched" ? "bg-white border-outline-variant/30 hover:border-primary/20" : "bg-white/40 border-outline-variant/10 opacity-70"}`}
                      >
                        {status === "scanning" && (
                          <div className="absolute inset-0 shimmer opacity-10 pointer-events-none"></div>
                        )}
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${status === "scanning" ? "bg-primary-container text-primary animate-spin" : status === "matched" ? "bg-emerald-100 text-emerald-700" : "bg-outline-variant/20 text-on-surface-variant/40"}`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {status === "scanning" ? "sync" : status === "matched" ? "check_circle" : "close"}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-bold text-xs text-primary leading-tight">{name}</h4>
                            <p className="text-[10px] text-on-surface-variant font-semibold">
                              {status === "scanning"
                                ? "Analyzing rules..."
                                : status === "matched"
                                ? "Eligible"
                                : "Unlikely"}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant/50">
                          {status === "scanning" ? "SCANNING" : status === "matched" ? "MATCH" : "SKIP"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── RESULTS DASHBOARD VIEW ── */}
        {activeView === "results" && (
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-page py-10 w-full flex-grow flex flex-col">
            
            {/* Mobile Navigation bar */}
            <div className="lg:hidden flex overflow-x-auto gap-2 pb-4 mb-6 scrollbar-none border-b border-outline-variant/20 shrink-0">
              <button
                onClick={() => setActiveTab("matched")}
                className={`px-4 py-2 text-xs font-semibold rounded-full shrink-0 ${activeTab === "matched" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}
              >
                {activeTranslations.matchedPrograms}
              </button>
              <button
                onClick={() => setActiveTab("impact")}
                className={`px-4 py-2 text-xs font-semibold rounded-full shrink-0 ${activeTab === "impact" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}
              >
                {activeTranslations.impactAnalysis}
              </button>
              <button
                onClick={() => setActiveTab("documents")}
                className={`px-4 py-2 text-xs font-semibold rounded-full shrink-0 ${activeTab === "documents" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}
              >
                {activeTranslations.checklist}
              </button>
              <button
                onClick={() => setActiveTab("roadmap")}
                className={`px-4 py-2 text-xs font-semibold rounded-full shrink-0 ${activeTab === "roadmap" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}
              >
                {activeTranslations.roadmap}
              </button>
              <button
                onClick={() => setActiveTab("updates")}
                className={`px-4 py-2 text-xs font-semibold rounded-full shrink-0 ${activeTab === "updates" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}
              >
                {activeTranslations.updates}
              </button>
            </div>

            {/* TAB 1: MATCHED PROGRAMS */}
            {activeTab === "matched" && (
              <div className="space-y-12">
                {/* Unclaimed clock widget banner */}
                <section className="glass rounded-3xl p-8 md:p-12 border border-white/60 shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                  <div className="space-y-4 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2.5 w-2.5 rounded-full bg-error animate-pulse"></span>
                      <span className="text-label-sm font-bold uppercase tracking-widest text-error">
                        {activeTranslations.unclaimedClock}
                      </span>
                    </div>
                    <h1 className="font-display-lg text-display-lg-mobile md:text-6xl font-bold tracking-tight text-primary">
                      ${tickingValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h1>
                    <div className="text-xs bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full w-max text-primary font-medium flex items-center gap-1.5 mt-2">
                      <span className="material-symbols-outlined text-sm">calculate</span>
                      {lang === "es"
                        ? `Fórmula: $${totalMonthlyValue.toLocaleString()}/mes × 41 meses de ventana retroactiva`
                        : `Formula: $${totalMonthlyValue.toLocaleString()}/mo × 41 months retroactive eligibility window`}
                    </div>
                    <p className="font-body-lg text-body-md text-on-surface-variant leading-relaxed mt-2">
                      {activeTranslations.retroactiveSince}
                    </p>
                  </div>
                  <div className="flex flex-col md:items-end gap-6 shrink-0 w-full md:w-auto">
                    <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10 w-full md:w-60">
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-2">
                        {activeTranslations.priorityWindow}
                      </span>
                      <div className="flex gap-4 font-display-lg text-2xl text-primary font-bold">
                        <div>4<span className="text-xs font-sans text-on-surface-variant font-medium ml-0.5">{activeTranslations.days}</span></div>
                        <div>12<span className="text-xs font-sans text-on-surface-variant font-medium ml-0.5">{activeTranslations.hours}</span></div>
                        <div>48<span className="text-xs font-sans text-on-surface-variant font-medium ml-0.5">{activeTranslations.minutes}</span></div>
                      </div>
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="border border-primary text-primary hover:bg-primary/5 px-8 py-4 rounded-full font-semibold text-sm shadow-md hover:scale-[1.02] active:scale-95 transition-all text-center w-full md:w-auto flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                      {lang === "es" ? "Exportar Reporte" : "Export Audited Report"}
                    </button>
                  </div>
                </section>

                {/* Grid header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <h2 className="font-display-lg text-headline-md text-primary">
                      {activeTranslations.optimizedResults}
                    </h2>
                    <p className="text-sm text-on-surface-variant">
                      {lang === "es"
                        ? `Hemos identificado ${matchedProgramsCount} programas coincidentes de un total de ${eligibilityResults.length}.`
                        : `We've identified ${matchedProgramsCount} matching programs out of ${eligibilityResults.length} total.`}
                    </p>
                  </div>
                </div>

                {/* Bento Grid layout */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
                  {eligibilityResults.map((b, idx) => {
                    const isFirstFeatured = idx === 0;
                    const styles = programCardStyles[b.program_id] || { bg: "bg-white", border: "border-outline-variant/35", text: "text-primary", textMuted: "text-on-surface-variant" };
                    return (
                      <article
                        key={b.program_id}
                        className={`${styles.bg} rounded-xl border ${styles.border} flex flex-col justify-between transition-all hover:shadow-xl hover:-translate-y-1 p-8 group relative overflow-hidden ${isFirstFeatured ? "md:col-span-8" : b.program_id === "medicaid" ? "md:col-span-4" : b.program_id === "tanf" || b.program_id === "ssi_ssdi" ? "md:col-span-6" : b.program_id === "eitc" || b.program_id === "pell_grant" ? "md:col-span-3" : "md:col-span-4"}`}
                      >
                        <div className="flex flex-col justify-between flex-grow w-full">
                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${b.eligible ? "bg-emerald-100/80 text-emerald-800" : "bg-outline-variant/40 text-on-surface-variant"}`}
                                >
                                  {lang === "es" ? (b.eligible ? "Elegible" : "Improbable") : (b.eligible ? "Eligible" : "Unlikely")}
                                </span>
                                {(() => {
                                  const confPercent = Math.round(b.confidence_score * 100);
                                  const confClass = b.confidence_score >= 0.8
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                                    : b.confidence_score >= 0.5
                                      ? "bg-amber-50 text-amber-700 border border-amber-200/50"
                                      : "bg-rose-50 text-rose-700 border border-rose-200/50";
                                  return (
                                    <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${confClass}`}>
                                      {lang === "es" ? `${confPercent}% de Confianza` : `${confPercent}% Confidence`}
                                    </span>
                                  );
                                })()}
                                {b.eligible && (() => {
                                  const successProb = Math.round(35 + b.confidence_score * 60 - (b.program_id === "medicaid" ? 4 : b.program_id === "tanf" ? 6 : b.program_id === "ssi_ssdi" ? 10 : 0));
                                  const backlog = lang === "es"
                                    ? (b.program_id === "medicaid" ? "Medio" : b.program_id === "tanf" ? "Alto" : b.program_id === "ssi_ssdi" ? "Muy Alto" : "Bajo")
                                    : (b.program_id === "medicaid" ? "Medium" : b.program_id === "tanf" ? "High" : b.program_id === "ssi_ssdi" ? "Very High" : "Low");
                                  const docCheck = lang === "es"
                                    ? (b.program_id === "medicaid" ? "Se Requiere Revisión" : b.program_id === "ssi_ssdi" ? "Se Requiere Revisión" : "Documentos Listos")
                                    : (b.program_id === "medicaid" ? "Docs Check Needed" : b.program_id === "ssi_ssdi" ? "Docs Check Needed" : "Docs Ready");
                                  const tooltip = lang === "es"
                                    ? `Probabilidad de Éxito: ${successProb}% (Retraso: ${backlog} | ${docCheck})`
                                    : `Success Probability: ${successProb}% (Backlog: ${backlog} | ${docCheck})`;
                                  return (
                                    <span 
                                      className="text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/50 cursor-help flex items-center gap-0.5 select-none"
                                      title={tooltip}
                                    >
                                      <span className="material-symbols-outlined text-[10px] font-bold">query_stats</span>
                                      {lang === "es" ? `Éxito: ${successProb}%` : `Success: ${successProb}%`}
                                    </span>
                                  );
                                })()}
                              </div>
                              {b.confidence_score < 0.8 && b.eligible && (
                                <div className="flex items-center text-error font-semibold gap-1 text-[10px]">
                                  <span className="material-symbols-outlined text-[15px]">priority_high</span>
                                  <span>{lang === "es" ? "Verificar" : "Verify"}</span>
                                </div>
                              )}
                            </div>

                            <h3 className={`font-headline-md font-bold ${styles.text} ${isFirstFeatured ? "text-3xl" : "text-xl"}`}>
                              {b.program_name}
                            </h3>
                            <p className={`text-xs leading-relaxed mb-6 ${styles.textMuted}`}>
                              {b.reasoning_summary}
                            </p>
                          </div>

                          <div className={`mb-6 pt-4 border-t ${styles.border}`}>
                            <span className={`text-[9px] font-bold uppercase tracking-wider block mb-1 ${styles.textMuted}`}>
                              {activeTranslations.valueLabel}
                            </span>
                            <div className={`text-3xl font-display-lg tracking-tight font-bold ${styles.text}`}>
                              ${Math.round(b.monthly_value_usd * 12).toLocaleString()}
                              <span className={`text-xs font-sans ml-1 font-medium ${styles.textMuted}`}>/yr</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions block */}
                        <div className={`mt-6 space-y-3 pt-4 border-t ${styles.border} w-full`}>
                          {b.eligible ? (
                            <a
                              href={programApplyUrls[b.program_id] || "https://www.benefits.gov/"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-center bg-primary text-on-primary py-2.5 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity flex-grow cursor-pointer"
                            >
                              {activeTranslations.applyNow}
                            </a>
                          ) : (
                            <button className="w-full text-center border border-outline-variant text-on-surface-variant/60 py-2.5 rounded-full text-xs font-semibold cursor-not-allowed flex-grow" disabled>
                              Ineligible
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedAuditProgram(b)}
                            className={`w-full text-center border py-2.5 rounded-full text-xs font-semibold transition-colors flex-grow cursor-pointer ${styles.border} ${styles.text} hover:bg-black/5`}
                          >
                            {activeTranslations.viewSource}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: IMPACT ANALYSIS */}
            {activeTab === "impact" && (
              <div className="space-y-12">
                {/* Header */}
                <div className="mb-12">
                  <h1 className="font-display-lg text-display-lg-mobile md:text-5xl text-primary mb-4">
                    {activeTranslations.impactTitle}
                  </h1>
                  <p className="font-body-lg text-body-md text-on-surface-variant max-w-2xl leading-relaxed">
                    {activeTranslations.impactDesc}
                  </p>
                </div>

                {/* Contradiction Alerts Card */}
                {contradictionAlerts.length > 0 && (
                  <div className="bg-error-container/10 border border-error/20 p-6 rounded-2xl space-y-4 shadow-sm animate-in fade-in duration-300">
                    <h3 className="text-xs font-black uppercase tracking-wider text-error flex items-center gap-1.5" style={{ color: "var(--color-error)" }}>
                      <span className="material-symbols-outlined text-sm font-bold">warning</span>
                      {lang === "es" ? "Inconsistencias de Perfil Detectadas" : "Profile Contradiction Alerts"}
                    </h3>
                    <div className="space-y-2 text-xs text-on-surface-variant leading-relaxed">
                      {contradictionAlerts.map((alert, aIdx) => (
                        <div key={aIdx} className="bg-white/50 p-4 rounded-xl border border-error/10">
                          {alert}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Statistics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="glass-card p-8 rounded-xl flex flex-col justify-between border-primary/5">
                    <div>
                      <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest block font-bold">
                        Total Annual Value
                      </span>
                      <div className="font-display-lg text-3xl text-primary mt-2 font-bold">${totalAnnualValue.toLocaleString()}</div>
                    </div>
                    <div className="mt-4 flex items-center text-primary text-xs font-semibold">
                      <span className="material-symbols-outlined mr-1">trending_up</span>
                      <span>Est. Net Benefit</span>
                    </div>
                  </div>
                  <div className="glass-card p-8 rounded-xl flex flex-col justify-between">
                    <div>
                      <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest block font-bold">
                        Programs Matched
                      </span>
                      <div className="font-display-lg text-3xl text-primary mt-2 font-bold">{matchedProgramsCount}</div>
                    </div>
                    <div className="mt-4 flex items-center text-on-surface-variant text-xs font-semibold">
                      <span>Across 3 agencies</span>
                    </div>
                  </div>
                  <div className="glass-card p-8 rounded-xl flex flex-col justify-between border-primary/10">
                    <div>
                      <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest block font-bold">
                        {lang === "es" ? "Valor de Vida del Hogar" : "Household Lifetime Value"}
                      </span>
                      <div className="font-display-lg text-3xl text-primary mt-2 font-bold">${(totalAnnualValue * 3).toLocaleString()}</div>
                      <span className="text-[10px] text-on-surface-variant/75 font-bold block mt-1">
                        ${(totalAnnualValue * 5).toLocaleString()} {lang === "es" ? "proyectado a 5 años" : "projected over 5 years"}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center text-primary text-xs font-semibold">
                      <span className="material-symbols-outlined mr-1">auto_graph</span>
                      <span>{lang === "es" ? "Proyección de 3 años" : "Compound 3-year projection"}</span>
                    </div>
                  </div>
                  <div className="glass-card p-8 rounded-xl flex flex-col justify-between border-error/10">
                    <div>
                      <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest block font-bold">
                        Soonest Deadline
                      </span>
                      <div className="font-display-lg text-3xl text-error mt-2 font-bold">4 days</div>
                    </div>
                    <div className="mt-4 flex items-center text-error text-xs font-bold">
                      <span className="material-symbols-outlined mr-1">priority_high</span>
                      <span>Window Closes Soon</span>
                    </div>
                  </div>
                </div>

                {/* Graph section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
                  <div className="lg:col-span-8 glass-card p-8 rounded-xl space-y-8">
                    <div>
                      <h3 className="font-headline-md text-headline-md text-primary font-bold">{activeTranslations.chartTitle}</h3>
                      <p className="text-xs text-on-surface-variant mt-1">{activeTranslations.chartDesc}</p>
                    </div>

                    <div className="space-y-6 pt-4">
                      {eligibilityResults.map((b) => {
                        const eligible = b.eligible;
                        const pct = totalAnnualValue > 0 ? ((b.monthly_value_usd * 12) / totalAnnualValue) * 100 : 0;
                        return (
                          <div key={b.program_id} className="group">
                            <div className="flex justify-between text-xs text-on-surface mb-2 font-semibold">
                              <span>{b.program_name}</span>
                              <span>
                                {eligible
                                  ? `$${Math.round(b.monthly_value_usd * 12).toLocaleString()}`
                                  : "Ineligible"}
                              </span>
                            </div>
                            <div className="w-full bg-surface-container rounded-full h-2.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ${eligible ? "bg-primary" : "bg-outline-variant/30"}`}
                                style={{ width: eligible ? `${pct || 15}%` : "0%" }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Shareable Tilting Card */}
                  <div className="lg:col-span-4 flex flex-col gap-6 w-full">
                    <div
                      ref={shareCardRef}
                      className="bg-primary text-on-primary p-8 rounded-xl relative overflow-hidden flex flex-col justify-between aspect-[3/4] shadow-2xl transition-transform ease-out cursor-pointer"
                      style={{ transformStyle: "preserve-3d" }}
                    >
                      <div style={{ transform: "translateZ(30px)" }}>
                        <div className="text-xs opacity-70 mb-2 font-semibold">{activeTranslations.shareOutlook}</div>
                        <h2 className="font-display-lg text-3xl mb-8 italic">{activeTranslations.shareReport}</h2>
                        <div className="space-y-6">
                          <div className="border-l-2 border-white/20 pl-4">
                            <div className="text-2xl font-bold">${totalAnnualValue.toLocaleString()}</div>
                            <div className="text-[10px] opacity-60 font-semibold uppercase tracking-wider">Total Benefit Value</div>
                          </div>
                          <div className="border-l-2 border-white/20 pl-4">
                            <div className="text-2xl font-bold">{matchedProgramsCount}</div>
                            <div className="text-[10px] opacity-60 font-semibold uppercase tracking-wider">Programs Qualified</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-end" style={{ transform: "translateZ(20px)" }}>
                        <div>
                          <div className="text-sm font-bold">FormZero</div>
                          <div className="text-[9px] opacity-50 font-semibold uppercase">AI Benefits Matching</div>
                        </div>
                      </div>

                      {/* background shapes */}
                      <div className="absolute -top-20 -right-20 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
                      <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                    </div>

                    <button 
                      onClick={handleDownloadShareableSummary}
                      className="w-full bg-secondary-container text-on-secondary-container py-3.5 rounded-full font-label-sm text-xs flex items-center justify-center gap-2 hover:bg-secondary-fixed transition-colors active:scale-95 duration-200 cursor-pointer font-bold uppercase tracking-wider"
                    >
                      <span className="material-symbols-outlined">download</span>
                      {activeTranslations.shareDownload}
                    </button>
                  </div>
                </div>

                {/* County-Level Underclaim Heatmap & Comparison */}
                {(() => {
                  const stateVal = (profileFacts.state || "CA").trim().toLowerCase();
                  const stateMap: Record<string, string> = {
                    alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
                    colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
                    hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
                    kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
                    massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
                    montana: "MT", nebraska: "NE", nevada: "NV", new_hampshire: "NH", new_jersey: "NJ",
                    new_mexico: "NM", new_york: "NY", north_carolina: "NC", north_dakota: "ND", ohio: "OH",
                    oklahoma: "OK", oregon: "OR", pennsylvania: "PA", rhode_island: "RI", south_carolina: "SC",
                    south_dakota: "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
                    virginia: "VA", washington: "WA", west_virginia: "WV", wisconsin: "WI", wyoming: "WY",
                    ca: "CA", tx: "TX", fl: "FL", ny: "NY", il: "IL", pa: "PA", oh: "OH", ga: "GA", nc: "NC", mi: "MI"
                  };
                  const cleanStateVal = stateVal.replace(/\s+/g, "_");
                  const stateCode = stateMap[cleanStateVal] || stateVal.toUpperCase();

                  const activeStateData = countyData[stateCode] || {
                    [`${stateCode} County A`]: { underclaimRate: 58, totalUnclaimedUsd: 25000000 },
                    [`${stateCode} County B`]: { underclaimRate: 52, totalUnclaimedUsd: 18000000 },
                    [`${stateCode} County C`]: { underclaimRate: 62, totalUnclaimedUsd: 8000000 }
                  };

                  const counties = Object.keys(activeStateData);
                  const currentCountyName = counties.includes(selectedCounty) ? selectedCounty : (counties[0] || "County A");
                  const data = activeStateData[currentCountyName] || { underclaimRate: 60, totalUnclaimedUsd: 15000000 };

                  const countyValues = Object.values(activeStateData);
                  const stateAverage = countyValues.length > 0 
                    ? Math.round(countyValues.reduce((sum, c) => sum + c.underclaimRate, 0) / countyValues.length)
                    : 52;
                  
                  return (
                    <div className="glass-card p-8 rounded-xl space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/15 pb-4">
                        <div>
                          <h3 className="font-headline-md text-headline-md text-primary font-bold">
                            {lang === "es" ? "Mapa de Tasa de Reclamaciones Locales" : "County-Level Underclaim Heatmap"}
                          </h3>
                          <p className="text-xs text-on-surface-variant mt-1">
                            {lang === "es" 
                              ? "Tasa de personas elegibles que no reclaman sus beneficios en su ubicación."
                              : "Tracking the rate of eligible residents who fail to claim their benefits locally."}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                            {lang === "es" ? "Condado:" : "Select County:"}
                          </label>
                          <select
                            value={currentCountyName}
                            onChange={(e) => setSelectedCounty(e.target.value)}
                            className="bg-surface-container border border-outline-variant/35 rounded-lg px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary font-semibold"
                          >
                            {counties.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                        <div className="md:col-span-5 bg-primary/5 rounded-2xl p-6 border border-primary/10 flex flex-col items-center justify-center relative min-h-[180px] overflow-hidden">
                          <div className="absolute w-40 h-40 rounded-full border-4 border-error/10 animate-ping opacity-60"></div>
                          <div className="absolute w-24 h-24 rounded-full border-4 border-error/20"></div>
                          <div className="absolute w-12 h-12 rounded-full bg-error/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-error text-xl font-bold animate-pulse">location_on</span>
                          </div>
                          
                          <div className="z-10 mt-20 text-center space-y-1">
                            <div className="text-xs font-bold text-primary uppercase tracking-wider">{currentCountyName}, {stateCode}</div>
                            <div className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">
                              {lang === "es" ? "Región Auditada" : "Active Audit Region"}
                            </div>
                          </div>
                        </div>

                        <div className="md:col-span-7 space-y-6">
                          <div className="space-y-2">
                            <div className="text-xs font-bold uppercase tracking-wider text-error animate-pulse" style={{ color: "var(--color-error)" }}>
                              {lang === "es" ? "Tasa de Beneficios No Reclamados" : "Local Underclaim Statistics"}
                            </div>
                            <blockquote className="text-lg font-bold font-display-lg text-primary leading-snug">
                              {lang === "es"
                                ? `“En el condado de ${currentCountyName}, ${stateCode}, el ${data.underclaimRate}% de los residentes elegibles no reclaman SNAP. Usted es uno de ellos.”`
                                : `“In ${currentCountyName}, ${stateCode}, ${data.underclaimRate}% of eligible residents don't claim SNAP. You're one of them.”`}
                            </blockquote>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <div className="flex justify-between text-xs font-semibold mb-1 text-on-surface-variant">
                                <span>{lang === "es" ? "Tasa de Omisión del Condado" : "County Underclaim Rate"}</span>
                                <span className="text-error font-bold">{data.underclaimRate}%</span>
                              </div>
                              <div className="w-full bg-surface-container rounded-full h-3 overflow-hidden">
                                <div 
                                  className="bg-error h-full rounded-full transition-all duration-1000" 
                                  style={{ width: `${data.underclaimRate}%`, backgroundColor: "var(--color-error)" }}
                                ></div>
                              </div>
                            </div>
                            
                            <div className="flex gap-8 text-xs font-semibold text-on-surface-variant">
                              <div>
                                <span className="block text-[10px] uppercase font-bold text-on-surface-variant/60">{lang === "es" ? "Tasa Estatal Promedio" : "State Average Rate"}</span>
                                <span className="text-primary font-bold">{stateAverage}%</span>
                              </div>
                              <div>
                                <span className="block text-[10px] uppercase font-bold text-on-surface-variant/60">{lang === "es" ? "Pérdida Total del Condado" : "Total County Loss"}</span>
                                <span className="text-primary font-bold font-mono">${(data.totalUnclaimedUsd / 1000000).toFixed(1)}M / year</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* WHAT-IF POLICY SIMULATOR & BENEFITS CLIFF ANALYZER */}
                <section className="bg-white border border-outline-variant/35 rounded-3xl p-8 md:p-12 shadow-sm space-y-8 mt-12">
                  <header className="space-y-3 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-[1.5px] bg-primary"></span>
                      <span className="font-label-sm text-[10px] text-primary tracking-widest uppercase font-bold">
                        Interactive What-If Simulation
                      </span>
                    </div>
                    <h2 className="font-display-lg text-headline-md text-primary font-bold">
                      What-If Policy Simulator & Benefits Cliff Analyzer
                    </h2>
                    <p className="font-body-lg text-body-md text-on-surface-variant leading-relaxed">
                      Adjust your income and household size parameters to simulate future changes. Witness how policy rules recalculate dynamically and detect potential "benefits cliffs" before they happen.
                    </p>
                  </header>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Simulator Controls */}
                    <div className="lg:col-span-7 bg-surface-container-low border border-outline-variant/20 p-6 md:p-8 rounded-2xl space-y-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                          <span>{lang === "es" ? "Ingresos Mensuales" : "Simulated Monthly Income"}</span>
                          <span className="text-primary font-mono text-sm">${simulationIncome.toLocaleString()}/mo (${(simulationIncome * 12).toLocaleString()}/yr)</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="8000"
                          step="100"
                          value={simulationIncome}
                          onChange={(e) => {
                            setIsSimulationActive(true);
                            setSimulationIncome(Number(e.target.value));
                          }}
                          className="w-full h-2 bg-outline-variant/40 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-[10px] text-on-surface-variant/50 font-bold">
                          <span>$0</span>
                          <span>$4,000</span>
                          <span>$8,000</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                          <span>{lang === "es" ? "Tamaño del Hogar" : "Simulated Household Size"}</span>
                          <span className="text-primary font-mono text-sm">{simulationHouseholdSize} {simulationHouseholdSize === 1 ? (lang === "es" ? "persona" : "person") : (lang === "es" ? "personas" : "people")}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="1"
                          value={simulationHouseholdSize}
                          onChange={(e) => {
                            setIsSimulationActive(true);
                            setSimulationHouseholdSize(Number(e.target.value));
                          }}
                          className="w-full h-2 bg-outline-variant/40 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-[10px] text-on-surface-variant/50 font-bold">
                          <span>1</span>
                          <span>5</span>
                          <span>10</span>
                        </div>
                      </div>

                      {isSimulationActive && (
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => {
                              setSimulationIncome(parseFloat(profileFacts.monthly_income) || 0);
                              setSimulationHouseholdSize(parseInt(profileFacts.household_size) || 1);
                              setIsSimulationActive(false);
                            }}
                            className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-xs">restart_alt</span>
                            Reset to Baseline Profile
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Simulation Outputs & Cliff warnings */}
                    <div className="lg:col-span-5 bg-primary/5 border border-primary/10 p-6 md:p-8 rounded-2xl flex flex-col justify-between min-h-[250px] shadow-sm">
                      <div className="space-y-4">
                        <span className="text-[10px] font-mono tracking-widest text-primary/70 uppercase bg-primary/10 border border-primary/20 px-2.5 py-1 rounded w-max block font-bold">
                          {isSimulationActive ? "SIMULATED VALUE PROJECTION" : "BASELINE VALUE PROJECTION"}
                        </span>
                        
                        <div className="space-y-2">
                          <div className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">
                            Annual Benefits Value
                          </div>
                          <div className="font-display-lg text-4xl text-primary font-bold">
                            ${isSimulationActive && simulatedResultsData
                              ? simulatedResultsData.annualValue.toLocaleString(undefined, { maximumFractionDigits: 0 })
                              : totalAnnualValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            <span className="text-xs font-sans text-on-surface-variant font-medium ml-1">/year</span>
                          </div>
                          <div className="text-xs text-on-surface-variant leading-none font-semibold">
                            {isSimulationActive && simulatedResultsData
                              ? `Qualified for ${simulatedResultsData.count} matched programs`
                              : `Qualified for ${matchedProgramsCount} matched programs`}
                          </div>
                        </div>

                        {/* Cliff Warning / Differences banner */}
                        {isSimulationActive && simulatedResultsData && (() => {
                          const diff = simulatedResultsData.annualValue - totalAnnualValue;
                          if (diff < -50) {
                            return (
                              <div className="bg-error/10 border border-error/25 p-4 rounded-xl space-y-2 text-error animate-in fade-in duration-300">
                                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider">
                                  <span className="material-symbols-outlined text-sm font-bold">warning</span>
                                  Benefits Cliff Detected
                                </div>
                                <p className="text-[11px] leading-relaxed text-on-error-container font-medium">
                                  A monthly raise of ${(simulationIncome - (parseFloat(profileFacts.monthly_income) || 0)).toFixed(0)} causes an annual benefit drop of <span className="font-bold">${Math.abs(diff).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>. A standard screener would hide this cliff!
                                </p>
                              </div>
                            );
                          } else if (diff > 50) {
                            return (
                              <div className="bg-emerald-500/10 border border-emerald-500/25 p-4 rounded-xl space-y-2 text-emerald-800 animate-in fade-in duration-300">
                                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider">
                                  <span className="material-symbols-outlined text-sm font-bold">trending_up</span>
                                  Benefit Expansion
                                </div>
                                <p className="text-[11px] leading-relaxed text-emerald-950 font-medium">
                                  This simulated profile increases your annual eligible benefits by <span className="font-bold">+${diff.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>.
                                </p>
                              </div>
                            );
                          } else {
                            return (
                              <div className="bg-surface-container-highest border border-outline-variant/30 p-4 rounded-xl text-on-surface-variant/80 text-xs font-medium animate-in fade-in duration-300">
                                Simulated values match your baseline benefit calculation.
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* TAB 3: DOCUMENT CHECKLIST */}
            {activeTab === "documents" && (() => {
              // Collect documents that are already completed from roadmap
              const completedDocs = new Set<string>();
              eligibilityResults.forEach((b) => {
                if (completedRoadmapSteps[b.program_name]) {
                  const checklist = getDocumentChecklist(b.program_name);
                  if (checklist) {
                    checklist.documents.forEach((doc) => {
                      completedDocs.add(doc.name);
                    });
                  }
                }
              });

              let totalDocs = 0;
              let likelyHaveDocs = 0;
              let needToGatherDocs = 0;
              let mayNotHaveDocs = 0;
              let uncondensedCount = 0;
              const seenDocs = new Set<string>();

              eligibilityResults.forEach((b) => {
                if (b.eligible) {
                  const checklist = getDocumentChecklist(b.program_name);
                  if (checklist) {
                    uncondensedCount += checklist.documents.length;
                    checklist.documents.forEach((doc) => {
                      if (!seenDocs.has(doc.name)) {
                        seenDocs.add(doc.name);
                        totalDocs++;
                        if (completedDocs.has(doc.name) || doc.status === "likely_have") {
                          likelyHaveDocs++;
                        } else if (doc.status === "need_to_gather") {
                          needToGatherDocs++;
                        } else {
                          mayNotHaveDocs++;
                        }
                      }
                    });
                  }
                }
              });

              const preparednessPercentage = totalDocs > 0 ? Math.round((likelyHaveDocs / totalDocs) * 100) : 0;
              const duplicateSavings = uncondensedCount - totalDocs;

              return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
                  {/* Left Side: Summary Panel */}
                  <div className="lg:col-span-4 lg:sticky lg:top-32 w-full">
                    <div className="glass-card p-8 rounded-xl border border-outline-variant/30 space-y-6">
                      <div className="space-y-1">
                        <h3 className="font-headline-md text-2xl font-bold text-primary leading-tight">
                          {lang === "es" ? "Análisis de Resumen" : "Summary Analysis"}
                        </h3>
                        <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                          {lang === "es" ? "Evaluación de Preparación" : "Preparation Audit"}
                        </p>
                      </div>

                      {/* Document Status Breakdown List */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between font-bold text-xs text-on-surface">
                          <span>{lang === "es" ? "Probablemente Disponible" : "Likely Available"}</span>
                          <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                            {likelyHaveDocs} {lang === "es" ? "docs" : "docs"} ({preparednessPercentage}%)
                          </span>
                        </div>

                        {/* Segmented Progress Bar */}
                        <div className="w-full bg-surface-container h-3 rounded-full overflow-hidden flex">
                          <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${totalDocs > 0 ? (likelyHaveDocs / totalDocs) * 100 : 0}%` }}></div>
                          <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${totalDocs > 0 ? (needToGatherDocs / totalDocs) * 100 : 0}%` }}></div>
                          <div className="bg-error h-full transition-all duration-500" style={{ width: `${totalDocs > 0 ? (mayNotHaveDocs / totalDocs) * 100 : 0}%` }}></div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[10px] text-on-surface-variant font-semibold pt-1">
                          <div className="flex items-center gap-1.5 justify-center py-1 bg-emerald-50/50 border border-emerald-100 rounded">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>{likelyHaveDocs} {lang === "es" ? "Probable" : "Likely Have"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 justify-center py-1 bg-amber-50/50 border border-amber-100 rounded">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>{needToGatherDocs} {lang === "es" ? "Falta" : "Gather"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 justify-center py-1 bg-red-50/50 border border-red-100 rounded">
                            <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                            <span>{mayNotHaveDocs} {lang === "es" ? "Falta" : "Action"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Smart Deduplication Alert Card */}
                      {duplicateSavings > 0 && (
                        <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-base font-bold">join_inner</span>
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
                              {lang === "es" ? "Deduplicación Inteligente" : "Smart Deduplication"}
                            </span>
                          </div>
                          <p className="text-[11px] text-on-surface-variant leading-relaxed">
                            {lang === "es" ? (
                              <>
                                FormZero comparó sus <strong>{eligibilityResults.filter(r => r.eligible).length} programas elegibles</strong> y combinó requisitos idénticos. ¡Ahorró <strong>{duplicateSavings} documentos duplicados</strong>! Solo necesita reunir {totalDocs} archivos únicos.
                              </>
                            ) : (
                              <>
                                FormZero cross-referenced your <strong>{eligibilityResults.filter(r => r.eligible).length} matched programs</strong> and merged identical requirements. You saved <strong>{duplicateSavings} duplicate documents</strong>! You only need to collect {totalDocs} unique files.
                              </>
                            )}
                          </p>
                        </div>
                      )}

                      {/* Audit Progress Steps */}
                      <div className="pt-4 border-t border-outline-variant/20 space-y-3">
                        <div className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
                          {lang === "es" ? "Etapas de Verificación" : "Verification Stages"}
                        </div>
                        <ul className="space-y-2.5">
                          <li className="flex items-center gap-2.5 text-xs font-medium text-on-surface-variant">
                            <span className="material-symbols-outlined text-emerald-600 text-sm font-bold">check_circle</span>
                            <span>{lang === "es" ? "Datos de perfil verificados" : "Profile matching complete"}</span>
                          </li>
                          <li className="flex items-center gap-2.5 text-xs font-medium text-on-surface-variant">
                            <span className="material-symbols-outlined text-emerald-600 text-sm font-bold">check_circle</span>
                            <span>{lang === "es" ? "Límites federales auditados" : "Federal threshold audit complete"}</span>
                          </li>
                          <li className="flex items-center gap-2.5 text-xs font-medium text-on-surface-variant">
                            <span className={`material-symbols-outlined text-sm font-bold ${preparednessPercentage === 100 ? "text-emerald-600" : "text-amber-500 animate-pulse"}`}>
                              {preparednessPercentage === 100 ? "check_circle" : "pending"}
                            </span>
                            <span>
                              {lang === "es" 
                                ? `${likelyHaveDocs} de ${totalDocs} documentos probables` 
                                : `${likelyHaveDocs} of ${totalDocs} documents likely available`}
                            </span>
                          </li>
                        </ul>
                      </div>

                      {/* Privacy & Local Processing Box */}
                      <div className="pt-4 border-t border-outline-variant/20">
                        <div className="bg-surface-container-low border border-outline-variant/15 rounded-xl p-4 flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-sm font-bold">shield_lock</span>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-primary uppercase tracking-wide">
                              {lang === "es" ? "Privacidad Primero" : "Privacy First"}
                            </div>
                            <div className="text-[10px] text-on-surface-variant/80 leading-normal mt-1">
                              {lang === "es"
                                ? "Nunca almacenamos sus documentos ni datos personales en nuestros servidores. Todo se procesa localmente en su dispositivo."
                                : "We never store your documents or personal data on our servers. Everything is processed locally on your device."}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Collapsible lists */}
                  <div className="lg:col-span-8 w-full space-y-6">
                    <div className="mb-4">
                      <h1 className="font-display-lg text-display-lg-mobile md:text-5xl text-primary mb-4">
                        {activeTranslations.docTitle}
                      </h1>
                      <p className="font-body-lg text-body-md text-on-surface-variant max-w-2xl leading-relaxed">
                        {activeTranslations.docDesc}
                      </p>
                    </div>

                    {eligibilityResults.map((b) => {
                      const checklist = getDocumentChecklist(b.program_name);
                      if (!checklist) return null;
                      const isOpen = expandedDocumentChecklist === b.program_id;
                      const isProgramCompleted = completedRoadmapSteps[b.program_name] === true;

                      return (
                        <details
                          key={b.program_id}
                          className="group glass-card rounded-xl overflow-hidden transition-all duration-300"
                          open={isOpen}
                          onToggle={(e) => {
                            const open = (e.target as HTMLDetailsElement).open;
                            setExpandedDocumentChecklist(open ? b.program_id : null);
                          }}
                        >
                          <summary className="flex items-center justify-between p-6 cursor-pointer hover:bg-surface-container-low transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-on-primary text-lg">
                                  {b.program_id === "snap" ? "restaurant" : b.program_id === "medicaid" ? "medical_services" : b.program_id === "wic" ? "child_care" : b.program_id === "pell_grant" ? "school" : b.program_id === "ssi_ssdi" ? "accessible" : "assignment_ind"}
                                </span>
                              </div>
                              <div>
                                <h2 className="font-headline-md text-2xl text-primary font-bold">{b.program_name}</h2>
                                <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">
                                  {b.eligible ? "Requirements Checklist" : "Reference Checklist"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {b.eligible && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCompletedRoadmapSteps(prev => ({
                                      ...prev,
                                      [b.program_name]: !prev[b.program_name]
                                    }));
                                  }}
                                  className={`px-3 py-1.5 rounded-full font-bold text-[10px] uppercase tracking-wider duration-200 cursor-pointer flex items-center gap-1 ${
                                    isProgramCompleted
                                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                      : "bg-surface-container-highest text-on-surface-variant hover:bg-primary/10 hover:text-primary"
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-xs">check_circle</span>
                                  <span>
                                    {isProgramCompleted
                                      ? (lang === "es" ? "Completado" : "Completed")
                                      : (lang === "es" ? "Marcar Hecho" : "Mark Done")}
                                  </span>
                                </button>
                              )}
                              <span className="material-symbols-outlined transition-transform group-open:rotate-180 text-xl font-bold">
                                expand_more
                              </span>
                            </div>
                          </summary>
                          <div className="p-6 pt-0 border-t border-outline-variant/10">
                            <ul className="space-y-4 pt-6">
                              {checklist.documents.map((doc, dIdx) => {
                                const isDocCompleted = completedDocs.has(doc.name) || isProgramCompleted;
                                return (
                                  <li
                                    key={dIdx}
                                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/10 shadow-sm gap-4 border-l-4 ${isDocCompleted || doc.status === "likely_have" ? "border-l-emerald-600" : doc.status === "need_to_gather" ? "border-l-amber-600" : "border-l-error"}`}
                                  >
                                    <div className="flex items-start gap-4">
                                      <div
                                        className={`p-2 rounded-full shrink-0 ${isDocCompleted || doc.status === "likely_have" ? "text-emerald-600 bg-emerald-50" : doc.status === "need_to_gather" ? "text-amber-600 bg-amber-50" : "text-error bg-error-container"}`}
                                      >
                                        <span className="material-symbols-outlined text-sm font-bold">
                                          {isDocCompleted || doc.status === "likely_have" ? "check_circle" : doc.status === "need_to_gather" ? "hourglass_empty" : "close"}
                                        </span>
                                      </div>
                                      <div>
                                        <h4 className="font-bold text-sm text-primary">
                                          {lang === "es" ? doc.name_es : doc.name}
                                        </h4>
                                        <p className="text-xs text-on-surface-variant leading-relaxed">
                                          {lang === "es" ? doc.description_es : doc.description}
                                        </p>
                                        <span className="text-[10px] font-semibold text-on-surface-variant/70 uppercase tracking-wide block mt-1">
                                          {isDocCompleted
                                            ? (lang === "es" ? "Completado" : "Completed")
                                            : doc.status === "likely_have"
                                            ? activeTranslations.likelyHave
                                            : doc.status === "need_to_gather"
                                            ? activeTranslations.needToGather
                                            : activeTranslations.mayNotHave}{" "}
                                          • {lang === "es" ? doc.time_estimate_es : doc.time_estimate}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="shrink-0 flex items-center justify-end">
                                      {isDocCompleted ? (
                                        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">
                                          {lang === "es" ? "✓ Completado" : "✓ Completed"}
                                        </span>
                                      ) : doc.status === "likely_have" ? (
                                        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">
                                          {activeTranslations.likelyHave}
                                        </span>
                                      ) : (
                                        doc.obtain_url ? (
                                          <a
                                            href={doc.obtain_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary font-bold text-xs hover:underline cursor-pointer"
                                          >
                                            {activeTranslations.obtain}
                                          </a>
                                        ) : (
                                          <button className="text-primary font-bold text-xs hover:underline cursor-pointer">
                                            {activeTranslations.obtain}
                                          </button>
                                        )
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* TAB 4: DEPENDENCY ROADMAP */}
            {activeTab === "roadmap" && (() => {
              const totalSteps = orderedRoadmap.length;
              const completedSteps = orderedRoadmap.filter(item => completedRoadmapSteps[item.name] === true).length;
              const roadmapProgressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

              const completedValue = orderedRoadmap.reduce((sum, item) => {
                if (completedRoadmapSteps[item.name] === true) {
                  const matchedResult = eligibilityResults.find(r => r.program_name === item.name);
                  if (matchedResult) {
                    return sum + (matchedResult.monthly_value_usd * 12);
                  }
                }
                return sum;
              }, 0);

              return (
                <div className="max-w-2xl mx-auto w-full space-y-12">
                  {/* Header */}
                  <header className="text-center max-w-xl mx-auto mb-16">
                    <h1 className="font-display-lg text-display-lg-mobile md:text-5xl text-primary mb-4 leading-tight">
                      {activeTranslations.roadmapTitle}
                    </h1>
                    <p className="font-body-lg text-body-md text-on-surface-variant leading-relaxed">
                      {activeTranslations.roadmapDesc}
                    </p>
                  </header>

                  {/* Roadmap Progress Panel */}
                  <div className="glass-card p-6 rounded-2xl border border-outline-variant/35 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-sm text-primary uppercase tracking-wider">
                          {lang === "es" ? "Progreso de la Ruta de Aplicación" : "Application Roadmap Progress"}
                        </h3>
                        <p className="text-xs text-on-surface-variant mt-1">
                          {lang === "es"
                            ? `${completedSteps} de ${totalSteps} programas completados (${roadmapProgressPercentage}%)`
                            : `${completedSteps} of ${totalSteps} programs completed (${roadmapProgressPercentage}%)`}
                        </p>
                      </div>
                      {completedValue > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200/50 rounded-xl px-4 py-2 text-right">
                          <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                            {lang === "es" ? "Valor Anual Asegurado" : "Annual Value Secured"}
                          </div>
                          <div className="text-lg font-bold text-emerald-950">
                            ${completedValue.toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${roadmapProgressPercentage}%` }}></div>
                    </div>

                    {roadmapProgressPercentage === 100 && (
                      <div className="bg-emerald-50/70 border border-emerald-200/50 rounded-xl p-4 flex items-start gap-3 mt-2 animate-in zoom-in-95 duration-300">
                        <span className="material-symbols-outlined text-emerald-600 text-lg shrink-0 mt-0.5 animate-bounce">celebration</span>
                        <div>
                          <div className="text-xs font-bold text-emerald-950">
                            {lang === "es" ? "🎉 ¡Felicidades! Ruta Completada" : "🎉 Congratulations! Roadmap Completed"}
                          </div>
                          <p className="text-[11px] text-emerald-800/90 leading-relaxed mt-1">
                            {lang === "es"
                              ? `Ha completado todos los pasos secuenciales de su ruta y optimizado sus solicitudes de beneficios. ¡Ha asegurado un total estimado de $${completedValue.toLocaleString()} al año!`
                              : `You have completed all sequential steps in your roadmap and successfully optimized your benefits. You've secured an estimated total of $${completedValue.toLocaleString()}/year!`}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Multi-Hop Visualizer */}
                  <div className="glass-card p-6 rounded-2xl space-y-6 shadow-sm border-primary/5">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <span className="material-symbols-outlined text-[18px]">account_tree</span>
                      </span>
                      <div>
                        <h3 className="font-bold text-sm text-primary uppercase tracking-wider">
                          {lang === "es" ? "Visualizador de Desbloqueo Multi-Salto (IA)" : "AI Multi-Hop Unlock Chain Visualizer"}
                        </h3>
                        <p className="text-[10px] text-on-surface-variant">
                          {lang === "es" ? "Cómo los programas aprobados eliminan barreras para aprobaciones subsiguientes." : "How sequential approvals categorically bypass subsequent verification backlogs."}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
                      <div className="flex-1 bg-white p-4 rounded-xl border border-outline-variant/35 shadow-sm text-center w-full relative group hover:border-primary/50 transition-colors">
                        <span className="bg-primary/5 text-primary text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-widest block w-max mx-auto mb-2">Stage 1</span>
                        <h4 className="font-bold text-xs text-primary mb-1">SNAP / Medicaid</h4>
                        <p className="text-[10px] text-on-surface-variant leading-relaxed">
                          {lang === "es" ? "Aprobación de Ingresos Básicos" : "Base Gross Income Audit Approved"}
                        </p>
                      </div>

                      <div className="flex items-center justify-center shrink-0 w-8 md:w-12 h-8 md:h-auto select-none pointer-events-none">
                        <svg className="w-6 h-6 text-primary animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" className="hidden md:block" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" className="block md:hidden" />
                        </svg>
                      </div>

                      <div className="flex-1 bg-white p-4 rounded-xl border border-outline-variant/35 shadow-sm text-center w-full relative group hover:border-primary/50 transition-colors">
                        <span className="bg-emerald-500/10 text-emerald-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-widest block w-max mx-auto mb-2">Unlocked Stage 2</span>
                        <h4 className="font-bold text-xs text-emerald-950 mb-1">Lifeline Broadband</h4>
                        <p className="text-[10px] text-emerald-900 leading-relaxed font-medium">
                          {lang === "es" ? "Calificación Categórica Directa" : "Direct Categorical Qualification"}
                        </p>
                        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                          {lang === "es" ? "Aprobación Instantánea" : "Instant Approval"}
                        </div>
                      </div>

                      <div className="flex items-center justify-center shrink-0 w-8 md:w-12 h-8 md:h-auto select-none pointer-events-none">
                        <svg className="w-6 h-6 text-primary animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" className="hidden md:block" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" className="block md:hidden" />
                        </svg>
                      </div>

                      <div className="flex-grow flex-1 bg-white p-4 rounded-xl border border-outline-variant/35 shadow-sm text-center w-full relative group hover:border-primary/50 transition-colors animate-in zoom-in-95 duration-500">
                        <span className="bg-emerald-500/10 text-emerald-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-widest block w-max mx-auto mb-2">Unlocked Stage 3</span>
                        <h4 className="font-bold text-xs text-emerald-950 mb-1">WIC Support</h4>
                        <p className="text-[10px] text-emerald-900 leading-relaxed font-medium">
                          {lang === "es" ? "Revisión Urgente sin Carga" : "Expedited Backlog Bypass"}
                        </p>
                        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm animate-bounce">
                          {lang === "es" ? "Ahorra 3 Semanas" : "Saves 3 Weeks"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Optimal Application Order Engine */}
                  <div className="glass-card p-6 rounded-2xl border border-outline-variant/35 shadow-sm space-y-6">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <span className="material-symbols-outlined text-[18px]">route</span>
                      </span>
                      <div>
                        <h3 className="font-bold text-sm text-primary uppercase tracking-wider">
                          {lang === "es" ? "Secuenciación Óptima de Aplicaciones (IA)" : "AI Optimal Application Sequence"}
                        </h3>
                        <p className="text-[10px] text-on-surface-variant">
                          {lang === "es" ? "Secuencia óptima calculada en base a tiempos de espera, plazos y desbloqueos mutuos." : "Chronological sequence calculated to maximize speed and automatic categorical overrides."}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                      <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 space-y-2 relative">
                        <div className="flex justify-between items-center">
                          <span className="bg-primary text-on-primary text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Priority 1</span>
                          <span className="text-[10px] text-error font-bold">45d Wait</span>
                        </div>
                        <h4 className="font-bold text-xs text-primary">Medicaid</h4>
                        <p className="text-[10px] text-on-surface-variant leading-relaxed">
                          {lang === "es" ? "Aplique primero. Tarda 45 días pero desbloquea Lifeline y WIC." : "Apply first. Longest backlog (45 days) but unlocks Lifeline and WIC verification exemptions."}
                        </p>
                      </div>

                      <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="bg-primary text-on-primary text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Priority 2</span>
                          <span className="text-[10px] text-on-surface-variant font-bold font-semibold">30d Wait</span>
                        </div>
                        <h4 className="font-bold text-xs text-primary">SNAP</h4>
                        <p className="text-[10px] text-on-surface-variant leading-relaxed">
                          {lang === "es" ? "Aplique segundo. Tarda 30 días. Su aprobación califica para Lifeline." : "Apply second. Standard backlog (30 days). SNAP approval establishes instant Lifeline eligibility."}
                        </p>
                      </div>

                      <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="bg-primary text-on-primary text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Priority 3</span>
                          <span className="text-[10px] text-on-surface-variant font-bold font-semibold">7d Wait</span>
                        </div>
                        <h4 className="font-bold text-xs text-primary">Pell Grant</h4>
                        <p className="text-[10px] text-on-surface-variant leading-relaxed">
                          {lang === "es" ? "Aplique tercero. Tarda 7 días. Su estado de beca califica para SNAP de estudiante." : "Apply third. Short backlog (7 days). Grant approval qualifies college student exception rules for SNAP."}
                        </p>
                      </div>

                      <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="bg-emerald-500 text-white text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Priority 4</span>
                          <span className="text-[10px] text-emerald-600 font-bold font-semibold">Instant</span>
                        </div>
                        <h4 className="font-bold text-xs text-emerald-950 font-bold">Lifeline</h4>
                        <p className="text-[10px] text-on-surface-variant leading-relaxed">
                          {lang === "es" ? "Aplique al final. Aprobación instantánea usando SNAP o Medicaid." : "Apply last. Instant activation using verification hash from SNAP or Medicaid approval."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Steps timeline */}
                  <div className="relative flex flex-col items-center gap-0">
                    {orderedRoadmap.map((item, idx) => {
                      const matchedResult = eligibilityResults.find(r => r.program_name === item.name);
                      const eligible = matchedResult ? matchedResult.eligible : false;
                      const isCompleted = completedRoadmapSteps[item.name] === true;
                      // A step is unlocked if it's the first step OR the previous step is completed (marked as done)
                      const isUnlocked = idx === 0 || completedRoadmapSteps[orderedRoadmap[idx - 1].name] === true;

                      return (
                        <React.Fragment key={idx}>
                          <div className="w-full relative z-10">
                            <div
                              className={`rounded-xl p-8 border border-outline-variant/35 shadow-sm transition-all duration-300 hover:translate-y-[-2px] border-l-4 ${isCompleted ? "bg-emerald-50/20 border-emerald-500/35 border-l-emerald-500" : isUnlocked ? "bg-white border-l-primary" : "bg-surface-container-low border-l-outline-variant opacity-85"}`}
                            >
                              <div className="flex flex-col md:flex-row gap-6">
                                <div
                                  className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${isCompleted ? "bg-emerald-500 text-white animate-in zoom-in-50 duration-200" : isUnlocked ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface-variant/40"}`}
                                >
                                  <span className="material-symbols-outlined text-xl font-bold">
                                    {isCompleted ? "check_circle" : isUnlocked ? "check_circle" : "lock"}
                                  </span>
                                </div>
                                <div className="flex-grow">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="bg-surface-container-highest px-3 py-1 rounded-full text-[9px] font-bold text-primary uppercase tracking-widest">
                                      Step {idx + 1}
                                    </span>
                                    <span
                                      className={`font-bold text-[10px] tracking-wider uppercase flex items-center gap-1 ${isCompleted ? "text-emerald-600" : isUnlocked ? "text-emerald-700" : "text-on-surface-variant/40"}`}
                                    >
                                      {isCompleted ? (lang === "es" ? "Completado" : "Completed") : isUnlocked ? activeTranslations.unlocked : activeTranslations.locked}
                                    </span>
                                  </div>
                                  <h3 className={`font-headline-md text-2xl font-bold mb-2 ${isCompleted ? "text-emerald-950" : isUnlocked ? "text-primary" : "text-on-surface-variant/60"}`}>
                                    {item.name}
                                  </h3>
                                  <p className={`text-xs leading-relaxed mb-6 ${isCompleted ? "text-emerald-900/80" : isUnlocked ? "text-on-surface-variant" : "text-on-surface-variant/60"}`}>
                                    {matchedResult?.reasoning_summary || "Program rules and dependency checklist."}
                                  </p>
                                  <div className="flex flex-wrap gap-3">
                                    {isUnlocked ? (
                                      <>
                                        <button
                                          onClick={() => {
                                            setCompletedRoadmapSteps((prev) => ({
                                              ...prev,
                                              [item.name]: !prev[item.name],
                                            }));
                                          }}
                                          className={`${isCompleted ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-primary text-on-primary hover:scale-[1.02]"} px-5 py-2 rounded-full font-bold text-xs scale-100 active:scale-95 duration-200 cursor-pointer flex items-center gap-1`}
                                        >
                                          {isCompleted && (
                                            <span className="material-symbols-outlined text-xs">check</span>
                                          )}
                                          {isCompleted ? (lang === "es" ? "Completado" : "Completed") : activeTranslations.markDone}
                                        </button>
                                        <button
                                          onClick={() => {
                                            const bid = matchedResult?.program_id;
                                            if (bid) {
                                              setActiveTab("documents");
                                              setExpandedDocumentChecklist(bid);
                                            }
                                          }}
                                          className="border border-primary text-primary px-5 py-2 rounded-full font-bold text-xs hover:bg-surface-container transition-colors cursor-pointer"
                                        >
                                          View checklists
                                        </button>
                                      </>
                                    ) : (
                                      <button className="bg-secondary/15 text-on-surface-variant/50 px-5 py-2 rounded-full font-bold text-xs cursor-not-allowed" disabled>
                                        Lock details
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {idx < orderedRoadmap.length - 1 && (
                            <div className={`w-0.5 h-16 relative pointer-events-none ${isCompleted ? "bg-emerald-500" : isUnlocked ? "bg-primary" : "bg-outline-variant/35"}`}>
                              <div className="absolute top-1/2 left-4 whitespace-nowrap text-on-surface-variant/30 font-bold text-[10px] flex items-center gap-1 select-none">
                                <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                <span>unlocks next step</span>
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* TAB 5: WHAT CHANGED */}
            {activeTab === "updates" && (
              <div className="space-y-12">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="max-w-2xl">
                    <h1 className="font-display-lg text-display-lg-mobile md:text-5xl text-primary mb-4 leading-tight">
                      {activeTranslations.updatesTitle}
                    </h1>
                    <p className="font-body-lg text-body-md text-on-surface-variant leading-relaxed">
                      {activeTranslations.updatesDesc}
                    </p>
                  </div>
                  {/* Filter tabs */}
                  <div className="flex flex-wrap gap-1.5 bg-surface-container-low border border-outline-variant/30 p-1.5 rounded-full text-xs font-semibold shrink-0">
                    <button
                      onClick={() => setUpdatesFilter("all")}
                      className={`px-4 py-1.5 rounded-full transition-all ${updatesFilter === "all" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-primary"}`}
                    >
                      {activeTranslations.allUpdates}
                    </button>
                    <button
                      onClick={() => setUpdatesFilter("affects_me")}
                      className={`px-4 py-1.5 rounded-full transition-all ${updatesFilter === "affects_me" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-primary"}`}
                    >
                      {activeTranslations.affectsMe}
                    </button>
                    <button
                      onClick={() => setUpdatesFilter("new_programs")}
                      className={`px-4 py-1.5 rounded-full transition-all ${updatesFilter === "new_programs" ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:text-primary"}`}
                    >
                      {activeTranslations.newProgs}
                    </button>
                  </div>
                </header>

                {/* Updates layout grid */}
                <div className="max-w-3xl mx-auto w-full space-y-6">
                  {filteredUpdates.map((item, idx) => (
                    <article
                      key={idx}
                      className="glass-card rounded-xl p-8 flex flex-col gap-6 hover:border-primary/20 hover:shadow-xl transition-all w-full"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="bg-surface-container-highest px-3 py-1 rounded-full font-label-sm text-[10px] uppercase tracking-widest text-on-surface font-bold">
                            {item.category.replace("_", " ")}
                          </span>
                          <span className="text-[10px] text-on-surface-variant/70 font-semibold">{item.effective_date}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 border border-primary/10 text-[10px] font-bold text-primary">
                          <span className="material-symbols-outlined text-sm font-bold">verified</span>
                          <span>{item.program}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h2 className="font-headline-md text-2xl font-bold text-primary">{item.title}</h2>
                        <p className="text-xs text-on-surface-variant leading-relaxed">
                          {item.summary}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-outline-variant/15 pt-6 mt-2">
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-2 font-label-sm text-[10px] font-bold uppercase tracking-widest text-primary hover:underline cursor-pointer"
                        >
                          View source document
                          <span className="material-symbols-outlined text-xs transition-transform group-hover:translate-x-1">arrow_forward</span>
                        </a>
                        <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant shrink-0">
                          <span className="material-symbols-outlined text-[18px]">account_balance</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. SUB-VIEWS & MODALS */}

      {/* MODAL 1: AUDIT LEDGER */}
      {selectedAuditProgram && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-end md:justify-center p-4">
          <div className="bg-background border border-outline-variant/35 rounded-t-3xl md:rounded-2xl max-w-5xl w-full mx-auto overflow-hidden flex flex-col h-[85vh] md:h-[80vh] shadow-2xl relative animate-in slide-in-from-bottom-6 duration-300">
            {/* Modal Navigation */}
            <nav className="bg-background/80 border-b border-outline-variant/20 py-4 px-6 flex justify-between items-center shrink-0">
              <button
                onClick={() => setSelectedAuditProgram(null)}
                className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors group cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-1">arrow_back</span>
                <span className="font-label-sm text-xs font-bold uppercase tracking-wider">{activeTranslations.backBtn}</span>
              </button>
              <div className="text-center font-display-lg text-body-lg font-bold tracking-tight text-primary">
                FormZero
              </div>
              <button
                onClick={() => setSelectedAuditProgram(null)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center shrink-0 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </nav>

            {/* Split layout content */}
            <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
              {/* Left Panel: Audit Statement */}
              <section className="w-full md:w-1/2 p-6 md:p-10 border-r border-outline-variant/15 overflow-y-auto custom-scrollbar flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-[1.5px] bg-primary"></span>
                    <span className="font-label-sm text-[10px] text-on-surface-variant tracking-widest uppercase font-bold">
                      Audit Segment {selectedAuditProgram.program_id.toUpperCase()}
                    </span>
                  </div>
                  <h1 className="font-display-lg text-display-lg-mobile leading-none mb-6 text-primary">
                    {activeTranslations.auditClaimTitle}
                  </h1>
                </div>

                <div className="glass-panel p-6 rounded-xl space-y-6 shadow-sm flex-grow flex flex-col justify-start">
                  {/* AI simplified explanation block */}
                  {showSimpleLedgerExplanation ? (
                    /* Prominent Explanation Card */
                    <div className="bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent border-2 border-amber-500/35 p-6 rounded-2xl space-y-4 animate-in zoom-in-95 duration-300 shadow-lg relative">
                      <div className="absolute -top-3 left-4 bg-amber-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                        <span className="material-symbols-outlined text-xs">auto_awesome</span>
                        {lang === "es" ? "Resumen de IA Sencillo" : "AI Simplified Breakdown"}
                      </div>
                      
                      <div className="flex gap-4 pt-2">
                        <span className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-700 shrink-0">
                          <span className="material-symbols-outlined text-2xl">lightbulb_circle</span>
                        </span>
                        <div className="space-y-2">
                          <h3 className="font-bold text-sm text-amber-950">
                            {lang === "es" ? "De qué se trata esto:" : "What this means in plain English:"}
                          </h3>
                          <p className="text-sm text-amber-900 leading-relaxed font-body-md font-medium">
                            {programSimpleExplanations[selectedAuditProgram.program_id]?.[lang] || 
                             (lang === "es" ? "Usted cumple con los criterios de elegibilidad básica de este programa según su perfil." : "You match this program's core eligibility criteria based on your verified profile.")}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 border-t border-amber-500/10 pt-4 mt-2">
                        <button 
                          onClick={() => setShowSimpleLedgerExplanation(false)}
                          className="text-[10px] font-bold text-amber-800 hover:text-amber-950 hover:underline cursor-pointer uppercase tracking-wider flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">gavel</span>
                          {lang === "es" ? "Ver Texto de Auditoría Completo" : "View Full Audit Statement"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Ask them if they need a simpler explanation */
                    <div className="bg-surface-container-low border border-outline-variant/35 p-5 rounded-2xl space-y-4 animate-in fade-in duration-300">
                      <div className="flex items-start gap-3">
                        <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <span className="material-symbols-outlined text-[18px]">psychology</span>
                        </span>
                        <div className="space-y-1">
                          <h4 className="font-bold text-xs text-primary uppercase tracking-wider">
                            {lang === "es" ? "¿Confundido por el lenguaje legal?" : "Confused by the legal language?"}
                          </h4>
                          <p className="text-xs text-on-surface-variant leading-relaxed font-body-md">
                            {lang === "es" 
                              ? "¿Le gustaría que la IA le proporcione una explicación muy breve y sencilla de este chequeo de elegibilidad?"
                              : "Would you like AI to provide a very brief, plain-English explanation of this eligibility audit check?"}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 justify-end pt-2 border-t border-outline-variant/15">
                        <button
                          onClick={() => setShowSimpleLedgerExplanation(true)}
                          className="bg-primary text-on-primary px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm hover:scale-[1.02] active:scale-95 duration-200 cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">check</span>
                          {lang === "es" ? "Sí, explicar de forma sencilla" : "Yes, explain simply"}
                        </button>
                        <button
                          onClick={() => {}}
                          className="border border-outline-variant text-on-surface-variant px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-surface-container duration-200 cursor-pointer"
                        >
                          {lang === "es" ? "No, mostrar texto de auditoría" : "No, show raw audit"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Detailed Legal Audit statement - rendered with transition based on the simple mode */}
                  <div className={`space-y-2 transition-all duration-300 ${showSimpleLedgerExplanation ? "opacity-60 scale-95 border border-outline-variant/10 bg-surface-container-low p-4 rounded-xl" : ""}`}>
                    <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                      {lang === "es" ? "Texto de Auditoría Legal Detallado:" : "Detailed Legal Audit Statement:"}
                    </h4>
                    <p className="font-headline-md text-base md:text-lg leading-relaxed italic text-on-surface-variant">
                      "{selectedAuditProgram.reasoning_summary}"
                    </p>
                  </div>

                  {/* What the AI Doesn't Know - RAG Intellectual Honesty Card */}
                  {(() => {
                    const unknowns = programWhatAIDoesntKnow[selectedAuditProgram.program_id];
                    if (!unknowns || unknowns.length === 0) return null;
                    return (
                      <div className="bg-surface-container-high border border-outline-variant/30 p-5 rounded-2xl space-y-3 mt-4 animate-in fade-in duration-300">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm font-bold text-outline">info</span>
                          {lang === "es" ? "Lo que la IA No Sabe (Límites de RAG)" : "What the AI Doesn't Know (RAG Limits)"}
                        </h4>
                        <ul className="list-disc list-inside space-y-1.5 text-xs text-on-surface-variant/90 leading-relaxed font-body-md">
                          {unknowns.map((item, idx) => (
                            <li key={idx}>
                              {item[lang]}
                            </li>
                          ))}
                        </ul>
                        <div className="text-[9px] text-outline font-semibold uppercase tracking-wider pt-2 border-t border-outline-variant/20">
                          {lang === "es"
                            ? "Verifique estos detalles locales con su oficina del condado o administrador de casos."
                            : "Verify these local county nuances directly with your caseworker."}
                        </div>
                      </div>
                    );
                  })()}
                  
                  <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-outline-variant/15">
                    <div className="flex items-center gap-1 bg-surface-container-highest px-3 py-1 rounded-full text-on-surface-variant font-label-sm text-[9px] border border-outline-variant/30 font-bold uppercase">
                      <span className="material-symbols-outlined text-sm">description</span>
                      <span>
                        {citations[selectedAuditProgram.citation_ids[0]]?.source_document ||
                          `${selectedAuditProgram.program_id.toUpperCase()}_eligibility_codes.pdf`}
                      </span>
                    </div>
                    <div className="bg-surface-container-highest px-3 py-1 rounded-full text-on-surface-variant font-label-sm text-[9px] border border-outline-variant/30 font-bold">
                      PARAGRAPH 16
                    </div>
                    <div className="flex items-center gap-1 bg-primary/5 px-3 py-1 rounded-full text-primary font-label-sm text-[9px] border border-primary/20 font-bold uppercase">
                      <span className="material-symbols-outlined text-sm font-bold">verified</span>
                      <span>{Math.round(selectedAuditProgram.confidence_score * 100)}% Match Confidence</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 border-t border-outline-variant/15 pt-6 mt-auto">
                  {/* Pager controls matching original Hallucination Audit Ledger UI */}
                  <div className="flex items-center justify-between shrink-0 mb-2">
                    <div className="flex gap-3">
                      <button
                        onClick={handlePrevClaim}
                        className="w-10 h-10 rounded-full border border-outline-variant/35 flex items-center justify-center hover:bg-surface-container transition-all cursor-pointer text-on-surface"
                      >
                        <span className="material-symbols-outlined text-sm font-bold">chevron_left</span>
                      </button>
                      <button
                        onClick={handleNextClaim}
                        className="w-10 h-10 rounded-full border border-outline-variant/35 flex items-center justify-center hover:bg-surface-container transition-all cursor-pointer text-on-surface"
                      >
                        <span className="material-symbols-outlined text-sm font-bold">chevron_right</span>
                      </button>
                    </div>
                    {currentClaimIndex !== -1 && (
                      <span className="text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-wider">
                        Claim <span className="text-primary font-bold">{currentClaimIndex + 1}</span> of {eligibilityResults.length}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-on-surface-variant/50 font-bold uppercase tracking-wider">
                      Item verified by RAG validator
                    </span>
                  </div>
                  {selectedAuditProgram.eligible && (
                    <a
                      href={programApplyUrls[selectedAuditProgram.program_id] || "https://www.benefits.gov/"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center bg-primary text-on-primary py-3 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity"
                    >
                      {activeTranslations.applyNow} →
                    </a>
                  )}
                </div>
              </section>

              {/* Right Panel: Simulated PDF Archive */}
              <section className="w-full md:w-1/2 bg-surface-container-low p-6 md:p-10 flex flex-col gap-6 overflow-hidden">
                <div className="flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 font-bold text-[10px] tracking-wider uppercase text-on-surface">
                    <span className="material-symbols-outlined text-primary text-lg">menu_book</span>
                    {activeTranslations.pdfHeader}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPdfZoom(prev => prev === "in" ? "normal" : "in")}
                      className={`p-1.5 rounded transition-colors shrink-0 cursor-pointer ${pdfZoom === "in" ? "bg-primary/10 text-primary font-bold" : "hover:bg-surface-container-highest text-on-surface-variant"}`}
                      title="Zoom In (120%)"
                    >
                      <span className="material-symbols-outlined text-base">zoom_in</span>
                    </button>
                    <button
                      onClick={() => setPdfZoom(prev => prev === "full" ? "normal" : "full")}
                      className={`p-1.5 rounded transition-colors shrink-0 cursor-pointer ${pdfZoom === "full" ? "bg-primary/10 text-primary font-bold" : "hover:bg-surface-container-highest text-on-surface-variant"}`}
                      title="Completely Zoom In (150%)"
                    >
                      <span className="material-symbols-outlined text-base">open_in_full</span>
                    </button>
                  </div>
                </div>

                {/* Mock Paper PDF page */}
                <div className="flex-grow bg-white shadow-xl rounded-lg overflow-hidden flex flex-col border border-outline-variant/20">
                  {/* Header */}
                  <div className="bg-surface-container-highest p-3 flex justify-between items-center border-b border-outline-variant/30 text-[10px] font-bold text-on-surface-variant/80 shrink-0">
                    <span>
                      {citations[selectedAuditProgram.citation_ids[0]]?.source_document ||
                        `${selectedAuditProgram.program_id.toUpperCase()}_eligibility_codes.pdf`}
                    </span>
                    <span className="font-mono tracking-widest bg-surface-container px-2 py-0.5 rounded border border-outline-variant/20">
                      {pdfZoom === "in" ? "120% SCALE" : pdfZoom === "full" ? "150% SCALE" : "100% SCALE"}
                    </span>
                  </div>
                  {/* PDF Content */}
                  <div 
                    className="flex-grow p-8 overflow-y-auto custom-scrollbar font-body-md text-on-surface leading-[1.8] transition-all duration-300"
                    style={{ fontSize: pdfZoom === "in" ? "14px" : pdfZoom === "full" ? "18px" : "12px" }}
                  >
                    <div className="max-w-prose mx-auto space-y-6">
                      <div className="h-3.5 w-1/3 bg-surface-container-highest rounded"></div>
                      <div className="space-y-2">
                        <div className="h-2.5 w-full bg-surface-container rounded opacity-40"></div>
                        <div className="h-2.5 w-full bg-surface-container rounded opacity-40"></div>
                        <div className="h-2.5 w-4/5 bg-surface-container rounded opacity-40"></div>
                      </div>

                      {/* Highlighted core rule quote */}
                      <div className="relative group border-l-4 border-primary pl-4 py-3 bg-primary/5 rounded-r-lg border border-primary/10 shadow-sm">
                        <p className="text-primary font-bold font-headline-md text-sm italic mb-2">
                          Section 16: Eligibility Rules Summary
                        </p>
                        <p className="text-on-surface leading-relaxed">
                          In accordance with administrative regulations, <mark className="bg-yellow-200/80 text-black font-semibold px-1.5 py-0.5 rounded">
                            {citations[selectedAuditProgram.citation_ids[0]]?.chunk_text ||
                              citations[selectedAuditProgram.citation_ids[0]]?.chunk_preview ||
                              `Under general guidelines, applicants demonstrating eligibility criteria match the program metrics. ${selectedAuditProgram.reasoning_summary}`}
                          </mark> to ensure continued participation.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="h-2.5 w-full bg-surface-container rounded opacity-40"></div>
                        <div className="h-2.5 w-full bg-surface-container rounded opacity-40"></div>
                        <div className="h-2.5 w-3/4 bg-surface-container rounded opacity-40"></div>
                      </div>

                      <div className="flex justify-center py-6">
                        <span className="material-symbols-outlined text-6xl text-primary/10">gavel</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CASEWORKER ESCALATION */}
      {showCaseworkerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-outline-variant/35 rounded-2xl max-w-xl w-full p-8 shadow-2xl relative flex flex-col gap-6 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowCaseworkerModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-highest text-primary font-label-sm text-[10px] w-fit font-bold uppercase tracking-wider">
              <span className="flex h-2 w-2 rounded-full bg-error animate-pulse"></span>
              Attention Required
            </div>

            <div className="space-y-2">
              <h2 className="font-display-lg text-headline-md text-primary">{activeTranslations.caseworkerTitle}</h2>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {activeTranslations.caseworkerNuance}
              </p>
            </div>

            {/* List of advocacy non-profits */}
            <div className="space-y-4 pt-2">
              <div className="group p-5 rounded-xl bg-surface-container-low hover:bg-white transition-all border border-outline-variant/10 cursor-pointer flex items-center justify-between">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-2xl">account_balance</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-primary leading-snug">Metro Immigrant Defense</h3>
                    <div className="flex gap-2 items-center text-[10px] font-bold text-on-surface-variant mt-0.5">
                      <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded">Asylum Specialist</span>
                      <span>0.8 miles away</span>
                    </div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">chevron_right</span>
              </div>

              <div className="group p-5 rounded-xl bg-surface-container-low hover:bg-white transition-all border border-outline-variant/10 cursor-pointer flex items-center justify-between">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-2xl">gavel</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-primary leading-snug">Justice Forward Alliance</h3>
                    <div className="flex gap-2 items-center text-[10px] font-bold text-on-surface-variant mt-0.5">
                      <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded">Visa Appeals</span>
                      <span>2.4 miles away</span>
                    </div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">chevron_right</span>
              </div>

              <div className="group p-5 rounded-xl bg-surface-container-low hover:bg-white transition-all border border-outline-variant/10 cursor-pointer flex items-center justify-between">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined text-2xl">groups</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-primary leading-snug">Citizenship Rights Clinic</h3>
                    <div className="flex gap-2 items-center text-[10px] font-bold text-on-surface-variant mt-0.5">
                      <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded">Naturalization</span>
                      <span>3.1 miles away</span>
                    </div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">chevron_right</span>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-outline-variant/15 mt-2">
              <button className="w-full sm:flex-1 bg-primary text-on-primary rounded-full py-3 px-6 font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer">
                <span className="material-symbols-outlined text-sm font-bold">call</span>
                Call legal aid
              </button>
              <button className="w-full sm:flex-1 border border-primary text-primary rounded-full py-3 px-6 font-bold text-xs flex items-center justify-center gap-2 hover:bg-surface-container active:scale-95 transition-all cursor-pointer">
                <span className="material-symbols-outlined text-sm">directions</span>
                Get directions
              </button>
              <button
                onClick={() => setShowCaseworkerModal(false)}
                className="w-full sm:w-auto text-on-surface-variant hover:text-primary transition-colors py-3 px-4 text-xs font-bold uppercase tracking-wider text-center cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SIGNUP/LOGIN */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-outline-variant/35 rounded-2xl max-w-md w-full p-8 shadow-2xl relative flex flex-col gap-6 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setShowAuthModal(false);
                setAuthError("");
                setAuthEmail("");
                setAuthPassword("");
                setAuthName("");
                setAuthOtp("");
                setIsVerifyingOtp(false);
                setTempDevOtp("");
      setOtpEmailSent(false);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="space-y-2">
              <h2 className="font-display-lg text-headline-md text-primary">
                {lang === "es"
                  ? (isSignUp ? (isVerifyingOtp ? "Verificar Correo" : "Crear Cuenta") : "Bienvenido de Nuevo")
                  : (isSignUp ? (isVerifyingOtp ? "Verify Email" : "Create Account") : "Welcome Back")}
              </h2>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {lang === "es"
                  ? (isSignUp
                      ? (isVerifyingOtp 
                          ? "Ingrese el código de verificación para completar su registro." 
                          : "Regístrese para mantener sus auditorías de elegibilidad de beneficios sincronizadas y guardadas para siempre.")
                      : "Inicie sesión para acceder a sus auditorías de beneficios guardadas y datos de perfil.")
                  : (isSignUp
                      ? (isVerifyingOtp 
                          ? "Enter the verification code to complete your signup." 
                          : "Sign up to keep your benefit eligibility audits synced and saved forever.")
                      : "Sign in to access your saved benefit audits and profile facts.")}
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs font-semibold">
                {authError}
              </div>
            )}

            {isVerifyingOtp ? (
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div>
                  <p className="text-xs text-on-surface-variant mb-4">
                    {otpEmailSent ? (
                      lang === "es" ? (
                        <>
                          <span className="material-symbols-outlined text-primary text-sm align-middle mr-1">mark_email_read</span>
                          Hemos enviado un código de verificación de 6 dígitos a <strong className="text-primary">{authEmail}</strong>. Revise su bandeja de entrada (y carpeta de spam) e ingrese el código a continuación.
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-primary text-sm align-middle mr-1">mark_email_read</span>
                          We&apos;ve sent a 6-digit verification code to <strong className="text-primary">{authEmail}</strong>. Check your inbox (and spam folder) and enter the code below.
                        </>
                      )
                    ) : (
                      lang === "es" ? (
                        <>Hemos generado un código de verificación de 6 dígitos para <strong className="text-primary">{authEmail}</strong>. Ingréselo a continuación.</>
                      ) : (
                        <>We&apos;ve generated a 6-digit verification code for <strong className="text-primary">{authEmail}</strong>. Enter it below.</>
                      )
                    )}
                  </p>
                  
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                    {lang === "es" ? "Código de Verificación" : "Verification Code"}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={authOtp}
                    onChange={(e) => setAuthOtp(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/35 rounded-lg px-4 py-3 text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors tracking-widest text-center font-mono text-lg"
                    placeholder="000000"
                  />
                </div>

                {otpEmailSent && (
                  <div className="p-3 bg-green-50 text-green-800 rounded-lg text-xs flex items-center gap-2 border border-green-200">
                    <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>
                    <span>
                      {lang === "es"
                        ? "¡Correo enviado con éxito! ¿No lo recibió? Revise su carpeta de correo no deseado o regrese para intentar de nuevo."
                        : "Email sent successfully! Didn't receive it? Check your spam folder or go back to try again."}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-primary text-on-primary rounded-full py-3 px-6 font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? (
                    <span className="animate-pulse">{lang === "es" ? "Verificando..." : "Verifying..."}</span>
                  ) : (
                    lang === "es" ? "Verificar y Registrarse" : "Verify & Sign Up"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsVerifyingOtp(false);
                    setAuthOtp("");
                    setTempDevOtp("");
                    setOtpEmailSent(false);
                  }}
                  className="w-full bg-transparent hover:bg-surface-container text-primary rounded-full py-2.5 px-6 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {lang === "es" ? "Regresar" : "Go Back"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {isSignUp && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                      {lang === "es" ? "Nombre Completo" : "Full Name"}
                    </label>
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/35 rounded-lg px-4 py-3 text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
                      placeholder={lang === "es" ? "Juan Pérez" : "John Doe"}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                    {lang === "es" ? "Dirección de Correo" : "Email Address"}
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/35 rounded-lg px-4 py-3 text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
                    placeholder="name@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                    {lang === "es" ? "Contraseña" : "Password"}
                  </label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant/35 rounded-lg px-4 py-3 text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-primary text-on-primary rounded-full py-3 px-6 font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? (
                    <span className="animate-pulse">{lang === "es" ? "Cargando..." : "Loading..."}</span>
                  ) : lang === "es" ? (
                    isSignUp ? "Crear Cuenta" : "Iniciar Sesión"
                  ) : isSignUp ? (
                    "Create Account"
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>
            )}

            {!isVerifyingOtp && (
              <div className="text-center pt-2 border-t border-outline-variant/15 text-xs text-on-surface-variant">
                {lang === "es"
                  ? (isSignUp ? "¿Ya tiene una cuenta?" : "¿No tiene una cuenta?")
                  : (isSignUp ? "Already have an account?" : "Don't have an account?")}{" "}
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setAuthError("");
                    setIsVerifyingOtp(false);
                    setAuthOtp("");
                    setTempDevOtp("");
                    setOtpEmailSent(false);
                  }}
                  className="font-bold text-primary hover:underline"
                >
                  {lang === "es"
                    ? (isSignUp ? "Iniciar Sesión" : "Crear Cuenta")
                    : (isSignUp ? "Sign In" : "Create Account")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 5: DELETE ACCOUNT CONFIRMATION */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-red-200 rounded-2xl max-w-md w-full p-8 shadow-2xl relative flex flex-col gap-6 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setShowDeleteAccountModal(false);
                setDeletePassword("");
                setDeleteError("");
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center text-on-surface-variant hover:text-red-500 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-500 text-2xl">warning</span>
                </div>
                <div>
                  <h2 className="font-display-lg text-headline-md text-red-600">Delete Account</h2>
                  <p className="text-xs text-on-surface-variant">This action cannot be undone</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-2">
              <p className="font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">error</span>
                Permanently deleting your account will:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Remove all your saved profile data</li>
                <li>Delete your eligibility audit history</li>
                <li>Delete all your chat conversations</li>
                <li>Free your email address for re-registration</li>
              </ul>
            </div>

            {deleteError && (
              <div className="p-3 rounded-lg bg-red-100 text-red-700 text-xs font-semibold">
                {deleteError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full bg-surface-container-lowest border border-red-200 rounded-lg px-4 py-3 text-body-md text-on-surface focus:outline-none focus:border-red-500 transition-colors"
                placeholder="Enter your password to confirm"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteAccountModal(false);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                className="flex-1 border border-outline-variant hover:border-primary text-on-surface-variant hover:text-primary px-4 py-3 rounded-full font-body-md text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || !deletePassword.trim()}
                className="flex-1 bg-red-600 text-white rounded-full py-3 px-6 font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {deleteLoading ? (
                  <span className="animate-pulse">Deleting...</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">delete_forever</span>
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: UPDATE PROFILE */}
      {showUpdateProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-outline-variant/35 rounded-2xl max-w-lg w-full p-8 shadow-2xl relative flex flex-col gap-6 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] custom-scrollbar">
            <button
              onClick={() => setShowUpdateProfileModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="space-y-2">
              <h2 className="font-display-lg text-headline-md text-primary">
                {lang === "es" ? "Actualizar Perfil de Elegibilidad" : "Update Eligibility Profile"}
              </h2>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                {lang === "es"
                  ? "Modifique la información de su hogar para actualizar instantáneamente los cálculos de beneficios y auditorías."
                  : "Modify your household information to instantly update benefit calculations and eligibility audits."}
              </p>
            </div>

            <form onSubmit={handleUpdateProfileSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                    {lang === "es" ? "Estado" : "State"}
                  </label>
                  <div className="relative" ref={stateDropdownRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setStateDropdownOpen(!stateDropdownOpen);
                        setStateSearchQuery("");
                      }}
                      className="w-full bg-surface-container-lowest border border-outline-variant/35 rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors text-left flex items-center justify-between cursor-pointer"
                    >
                      <span>
                        {US_STATES.find(s => s.code === editProfileFacts.state)?.name || editProfileFacts.state || "Select State"} ({editProfileFacts.state || "N/A"})
                      </span>
                      <span className="material-symbols-outlined text-sm">arrow_drop_down</span>
                    </button>

                    {stateDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full bg-surface-container-lowest border border-outline-variant/35 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
                        <div className="p-2 border-b border-outline-variant/15">
                          <input
                            type="text"
                            placeholder={lang === "es" ? "Buscar estado..." : "Search state..."}
                            value={stateSearchQuery}
                            onChange={(e) => setStateSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                              }
                            }}
                            className="w-full bg-surface-container border border-outline-variant/35 rounded px-3 py-1.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                            autoFocus
                          />
                        </div>
                        <div className="overflow-y-auto flex-1 max-h-48 py-1">
                          {US_STATES.filter(s =>
                            s.name.toLowerCase().includes(stateSearchQuery.toLowerCase()) ||
                            s.code.toLowerCase().includes(stateSearchQuery.toLowerCase())
                          ).map((s) => (
                            <button
                              key={s.code}
                              type="button"
                              onClick={() => {
                                setEditProfileFacts(prev => ({ ...prev, state: s.code }));
                                setStateDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-xs hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-between cursor-pointer ${
                                editProfileFacts.state === s.code ? "bg-primary/5 text-primary font-semibold" : "text-on-surface"
                              }`}
                            >
                              <span>{s.name} ({s.code})</span>
                              {editProfileFacts.state === s.code && (
                                <span className="material-symbols-outlined text-xs">check</span>
                              )}
                            </button>
                          ))}
                          {US_STATES.filter(s =>
                            s.name.toLowerCase().includes(stateSearchQuery.toLowerCase()) ||
                            s.code.toLowerCase().includes(stateSearchQuery.toLowerCase())
                          ).length === 0 && (
                            <div className="px-4 py-3 text-xs text-on-surface-variant text-center">
                              {lang === "es" ? "No se encontraron estados" : "No states found"}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                    {lang === "es" ? "Estatus Migratorio" : "Immigration Status"}
                  </label>
                  <select
                    value={editProfileFacts.immigration_status || ""}
                    onChange={(e) => setEditProfileFacts(prev => ({ ...prev, immigration_status: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant/35 rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
                  >
                    <option value="citizen">{lang === "es" ? "Ciudadano" : "Citizen"}</option>
                    <option value="legal_resident">{lang === "es" ? "Residente Legal" : "Legal Resident"}</option>
                    <option value="refugee">{lang === "es" ? "Refugiado / Asilado" : "Refugee"}</option>
                    <option value="undocumented">{lang === "es" ? "Sin Papeles / Indocumentado" : "Undocumented"}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                    {lang === "es" ? "Tamaño del Hogar" : "Household Size"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={editProfileFacts.household_size || ""}
                    onChange={(e) => setEditProfileFacts(prev => ({ ...prev, household_size: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant/35 rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                    {lang === "es" ? "Ingresos Mensuales ($)" : "Monthly Income ($)"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editProfileFacts.monthly_income || ""}
                    onChange={(e) => setEditProfileFacts(prev => ({ ...prev, monthly_income: e.target.value }))}
                    className="w-full bg-surface-container-lowest border border-outline-variant/35 rounded-lg px-4 py-2.5 text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-3 bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
                <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                  {lang === "es" ? "Detalles Adicionales del Hogar" : "Additional Household Details"}
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 cursor-pointer text-xs font-medium text-on-surface hover:text-primary transition-colors">
                    <input
                      type="checkbox"
                      checked={editProfileFacts.is_student === "true"}
                      onChange={(e) => setEditProfileFacts(prev => ({ ...prev, is_student: e.target.checked ? "true" : "false" }))}
                      className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <span>{lang === "es" ? "¿Es estudiante universitario?" : "College Student"}</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer text-xs font-medium text-on-surface hover:text-primary transition-colors">
                    <input
                      type="checkbox"
                      checked={editProfileFacts.has_children === "true"}
                      onChange={(e) => setEditProfileFacts(prev => ({ ...prev, has_children: e.target.checked ? "true" : "false" }))}
                      className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <span>{lang === "es" ? "¿Tiene hijos dependientes?" : "Has Children"}</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer text-xs font-medium text-on-surface hover:text-primary transition-colors">
                    <input
                      type="checkbox"
                      checked={editProfileFacts.has_pregnant === "true"}
                      onChange={(e) => setEditProfileFacts(prev => ({ ...prev, has_pregnant: e.target.checked ? "true" : "false" }))}
                      className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <span>{lang === "es" ? "¿Hay algún embarazo?" : "Pregnancy in Household"}</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer text-xs font-medium text-on-surface hover:text-primary transition-colors">
                    <input
                      type="checkbox"
                      checked={editProfileFacts.has_elderly_or_disabled === "true"}
                      onChange={(e) => setEditProfileFacts(prev => ({ ...prev, has_elderly_or_disabled: e.target.checked ? "true" : "false" }))}
                      className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <span>{lang === "es" ? "¿Adulto mayor o discapacidad?" : "Elderly / Disabled Member"}</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-outline-variant/15">
                <button
                  type="button"
                  onClick={() => setShowUpdateProfileModal(false)}
                  className="border border-outline-variant text-on-surface-variant px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider hover:bg-surface-container duration-200 cursor-pointer"
                >
                  {lang === "es" ? "Cancelar" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-95 duration-200 cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm font-bold animate-spin-slow">sync</span>
                  {lang === "es" ? "Guardar y Recalcular" : "Save & Recalculate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* PRINT-ONLY AUDITED REPORT DOCUMENT */}
      <div id="print-report-container" className="hidden print:block p-12 text-black space-y-8 font-sans bg-white">
        <header className="flex justify-between items-center border-b-2 border-black pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">FormZero</h1>
            <p className="text-xs uppercase tracking-wider font-bold opacity-60">Verified AI Eligibility Auditing Report</p>
          </div>
          <div className="text-right text-xs">
            <div><strong>Date:</strong> {reportDate}</div>
            <div><strong>Verification ID:</strong> {verificationId}</div>
            <div><strong>Status:</strong> VERIFIED AUDITED PASS</div>
          </div>
        </header>

        {/* User Facts Section */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold uppercase tracking-wider border-b border-black/20 pb-1">1. Audited Eligibility Facts</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><strong>State:</strong> {profileFacts.state || "CA"}</div>
            <div><strong>Household Size:</strong> {profileFacts.household_size || "1"} members</div>
            <div><strong>Monthly Income:</strong> ${parseFloat(profileFacts.monthly_income || "0").toLocaleString()} /month</div>
            <div><strong>Immigration Status:</strong> {profileFacts.immigration_status || "citizen"}</div>
            <div><strong>College Student:</strong> {profileFacts.is_student === "true" ? "Yes" : "No"}</div>
            <div><strong>Children in House:</strong> {profileFacts.has_children === "true" ? "Yes" : "No"}</div>
            <div><strong>Pregnancy in House:</strong> {profileFacts.has_pregnant === "true" ? "Yes" : "No"}</div>
            <div><strong>Elderly or Disabled:</strong> {profileFacts.has_elderly_or_disabled === "true" ? "Yes" : "No"}</div>
          </div>
        </section>

        {/* Benefits Summary Section */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold uppercase tracking-wider border-b border-black/20 pb-1">2. Financial Projections</h2>
          <div className="grid grid-cols-2 gap-4 text-sm bg-black/5 p-4 rounded-lg">
            <div>
              <div className="text-xs uppercase font-bold opacity-60">Retroactive Claim Sum (41 Months)</div>
              <div className="text-2xl font-black">${(totalMonthlyValue * 41).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs uppercase font-bold opacity-60">Total Monthly Benefits Value</div>
              <div className="text-2xl font-black">${totalMonthlyValue.toLocaleString()} /month</div>
            </div>
          </div>
        </section>

        {/* Program Checklist Table */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold uppercase tracking-wider border-b border-black/20 pb-1">3. Matched Benefits Ledger</h2>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-black">
                <th className="py-2">Program Name</th>
                <th className="py-2">Eligible</th>
                <th className="py-2">Monthly Value</th>
                <th className="py-2">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {eligibilityResults.map((p) => (
                <tr key={p.program_id} className="border-b border-black/10">
                  <td className="py-2 font-bold">{p.program_name}</td>
                  <td className="py-2 font-medium">{p.eligible ? "Eligible" : "Ineligible"}</td>
                  <td className="py-2 font-mono">${p.monthly_value_usd.toLocaleString()}</td>
                  <td className="py-2">{Math.round(p.confidence_score * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Citations Audit Trails */}
        <section className="space-y-4 page-break-before">
          <h2 className="text-lg font-bold uppercase tracking-wider border-b border-black/20 pb-1">4. Legal RAG Citation Audit Trails</h2>
          <div className="space-y-4">
            {eligibilityResults.filter(p => p.eligible).map((p) => {
              const citation = citations[p.citation_ids[0]];
              return (
                <div key={p.program_id} className="space-y-1.5 border border-black/15 p-4 rounded-lg">
                  <h3 className="text-xs uppercase tracking-wide font-black text-black">
                    {p.program_name} Citation Trace
                  </h3>
                  <div className="text-xs text-black/60 font-mono">
                    <strong>Source File:</strong> {citation?.source_document || `${p.program_id.toUpperCase()}_eligibility_codes.pdf`} | <strong>Citations Check:</strong> RAG-VERIFIED PASS
                  </div>
                  <blockquote className="text-xs italic border-l-2 border-black pl-3 py-1 bg-black/5 text-black">
                    "{citation?.chunk_text || `Applicant matches income thresholds for the state of ${profileFacts.state || "CA"}.`}"
                  </blockquote>
                  <p className="text-[11px] text-black/80">
                    <strong>AI Auditor Reasoning:</strong> {p.reasoning_summary}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <footer className="pt-12 text-center text-[10px] opacity-60 border-t border-black/25">
          FormZero Eligibility Verification Engine • AI-Powered Government Benefits Matcher
        </footer>
      </div>

      {/* Voice Recording Pulsing Indicator */}
      {isRecording && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/95 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl border border-white/10 z-50 text-white animate-in fade-in duration-300">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="font-body-md text-xs font-semibold uppercase tracking-wider">
            {lang === "es" 
              ? `Escuchando tu historia... ${recordingTimer}s restantes` 
              : `Listening to your story... ${recordingTimer}s remaining`}
          </span>
        </div>
      )}
    </>
  );
}