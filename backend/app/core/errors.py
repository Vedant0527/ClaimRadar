from fastapi import HTTPException, status


def missing_configuration_error(setting_name: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=f"{setting_name} is not configured for this deployment.",
    )
