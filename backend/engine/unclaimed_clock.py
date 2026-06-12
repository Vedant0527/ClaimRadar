from datetime import date
from typing import List

from app.models.schemas import (
    UnclaimedCalculation,
    UnclaimedProgramBreakdown,
)


PROGRAM_MONTHLY_VALUES_USD = {
    # India (converted to USD at 83 INR/USD)
    "nsp": 120.0,
    "pm_kisan": 20.0,
    "ayushman_bharat": 0.0,
    "pmay": 18.0,
    "ujjwala": 12.0,
    # USA
    "snap": 230.0,
    "medicaid": 600.0,
    "pell_grant": 550.0,
    "liheap": 60.0,
    "section_8": 900.0,
}


class UnclaimedClock:
    def calculate(
        self,
        profile_id: str,
        eligible_program_ids: List[str],
        eligibility_start_date: date,
    ) -> UnclaimedCalculation:
        today = date.today()
        months_unclaimed = self._months_between(eligibility_start_date, today)

        breakdown: list[UnclaimedProgramBreakdown] = []
        total_unclaimed = 0.0
        monthly_value_sum = 0.0

        for program_id in eligible_program_ids:
            monthly_value = PROGRAM_MONTHLY_VALUES_USD.get(program_id, 0.0)
            program_total = monthly_value * months_unclaimed
            total_unclaimed += program_total
            monthly_value_sum += monthly_value
            breakdown.append(
                UnclaimedProgramBreakdown(
                    program_id=program_id,
                    monthly_value_usd=monthly_value,
                    months_unclaimed=months_unclaimed,
                    total_unclaimed_usd=round(program_total, 2),
                    non_monetary=monthly_value == 0.0,
                )
            )

        per_second_loss = monthly_value_sum / (30 * 24 * 3600)
        return UnclaimedCalculation(
            profile_id=profile_id,
            eligibility_start_date=eligibility_start_date,
            months_unclaimed=months_unclaimed,
            total_unclaimed_usd=round(total_unclaimed, 2),
            per_second_loss=per_second_loss,
            breakdown=breakdown,
        )

    def _months_between(self, start: date, end: date) -> int:
        if start > end:
            return 0

        months = (end.year - start.year) * 12 + (end.month - start.month)
        if end.day < start.day:
            months -= 1
        return max(months, 0)


unclaimed_clock = UnclaimedClock()
