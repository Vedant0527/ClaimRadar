export type PolicyUpdate = {
  program: string;
  program_es: string;
  title: string;
  title_es: string;
  summary: string;
  summary_es: string;
  effective_date: string;
  category: "increase" | "decrease" | "new_rule" | "deadline" | "expansion";
  source_url: string;
};

// ── 2025-26 Policy Changes ──
// NOTE FOR PRODUCT: Please verify all numbers and dates below.
// Add any additional changes you researched directly to this array.
export const policyUpdates: PolicyUpdate[] = [
  {
    program: "Lifeline (Phone & Internet)",
    program_es: "Lifeline (Teléfono e Internet)",
    title: "Affordable Connectivity Program Ended — Lifeline Continues",
    title_es: "El Programa ACP Terminó — Lifeline Continúa",
    summary:
      "The Affordable Connectivity Program (ACP) ended in June 2024. The Lifeline program still provides a $9.25/month discount on phone or internet for qualifying households. If you were on ACP, apply for Lifeline now to keep your discount.",
    summary_es:
      "El Programa de Conectividad Asequible terminó en junio de 2024. El programa Lifeline todavía ofrece un descuento de $9.25 al mes en teléfono o internet. Si tenía ACP, solicite Lifeline ahora para mantener su descuento.",
    effective_date: "June 2024",
    category: "new_rule",
    source_url:
      "https://www.fcc.gov/consumers/guides/lifeline-support-affordable-communications",
  },
  {
    program: "Pell Grant (Education Aid)",
    program_es: "Beca Pell (Ayuda para Educación)",
    title: "Simplified FAFSA — Fewer Questions, Faster Application",
    title_es: "FAFSA Simplificado — Menos Preguntas, Más Rápido",
    summary:
      "The FAFSA form was simplified for the 2024-25 aid year, cutting questions from 108 down to about 46. It is now faster and easier to apply for the Pell Grant. Students no longer need to report assets in as much detail.",
    summary_es:
      "El formulario FAFSA fue simplificado para el año escolar 2024-25, reduciendo las preguntas de 108 a unas 46. Ahora es más rápido y fácil solicitar la Beca Pell. Los estudiantes ya no necesitan reportar tantos detalles sobre sus bienes.",
    effective_date: "2024-25 Aid Year",
    category: "new_rule",
    source_url: "https://studentaid.gov/articles/fafsa-simplification/",
  },
  {
    program: "SNAP (Food Assistance)",
    program_es: "SNAP (Asistencia Alimentaria)",
    title: "FY2025 Benefit Amounts Adjusted for Cost of Living",
    title_es: "Beneficios FY2025 Ajustados por Costo de Vida",
    summary:
      "SNAP maximum monthly benefits are adjusted every October. For FY2025, a family of 4 can receive up to $975/month. Emergency pandemic-era increases ended in 2023, so current amounts are lower than during COVID. Check your state SNAP office for your exact amount.",
    summary_es:
      "Los beneficios máximos de SNAP se ajustan cada octubre. Para el año fiscal 2025, una familia de 4 puede recibir hasta $975 al mes. Los aumentos de emergencia de la pandemia terminaron en 2023. Consulte su oficina de SNAP para conocer su monto exacto.",
    effective_date: "October 2024",
    category: "increase",
    source_url:
      "https://www.fns.usda.gov/snap/cost-living-adjustment-cola-information",
  },
  {
    program: "Medicaid / CHIP (Healthcare)",
    program_es: "Medicaid / CHIP (Atención Médica)",
    title: "12-Month Continuous Coverage for Children Expanded",
    title_es: "Cobertura Continua de 12 Meses para Niños Ampliada",
    summary:
      "Many states now offer 12 months of continuous Medicaid enrollment for children. This means your child stays covered even if your income changes during the year. Check if your state has adopted this rule — it protects kids from losing healthcare mid-year.",
    summary_es:
      "Muchos estados ahora ofrecen 12 meses de inscripción continua en Medicaid para niños. Su hijo sigue cubierto aunque sus ingresos cambien durante el año. Consulte si su estado adoptó esta regla.",
    effective_date: "2024-2025",
    category: "expansion",
    source_url: "https://www.medicaid.gov/medicaid/eligibility/index.html",
  },
  {
    program: "EITC (Earned Income Tax Credit)",
    program_es: "EITC (Crédito Tributario por Ingreso del Trabajo)",
    title: "2024 EITC Maximum Raised to $7,830 for Families",
    title_es: "Máximo EITC 2024 Aumentó a $7,830 para Familias",
    summary:
      "For tax year 2024 (filed in 2025), the maximum Earned Income Tax Credit is $7,830 for families with 3 or more children — up from $7,430 in 2023. This is free money that many working families miss. File your taxes to claim it, even if you do not owe.",
    summary_es:
      "Para el año fiscal 2024 (presentado en 2025), el crédito máximo EITC es $7,830 para familias con 3 o más hijos. Es dinero gratuito que muchas familias no reclaman. Presente sus impuestos para obtenerlo, incluso si no debe nada.",
    effective_date: "Tax Year 2024",
    category: "increase",
    source_url:
      "https://www.irs.gov/credits-deductions/individuals/earned-income-tax-credit",
  },
  {
    program: "SSI / SSDI (Supplemental Security & Disability)",
    program_es: "SSI / SSDI (Seguridad de Ingreso Suplementario y Discapacidad)",
    title: "2024 Cost-of-Living Adjustment (COLA) Increases SSI Benefit to $943",
    title_es: "Ajuste por Costo de Vida (COLA) 2024 Eleva Beneficio de SSI a $943",
    summary:
      "The Social Security Administration announced a 3.2% COLA increase for 2024. The maximum monthly Supplemental Security Income (SSI) payment is now $943 for an individual and $1,415 for a couple. SSDI average payments also rose to around $1,500/month.",
    summary_es:
      "La Administración del Seguro Social anunció un aumento de COLA del 3.2% para 2024. El pago mensual máximo de SSI ahora es de $943 para personas y $1,415 para parejas. Los pagos promedio de SSDI también subieron a unos $1,500 al mes.",
    effective_date: "January 2024",
    category: "increase",
    source_url: "https://www.ssa.gov/news/press/factsheets/colafacts2024.pdf",
  },
];

// Returns updates for a specific list of program names
export function getUpdatesForPrograms(programNames: string[]): PolicyUpdate[] {
  if (!programNames || programNames.length === 0) return policyUpdates;
  return policyUpdates.filter((u) => programNames.includes(u.program));
}

// Returns all updates
export function getAllUpdates(): PolicyUpdate[] {
  return policyUpdates;
}