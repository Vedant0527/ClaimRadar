from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings

from app.core.config import Settings, get_settings
from app.core.errors import missing_configuration_error
from app.models.schemas import CitizenProfile, ServiceMatch


class GeminiEmbeddingService:
    """Creates Gemini embeddings for local RAG over program documents."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._embeddings: GoogleGenerativeAIEmbeddings | None = None

    @property
    def embeddings(self) -> GoogleGenerativeAIEmbeddings:
        if not self.settings.gemini_api_key:
            raise missing_configuration_error("GEMINI_API_KEY")

        if self._embeddings is None:
            self._embeddings = GoogleGenerativeAIEmbeddings(
                model=self.settings.embedding_model,
                google_api_key=self.settings.gemini_api_key,
            )
        return self._embeddings


class GeminiService:
    """Thin async wrapper around Gemini through LangChain."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._chat: ChatGoogleGenerativeAI | None = None

    @property
    def chat(self) -> ChatGoogleGenerativeAI:
        if not self.settings.gemini_api_key:
            raise missing_configuration_error("GEMINI_API_KEY")

        if self._chat is None:
            self._chat = ChatGoogleGenerativeAI(
                model=self.settings.gemini_model,
                google_api_key=self.settings.gemini_api_key,
                temperature=0.2,
            )
        return self._chat

    async def summarize_intake(
        self,
        profile: CitizenProfile,
        matches: list[ServiceMatch],
    ) -> str:
        services = "\n".join(
            f"- {match.title}: {match.reason}" for match in matches
        ) or "No local service matches were found."

        messages = [
            SystemMessage(
                content=(
                    "You are FormZero, an assistant that helps residents find "
                    "unclaimed public services. Be concise, practical, and avoid "
                    "claiming guaranteed eligibility."
                )
            ),
            HumanMessage(
                content=(
                    "Create a short intake summary and recommended action plan.\n\n"
                    f"Citizen profile:\n{profile.model_dump_json()}\n\n"
                    f"Candidate public services:\n{services}"
                )
            ),
        ]
        response = await self.chat.ainvoke(messages)
        return str(response.content)


embedding_service = GeminiEmbeddingService()
gemini_service = GeminiService()
