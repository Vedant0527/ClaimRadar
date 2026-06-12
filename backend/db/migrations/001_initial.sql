CREATE TABLE IF NOT EXISTS audit_sessions (
    session_id UUID PRIMARY KEY,
    country TEXT NOT NULL,
    programs_analyzed INTEGER,
    programs_eligible INTEGER,
    citations JSONB,
    results JSONB,
    total_unclaimed_usd FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS program_metadata (
    program_id TEXT PRIMARY KEY,
    program_name TEXT NOT NULL,
    country TEXT NOT NULL,
    administering_agency TEXT,
    official_url TEXT,
    monthly_value_usd FLOAT,
    currency TEXT DEFAULT 'USD'
);

INSERT INTO program_metadata (
    program_id,
    program_name,
    country,
    administering_agency,
    official_url,
    monthly_value_usd,
    currency
) VALUES
    (
        'nsp',
        'National Scholarship Portal',
        'india',
        'Ministry of Electronics and Information Technology',
        'https://scholarships.gov.in',
        120.0,
        'USD'
    ),
    (
        'pm_kisan',
        'PM Kisan Samman Nidhi',
        'india',
        'Department of Agriculture and Farmers Welfare',
        'https://pmkisan.gov.in',
        20.0,
        'USD'
    ),
    (
        'ayushman_bharat',
        'Ayushman Bharat PM-JAY',
        'india',
        'National Health Authority',
        'https://pmjay.gov.in',
        0.0,
        'USD'
    ),
    (
        'pmay',
        'Pradhan Mantri Awas Yojana',
        'india',
        'Ministry of Housing and Urban Affairs',
        'https://pmaymis.gov.in',
        18.0,
        'USD'
    ),
    (
        'ujjwala',
        'Pradhan Mantri Ujjwala Yojana',
        'india',
        'Ministry of Petroleum and Natural Gas',
        'https://www.pmuy.gov.in',
        12.0,
        'USD'
    ),
    (
        'snap',
        'Supplemental Nutrition Assistance Program',
        'usa',
        'U.S. Department of Agriculture Food and Nutrition Service',
        'https://www.fns.usda.gov/snap/supplemental-nutrition-assistance-program',
        230.0,
        'USD'
    ),
    (
        'medicaid',
        'Medicaid',
        'usa',
        'Centers for Medicare & Medicaid Services',
        'https://www.medicaid.gov',
        600.0,
        'USD'
    ),
    (
        'pell_grant',
        'Federal Pell Grant',
        'usa',
        'U.S. Department of Education Federal Student Aid',
        'https://studentaid.gov/understand-aid/types/grants/pell',
        550.0,
        'USD'
    ),
    (
        'liheap',
        'Low Income Home Energy Assistance Program',
        'usa',
        'U.S. Department of Health and Human Services',
        'https://www.acf.hhs.gov/ocs/programs/liheap',
        60.0,
        'USD'
    ),
    (
        'section_8',
        'Housing Choice Voucher Program',
        'usa',
        'U.S. Department of Housing and Urban Development',
        'https://www.hud.gov/topics/housing_choice_voucher_program_section_8',
        900.0,
        'USD'
    )
ON CONFLICT (program_id) DO UPDATE SET
    program_name = EXCLUDED.program_name,
    country = EXCLUDED.country,
    administering_agency = EXCLUDED.administering_agency,
    official_url = EXCLUDED.official_url,
    monthly_value_usd = EXCLUDED.monthly_value_usd,
    currency = EXCLUDED.currency;

ALTER TABLE audit_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous insert" ON audit_sessions;
CREATE POLICY "Allow anonymous insert"
ON audit_sessions
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Block anonymous read" ON audit_sessions;
CREATE POLICY "Block anonymous read"
ON audit_sessions
FOR SELECT
USING (false);
