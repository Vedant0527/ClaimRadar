export type DocumentItem = {
  name: string;
  name_es: string;
  status: "likely_have" | "need_to_gather" | "may_not_have";
  time_estimate: string;
  time_estimate_es: string;
  description: string;
  description_es: string;
  obtain_url?: string;
};
 
export type ProgramDocuments = {
  program: string;
  program_es: string;
  documents: DocumentItem[];
  apply_order: number;
  unlocks?: string[];
};
 
export function getDocumentChecklist(
  programName: string,
): ProgramDocuments | null {
  const checklists: Record<string, ProgramDocuments> = {
    "SNAP (Food Assistance)": {
      program: "SNAP (Food Assistance)",
      program_es: "SNAP (Asistencia Alimentaria)",
      apply_order: 1,
      unlocks: ["Lifeline (Phone & Internet)"],
      documents: [
        {
          name: "Government-issued photo ID",
          name_es: "Identificación con foto del gobierno",
          status: "likely_have",
          time_estimate: "5 min to find",
          time_estimate_es: "5 min para encontrar",
          description: "Driver's license, passport, or state ID",
          description_es: "Licencia de conducir, pasaporte o identificación estatal",
        },
        {
          name: "Proof of address",
          name_es: "Comprobante de domicilio",
          status: "likely_have",
          time_estimate: "10 min to find",
          time_estimate_es: "10 min para encontrar",
          description: "Utility bill, lease, or bank statement with your address",
          description_es: "Factura de servicios, contrato de renta o estado de cuenta con su dirección",
        },
        {
          name: "Proof of income",
          name_es: "Comprobante de ingresos",
          status: "need_to_gather",
          time_estimate: "15 min to gather",
          time_estimate_es: "15 min para reunir",
          description: "Last 30 days of pay stubs or employer letter",
          description_es: "Últimos 30 días de talones de pago o carta del empleador",
          obtain_url: "https://www.irs.gov/individuals/get-transcript",
        },
        {
          name: "Social Security numbers for all household members",
          name_es: "Números de Seguro Social de todos en el hogar",
          status: "need_to_gather",
          time_estimate: "10 min to find",
          time_estimate_es: "10 min para encontrar",
          description: "SSN cards or documents showing SSN for everyone applying",
          description_es: "Tarjetas de Seguro Social o documentos que muestren el NSS de todos",
          obtain_url: "https://www.ssa.gov/number-card",
        },
        {
          name: "Bank account statements",
          name_es: "Estados de cuenta bancaria",
          status: "need_to_gather",
          time_estimate: "10 min to gather",
          time_estimate_es: "10 min para reunir",
          description: "Last 30 days of bank statements",
          description_es: "Últimos 30 días de estados de cuenta bancaria",
          obtain_url: "https://www.consumerfinance.gov/consumer-tools/bank-accounts/",
        },
      ],
    },
    "Medicaid / CHIP (Healthcare)": {
      program: "Medicaid / CHIP (Healthcare)",
      program_es: "Medicaid / CHIP (Atención Médica)",
      apply_order: 2,
      documents: [
        {
          name: "Government-issued photo ID",
          name_es: "Identificación con foto del gobierno",
          status: "likely_have",
          time_estimate: "5 min to find",
          time_estimate_es: "5 min para encontrar",
          description: "Driver's license, passport, or state ID",
          description_es: "Licencia de conducir, pasaporte o identificación estatal",
        },
        {
          name: "Proof of income",
          name_es: "Comprobante de ingresos",
          status: "need_to_gather",
          time_estimate: "15 min to gather",
          time_estimate_es: "15 min para reunir",
          description: "Pay stubs, tax return, or employer letter",
          description_es: "Talones de pago, declaración de impuestos o carta del empleador",
          obtain_url: "https://www.irs.gov/individuals/get-transcript",
        },
        {
          name: "Proof of citizenship or immigration status",
          name_es: "Comprobante de ciudadanía o estatus migratorio",
          status: "may_not_have",
          time_estimate: "30 min to gather",
          time_estimate_es: "30 min para reunir",
          description: "Birth certificate, passport, or immigration documents",
          description_es: "Acta de nacimiento, pasaporte o documentos migratorios",
          obtain_url: "https://www.cdc.gov/nchs/w2w/index.htm",
        },
        {
          name: "Social Security number",
          name_es: "Número de Seguro Social",
          status: "need_to_gather",
          time_estimate: "5 min to find",
          time_estimate_es: "5 min para encontrar",
          description: "Your SSN and SSNs of anyone applying with you",
          description_es: "Su NSS y el de todas las personas que solicitan con usted",
          obtain_url: "https://www.ssa.gov/number-card",
        },
      ],
    },
    "LIHEAP (Utility Bill Help)": {
      program: "LIHEAP (Utility Bill Help)",
      program_es: "LIHEAP (Ayuda con Facturas de Servicios)",
      apply_order: 4,
      documents: [
        {
          name: "Recent utility bill",
          name_es: "Factura de servicios reciente",
          status: "likely_have",
          time_estimate: "5 min to find",
          time_estimate_es: "5 min para encontrar",
          description: "Your most recent heating or electric bill",
          description_es: "Su factura más reciente de gas o electricidad",
        },
        {
          name: "Proof of income",
          name_es: "Comprobante de ingresos",
          status: "need_to_gather",
          time_estimate: "15 min to gather",
          time_estimate_es: "15 min para reunir",
          description: "Pay stubs or benefit award letters for all household members",
          description_es: "Talones de pago o cartas de beneficios de todos en el hogar",
          obtain_url: "https://www.irs.gov/individuals/get-transcript",
        },
        {
          name: "Government-issued photo ID",
          name_es: "Identificación con foto del gobierno",
          status: "likely_have",
          time_estimate: "5 min to find",
          time_estimate_es: "5 min para encontrar",
          description: "Driver's license or state ID",
          description_es: "Licencia de conducir o identificación estatal",
        },
        {
          name: "Social Security numbers",
          name_es: "Números de Seguro Social",
          status: "need_to_gather",
          time_estimate: "10 min to find",
          time_estimate_es: "10 min para encontrar",
          description: "SSN for all household members",
          description_es: "NSS de todos los miembros del hogar",
          obtain_url: "https://www.ssa.gov/number-card",
        },
      ],
    },
    "WIC (Nutrition for Women & Children)": {
      program: "WIC (Nutrition for Women & Children)",
      program_es: "WIC (Nutrición para Mujeres y Niños)",
      apply_order: 3,
      documents: [
        {
          name: "Proof of identity",
          name_es: "Comprobante de identidad",
          status: "likely_have",
          time_estimate: "5 min to find",
          time_estimate_es: "5 min para encontrar",
          description: "ID for yourself and birth certificates for children",
          description_es: "Identificación propia y actas de nacimiento de los niños",
        },
        {
          name: "Proof of income",
          name_es: "Comprobante de ingresos",
          status: "need_to_gather",
          time_estimate: "15 min to gather",
          time_estimate_es: "15 min para reunir",
          description: "Pay stubs, tax return, or letter from employer",
          description_es: "Talones de pago, declaración de impuestos o carta del empleador",
          obtain_url: "https://www.irs.gov/individuals/get-transcript",
        },
        {
          name: "Proof of address",
          name_es: "Comprobante de domicilio",
          status: "likely_have",
          time_estimate: "10 min to find",
          time_estimate_es: "10 min para encontrar",
          description: "Utility bill, lease, or mail with your name and address",
          description_es: "Factura de servicios, contrato de renta o correo con su nombre y dirección",
        },
        {
          name: "Proof of pregnancy or child's age",
          name_es: "Comprobante de embarazo o edad del niño",
          status: "may_not_have",
          time_estimate: "20 min to gather",
          time_estimate_es: "20 min para reunir",
          description: "Doctor's confirmation of pregnancy or child's birth certificate",
          description_es: "Confirmación médica de embarazo o acta de nacimiento del niño",
          obtain_url: "https://www.cdc.gov/nchs/w2w/index.htm",
        },
      ],
    },
    "Pell Grant (Education Aid)": {
      program: "Pell Grant (Education Aid)",
      program_es: "Beca Pell (Ayuda para Educación)",
      apply_order: 5,
      documents: [
        {
          name: "Social Security number",
          name_es: "Número de Seguro Social",
          status: "likely_have",
          time_estimate: "5 min to find",
          time_estimate_es: "5 min para encontrar",
          description: "Your SSN — required for FAFSA",
          description_es: "Su NSS — requerido para el FAFSA",
        },
        {
          name: "Federal tax return (or parent's)",
          name_es: "Declaración de impuestos federal (o de los padres)",
          status: "need_to_gather",
          time_estimate: "20 min to gather",
          time_estimate_es: "20 min para reunir",
          description: "Most recent year's tax return for you and/or your parents",
          description_es: "Declaración de impuestos más reciente suya y/o de sus padres",
          obtain_url: "https://www.irs.gov/individuals/get-transcript",
        },
        {
          name: "FSA ID (login for FAFSA)",
          name_es: "FSA ID (inicio de sesión para FAFSA)",
          status: "may_not_have",
          time_estimate: "15 min to create",
          time_estimate_es: "15 min para crear",
          description: "Create at studentaid.gov — needed to submit FAFSA",
          description_es: "Créelo en studentaid.gov — necesario para enviar el FAFSA",
          obtain_url: "https://studentaid.gov/fsa-id/create-account/launch",
        },
        {
          name: "Bank statements and investment records",
          name_es: "Estados de cuenta e inversiones",
          status: "need_to_gather",
          time_estimate: "15 min to gather",
          time_estimate_es: "15 min para reunir",
          description: "Records of savings, investments, and assets",
          description_es: "Registros de ahorros, inversiones y bienes",
          obtain_url: "https://www.consumerfinance.gov/consumer-tools/bank-accounts/",
        },
      ],
    },
    "TANF (Cash Assistance)": {
      program: "TANF (Cash Assistance)",
      program_es: "TANF (Asistencia en Efectivo)",
      apply_order: 6,
      documents: [
        {
          name: "Government-issued photo ID",
          name_es: "Identificación con foto del gobierno",
          status: "likely_have",
          time_estimate: "5 min to find",
          time_estimate_es: "5 min para encontrar",
          description: "Driver's license, passport, or state ID",
          description_es: "Licencia de conducir, pasaporte o identificación estatal",
        },
        {
          name: "Children's birth certificates",
          name_es: "Actas de nacimiento de los hijos",
          status: "may_not_have",
          time_estimate: "30 min to find",
          time_estimate_es: "30 min para encontrar",
          description: "Birth certificates for all children in the household",
          description_es: "Actas de nacimiento de todos los niños en el hogar",
          obtain_url: "https://www.cdc.gov/nchs/w2w/index.htm",
        },
        {
          name: "Proof of income",
          name_es: "Comprobante de ingresos",
          status: "need_to_gather",
          time_estimate: "15 min to gather",
          time_estimate_es: "15 min para reunir",
          description: "Pay stubs, benefit letters, or proof of no income",
          description_es: "Talones de pago, cartas de beneficios o comprobante de ingresos nulos",
          obtain_url: "https://www.irs.gov/individuals/get-transcript",
        },
        {
          name: "Social Security numbers",
          name_es: "Números de Seguro Social",
          status: "need_to_gather",
          time_estimate: "10 min to find",
          time_estimate_es: "10 min para encontrar",
          description: "SSN for all household members",
          description_es: "NSS de todos los miembros del hogar",
          obtain_url: "https://www.ssa.gov/number-card",
        },
        {
          name: "Proof of address",
          name_es: "Comprobante de domicilio",
          status: "likely_have",
          time_estimate: "10 min to find",
          time_estimate_es: "10 min para encontrar",
          description: "Utility bill, lease agreement, or mail",
          description_es: "Factura de servicios, contrato de arrendamiento o correo postal",
        },
      ],
    },
    "EITC (Earned Income Tax Credit)": {
      program: "EITC (Earned Income Tax Credit)",
      program_es: "EITC (Crédito Tributario por Ingreso del Trabajo)",
      apply_order: 7,
      documents: [
        {
          name: "Social Security numbers",
          name_es: "Números de Seguro Social",
          status: "likely_have",
          time_estimate: "5 min to find",
          time_estimate_es: "5 min para encontrar",
          description: "SSN for you, your spouse, and any children",
          description_es: "NSS suyo, de su cónyuge y de sus hijos",
        },
        {
          name: "W-2 forms or 1099s",
          name_es: "Formularios W-2 o 1099",
          status: "need_to_gather",
          time_estimate: "15 min to gather",
          time_estimate_es: "15 min para reunir",
          description: "All income documents from your employer(s) for the tax year",
          description_es: "Todos los documentos de ingresos de su(s) empleador(es) del año fiscal",
          obtain_url: "https://www.irs.gov/individuals/get-transcript",
        },
        {
          name: "Bank account for direct deposit",
          name_es: "Cuenta bancaria para depósito directo",
          status: "likely_have",
          time_estimate: "5 min to find",
          time_estimate_es: "5 min para encontrar",
          description: "Routing and account number to receive your refund",
          description_es: "Número de ruta y cuenta para recibir su reembolso",
        },
        {
          name: "Last year's tax return",
          name_es: "Declaración de impuestos del año anterior",
          status: "need_to_gather",
          time_estimate: "10 min to find",
          time_estimate_es: "10 min para encontrar",
          description: "Prior year AGI needed if filing electronically",
          description_es: "Ingreso bruto ajustado del año anterior si presenta por internet",
          obtain_url: "https://www.irs.gov/individuals/get-transcript",
        },
      ],
    },
    "Lifeline (Phone & Internet)": {
      program: "Lifeline (Phone & Internet)",
      program_es: "Lifeline (Teléfono e Internet)",
      apply_order: 8,
      documents: [
        {
          name: "Government-issued photo ID",
          name_es: "Identificación con foto del gobierno",
          status: "likely_have",
          time_estimate: "5 min to find",
          time_estimate_es: "5 min para encontrar",
          description: "Driver's license, passport, or state ID",
          description_es: "Licencia de conducir, pasaporte o identificación estatal",
        },
        {
          name: "Proof of income or program participation",
          name_es: "Comprobante de ingresos o participación en programa",
          status: "need_to_gather",
          time_estimate: "10 min to gather",
          time_estimate_es: "10 min para reunir",
          description: "If you qualify through SNAP, show your SNAP benefit letter — instant qualification",
          description_es: "Si califica por SNAP, muestre su carta de beneficios — calificación inmediata",
          obtain_url: "https://www.irs.gov/individuals/get-transcript",
        },
        {
          name: "Social Security number or Tribal ID",
          name_es: "Número de Seguro Social o identificación tribal",
          status: "likely_have",
          time_estimate: "5 min to find",
          time_estimate_es: "5 min para encontrar",
          description: "Last 4 digits of SSN required for identity verification",
          description_es: "Últimos 4 dígitos del NSS para verificación de identidad",
        },
      ],
    },
    "SSI / SSDI (Supplemental Security & Disability)": {
      program: "SSI / SSDI (Supplemental Security & Disability)",
      program_es: "SSI / SSDI (Seguridad de Ingreso Suplementario y Discapacidad)",
      apply_order: 6,
      documents: [
        {
          name: "Medical records of disability",
          name_es: "Historial médico de discapacidad",
          status: "need_to_gather",
          time_estimate: "30 min to gather",
          time_estimate_es: "30 min para reunir",
          description: "Doctor reports, medical test results, and list of medical providers",
          description_es: "Informes médicos, resultados de pruebas y lista de proveedores de salud",
          obtain_url: "https://www.ssa.gov/benefits/disability/",
        },
        {
          name: "Proof of income and resources",
          name_es: "Comprobante de ingresos y recursos",
          status: "need_to_gather",
          time_estimate: "15 min to gather",
          time_estimate_es: "15 min para reunir",
          description: "Pay stubs, bank statements, and tax returns for resource evaluation",
          description_es: "Talones de pago, estados de cuenta bancarios y declaración de impuestos para evaluación de recursos",
          obtain_url: "https://www.irs.gov/individuals/get-transcript",
        },
        {
          name: "Proof of age or identity",
          name_es: "Comprobante de edad o identidad",
          status: "likely_have",
          time_estimate: "5 min to find",
          time_estimate_es: "5 min para encontrar",
          description: "Birth certificate, driver's license, or passport",
          description_es: "Acta de nacimiento, licencia de conducir o pasaporte",
        },
        {
          name: "Work history (SSDI only)",
          name_es: "Historial de trabajo (solo SSDI)",
          status: "need_to_gather",
          time_estimate: "20 min to gather",
          time_estimate_es: "20 min para reunir",
          description: "Summary of jobs and earnings for the last 15 years",
          description_es: "Resumen de trabajos e ingresos de los últimos 15 años",
          obtain_url: "https://www.ssa.gov/myaccount/",
        },
      ],
    },
  };
 
  return checklists[programName] || null;
}
 
export function getDependencyOrder(
  benefits: { name: string; eligible: string }[]
): { name: string; order: number; unlocks?: string[]; eligible: string }[] {
  const eligible = benefits.filter(
    (b) => b.eligible === "yes" || b.eligible === "likely"
  );
 
  const withOrder = eligible.map((b) => {
    const docs = getDocumentChecklist(b.name);
    return {
      name: b.name,
      order: docs?.apply_order || 99,
      unlocks: docs?.unlocks,
      eligible: b.eligible,
    };
  });
 
  return withOrder.sort((a, b) => a.order - b.order);
}