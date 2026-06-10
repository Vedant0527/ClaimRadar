export type UserProfile = {
  state: string;
  household_size: number;
  monthly_income: number;
  has_children: boolean;
  has_pregnant: boolean;
  has_elderly_or_disabled: boolean;
  is_student: boolean;
  immigration_status: "citizen" | "permanent_resident" | "not_disclosed";
  language: "english" | "spanish";
};

export type BenefitSource = {
  document: string;
  rule: string;
  url: string;
};

export type BenefitResult = {
  name: string;
  eligible: "yes" | "likely" | "unlikely" | "no";
  confidence: number;
  reason: string;
  annual_value: string;
  annual_value_number: number;
  apply_url: string;
  deadline?: string;
  source: BenefitSource;
};

const FPL_MONTHLY: Record<number, number> = {
  1: 1255, 2: 1703, 3: 2152, 4: 2600,
  5: 3049, 6: 3497, 7: 3946, 8: 4394,
};

function getMonthlyFPL(household_size: number): number {
  if (household_size <= 8) return FPL_MONTHLY[household_size];
  return FPL_MONTHLY[8] + (household_size - 8) * 449;
}

function fplPercent(income: number, household_size: number): number {
  const fpl = getMonthlyFPL(household_size);
  return Math.round((income / fpl) * 100);
}

export function checkEligibility(profile: UserProfile): BenefitResult[] {
  const results: BenefitResult[] = [];
  const fpl = fplPercent(profile.monthly_income, profile.household_size);

  const isEligibleImmigrant =
    profile.immigration_status === "citizen" ||
    profile.immigration_status === "permanent_resident";
  const unknownImmigration = profile.immigration_status === "not_disclosed";

  // ── Edge case flags ──────────────────────────────────────────────────────
  // Students ages 18-49 must work 20+ hrs/week OR have children under 6 for SNAP
  const snapStudentExcluded =
    profile.is_student && !profile.has_children && !profile.has_pregnant;

  // EITC requires earned income — $0 income or student stipend only won't qualify
  const hasEarnedIncome = profile.monthly_income > 0;
  const eitcStudentOnly = profile.is_student && !profile.has_children;

  // Mixed family: children may be US-born citizens even if parents didn't disclose
  const mixedFamilyWithChildren = profile.has_children && unknownImmigration;


  // 1. SNAP ─────────────────────────────────────────────────────────────────
  let snapStatus: BenefitResult["eligible"] = "unlikely";
  let snapConfidence = 20;
  let snapReason = `Your income is ${fpl}% FPL. SNAP limit is 130% FPL.`;
  let snapValue = 0;

  if (snapStudentExcluded && fpl <= 130) {
    snapStatus = "likely";
    snapConfidence = 45;
    snapReason = `Your income (${fpl}% FPL) is within SNAP's range, but students must work 20+ hours/week or have children under 6 to qualify. Check if you meet a student exemption before applying.`;
    snapValue = 2000;
  } else if (fpl <= 130 && isEligibleImmigrant) {
    snapStatus = "yes";
    snapConfidence = 95;
    snapReason = `Your income is ${fpl}% FPL. SNAP requires under 130% — you qualify.`;
    snapValue = 6000;
  } else if (fpl <= 130 && unknownImmigration) {
    snapStatus = "likely";
    snapConfidence = 70;
    snapReason = `Your income is ${fpl}% FPL, within SNAP's range. Verify eligibility based on your immigration status.`;
    snapValue = 3000;
  } else if (fpl <= 150) {
    snapStatus = "likely";
    snapConfidence = 45;
    snapReason = `Your income is ${fpl}% FPL, slightly above the 130% SNAP limit. Deductions for rent or childcare may bring your net income below the limit — still worth applying.`;
    snapValue = 1500;
  }

  results.push({
    name: "SNAP (Food Assistance)",
    eligible: snapStatus,
    confidence: snapConfidence,
    reason: snapReason,
    annual_value: "$2,400 - $10,000/year",
    annual_value_number: snapValue,
    apply_url: "https://www.fns.usda.gov/snap/applicant-recipient",
    deadline: "Rolling — apply anytime",
    source: {
      document: "SNAP Eligibility Guidelines — USDA Food and Nutrition Service",
      rule: "Households may have 130% of the poverty level in gross monthly income. 7 CFR § 273.9(a). Students enrolled at least half-time ages 18-49 must meet additional work or exemption criteria. 7 CFR § 273.5.",
      url: "https://www.fns.usda.gov/snap/eligibility",
    },
  });


  // 2. Medicaid / CHIP ───────────────────────────────────────────────────────
  // Key edge case: US-born children are citizens even if parents didn't disclose status
  let medicaidStatus: BenefitResult["eligible"] = "unlikely";
  let medicaidConfidence = 25;
  let medicaidReason = `Your income is ${fpl}% FPL. Medicaid limit is 138%.`;
  let medicaidValue = 0;

  if (fpl <= 138 && isEligibleImmigrant) {
    medicaidStatus = "yes";
    medicaidConfidence = 93;
    medicaidReason = `Your income (${fpl}% FPL) qualifies for Medicaid.`;
    medicaidValue = 8000;
  } else if (profile.has_children && fpl <= 300 && isEligibleImmigrant) {
    medicaidStatus = "yes";
    medicaidConfidence = 88;
    medicaidReason = `Your children may qualify for CHIP (up to 300% FPL).`;
    medicaidValue = 8000;
  } else if (mixedFamilyWithChildren && fpl <= 300) {
    // Children born in the US are citizens — CHIP covers them regardless of parents
    medicaidStatus = "likely";
    medicaidConfidence = 82;
    medicaidReason = `Your children likely qualify for CHIP (up to 300% FPL). Children born in the US are eligible regardless of the family's immigration status.`;
    medicaidValue = 6000;
  } else if (fpl <= 200) {
    medicaidStatus = "likely";
    medicaidConfidence = 60;
    medicaidReason = `Your income is ${fpl}% FPL. You may qualify depending on your state's Medicaid expansion rules.`;
    medicaidValue = 4000;
  }

  results.push({
    name: "Medicaid / CHIP (Healthcare)",
    eligible: medicaidStatus,
    confidence: medicaidConfidence,
    reason: medicaidReason,
    annual_value: "$5,000 - $20,000/year",
    annual_value_number: medicaidValue,
    apply_url: "https://www.healthcare.gov/medicaid-chip/",
    deadline: "Rolling — apply anytime",
    source: {
      document: "Medicaid Eligibility — Centers for Medicare & Medicaid Services",
      rule: "Adults with income up to 138% FPL qualify under ACA expansion. Children covered up to 300% FPL via CHIP. US-born children are citizens regardless of parents' immigration status. 42 CFR § 435.119.",
      url: "https://www.medicaid.gov/medicaid/eligibility/index.html",
    },
  });


  // 3. LIHEAP ───────────────────────────────────────────────────────────────
  const liheapEligible = fpl <= 150;
  results.push({
    name: "LIHEAP (Utility Bill Help)",
    eligible: liheapEligible ? "yes" : fpl <= 200 ? "likely" : "unlikely",
    confidence: liheapEligible ? 85 : fpl <= 200 ? 50 : 15,
    reason: liheapEligible
      ? `Your income (${fpl}% FPL) qualifies for LIHEAP utility assistance.`
      : `Your income is ${fpl}% FPL. LIHEAP limit is 150%.`,
    annual_value: "$200 - $1,000/year",
    annual_value_number: liheapEligible ? 500 : 0,
    apply_url:
      "https://www.acf.hhs.gov/ocs/low-income-home-energy-assistance-program-liheap",
    deadline: "Seasonal — apply before winter",
    source: {
      document: "LIHEAP Program Manual — U.S. Dept of Health & Human Services",
      rule: "Households at or below 150% of the federal poverty level or 60% of state median income are eligible. 42 U.S.C. § 8624(b)(2).",
      url: "https://www.acf.hhs.gov/ocs/policy-guidance/liheap-im-2022-01-fy-2022-liheap-guidance",
    },
  });


  // 4. WIC ──────────────────────────────────────────────────────────────────
  const wicEligible = (profile.has_children || profile.has_pregnant) && fpl <= 185;
  results.push({
    name: "WIC (Nutrition for Women & Children)",
    eligible: wicEligible ? "yes" : "no",
    confidence: wicEligible ? 90 : 5,
    reason: wicEligible
      ? `You qualify — WIC covers pregnant women and children under 5 at under 185% FPL.`
      : profile.has_children || profile.has_pregnant
      ? `Your income (${fpl}% FPL) is above the 185% WIC limit.`
      : `WIC is only for households with pregnant women or children under 5.`,
    annual_value: "$500 - $2,400/year",
    annual_value_number: wicEligible ? 1200 : 0,
    apply_url: "https://www.fns.usda.gov/wic",
    deadline: "Rolling — apply anytime",
    source: {
      document: "WIC Eligibility Requirements — USDA Food and Nutrition Service",
      rule: "Applicants must have income at or below 185% of the U.S. Poverty Income Guidelines. 7 CFR § 246.7(d)(1).",
      url: "https://www.fns.usda.gov/wic/wic-eligibility-requirements",
    },
  });


  // 5. Pell Grant ───────────────────────────────────────────────────────────
  const pellEligible = profile.is_student && fpl <= 400;
  results.push({
    name: "Pell Grant (Education Aid)",
    eligible: pellEligible ? "yes" : profile.is_student ? "likely" : "no",
    confidence: pellEligible ? 80 : profile.is_student ? 65 : 5,
    reason: profile.is_student
      ? `As a student, you may qualify for up to $7,395/year in free college money.`
      : `Pell Grant is only for students enrolled in college or vocational school.`,
    annual_value: "Up to $7,395/year",
    annual_value_number: pellEligible ? 7395 : 0,
    apply_url: "https://studentaid.gov/understand-aid/types/grants/pell",
    deadline: "June 30 each year — apply via FAFSA",
    source: {
      document: "Federal Pell Grant Program — U.S. Dept of Education",
      rule: "Pell Grants are awarded based on financial need determined by the FAFSA. Maximum award is $7,395 for 2023-24. 20 U.S.C. § 1070a.",
      url: "https://studentaid.gov/understand-aid/types/grants/pell",
    },
  });


  // 6. TANF ─────────────────────────────────────────────────────────────────
  // Edge case: citizen children may qualify even if parents are non-citizen
  const tanfEligible = profile.has_children && fpl <= 100 && isEligibleImmigrant;
  const tanfMixedFamily = profile.has_children && fpl <= 100 && unknownImmigration;

  results.push({
    name: "TANF (Cash Assistance)",
    eligible: tanfEligible
      ? "yes"
      : tanfMixedFamily || (profile.has_children && fpl <= 150)
      ? "likely"
      : "unlikely",
    confidence: tanfEligible ? 78 : tanfMixedFamily ? 55 : profile.has_children && fpl <= 150 ? 50 : 15,
    reason: tanfEligible
      ? `Your household with children at ${fpl}% FPL likely qualifies for TANF.`
      : tanfMixedFamily
      ? `TANF may be available for the US-citizen children in your household, even if not all adults qualify. Contact your state office to check.`
      : profile.has_children
      ? `TANF is for families with children. Your state reviews income at ${fpl}% FPL.`
      : `TANF is only for households with dependent children.`,
    annual_value: "$2,400 - $6,000/year",
    annual_value_number: tanfEligible ? 3600 : tanfMixedFamily ? 1800 : 0,
    apply_url: "https://www.acf.hhs.gov/ofa/programs/tanf",
    deadline: "Rolling — apply through your state",
    source: {
      document: "TANF Program Rules — U.S. Dept of Health & Human Services",
      rule: "Families with children may receive temporary cash assistance. States set income limits, typically at or below 100% FPL. US-citizen children may qualify even if parents are ineligible. 42 U.S.C. § 601.",
      url: "https://www.acf.hhs.gov/ofa/programs/tanf/about",
    },
  });


  // 7. EITC ─────────────────────────────────────────────────────────────────
  // Edge case: requires EARNED income — $0 or grant/stipend income doesn't count
  let eitcStatus: BenefitResult["eligible"] = "unlikely";
  let eitcConfidence = 20;
  let eitcReason = `Your income (${fpl}% FPL) may be above the EITC limit.`;
  let eitcValue = 0;

  if (!hasEarnedIncome) {
    eitcStatus = "unlikely";
    eitcConfidence = 10;
    eitcReason = `EITC requires earned income from a job or self-employment. With $0 reported income you likely don't qualify — but if you work at any point this year, file your taxes to check.`;
  } else if (eitcStudentOnly) {
    eitcStatus = "likely";
    eitcConfidence = 60;
    eitcReason = `EITC requires income from work — not from scholarships or grants. If your income is from a job or self-employment, you likely qualify for a refund.`;
    eitcValue = 2000;
  } else if (fpl <= 300 && isEligibleImmigrant) {
    eitcStatus = "yes";
    eitcConfidence = 88;
    eitcReason = `You likely qualify for EITC — a tax refund of up to $7,830 that many people miss. File your taxes to claim it.`;
    eitcValue = 4000;
  } else if (fpl <= 400) {
    eitcStatus = "likely";
    eitcConfidence = 60;
    eitcReason = `Your income level (${fpl}% FPL) may still qualify for partial EITC. File your taxes to find out — it costs nothing to check.`;
    eitcValue = 1500;
  }

  results.push({
    name: "EITC (Earned Income Tax Credit)",
    eligible: eitcStatus,
    confidence: eitcConfidence,
    reason: eitcReason,
    annual_value: "Up to $7,830/year",
    annual_value_number: eitcValue,
    apply_url:
      "https://www.irs.gov/credits-deductions/individuals/earned-income-tax-credit",
    deadline: "April 15 tax deadline each year",
    source: {
      document: "Earned Income Tax Credit — Internal Revenue Service",
      rule: "Workers with low to moderate income from employment or self-employment may claim EITC. Scholarship or grant income does not count as earned income. Maximum credit is $7,830 for families with 3+ children (tax year 2024). 26 U.S.C. § 32.",
      url: "https://www.irs.gov/credits-deductions/individuals/earned-income-tax-credit/eitc-income-limits-maximum-credit-amounts",
    },
  });


  // 8. Lifeline ─────────────────────────────────────────────────────────────
  const lifelineEligible = fpl <= 135;
  results.push({
    name: "Lifeline (Phone & Internet)",
    eligible: lifelineEligible ? "yes" : fpl <= 150 ? "likely" : "unlikely",
    confidence: lifelineEligible ? 92 : fpl <= 150 ? 65 : 20,
    reason: lifelineEligible
      ? `Your income (${fpl}% FPL) qualifies for free/discounted phone and internet.`
      : `Your income is ${fpl}% FPL. Lifeline limit is 135%.`,
    annual_value: "$120 - $360/year",
    annual_value_number: lifelineEligible ? 240 : 0,
    apply_url: "https://www.lifelinesupport.org/",
    deadline: "Rolling — apply anytime",
    source: {
      document: "Lifeline Program Rules — Federal Communications Commission",
      rule: "Consumers qualify if income is at or below 135% of the federal poverty guidelines. 47 CFR § 54.409(a).",
      url: "https://www.fcc.gov/consumers/guides/lifeline-support-affordable-communications",
    },
  });

  return results;
}