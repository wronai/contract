"""
Base Generator

Abstract base class for all generators with LLM support.

@version 2.4.1
"""

from abc import ABC, abstractmethod
from typing import Any, Optional, TypeVar, Generic

from pydantic import BaseModel

from ..llm import LLMProvider


TOptions = TypeVar("TOptions", bound=BaseModel)
TResult = TypeVar("TResult", bound=BaseModel)


class BaseGenerator(ABC, Generic[TOptions, TResult]):
    """
    Abstract base class for generators.
    
    Provides common functionality:
    - LLM client management
    - Token estimation
    - Verbose logging
    
    Subclasses must implement:
    - generate(): Main generation method
    """
    
    def __init__(self, options: Optional[TOptions] = None, verbose: bool = False):
        self._options = options
        self._llm_client: Optional[LLMProvider] = None
        self._verbose = verbose
    
    @property
    def options(self) -> Optional[TOptions]:
        """Get generator options"""
        return self._options
    
    @property
    def llm_client(self) -> Optional[LLMProvider]:
        """Get LLM client"""
        return self._llm_client
    
    @property
    def verbose(self) -> bool:
        """Check if verbose mode is enabled"""
        return self._verbose
    
    def set_llm_client(self, client: LLMProvider) -> None:
        """Set the LLM client for generation"""
        self._llm_client = client
    
    def require_llm_client(self) -> LLMProvider:
        """Get LLM client or raise error if not set"""
        if not self._llm_client:
            raise RuntimeError("LLM client not set. Call set_llm_client() first.")
        return self._llm_client
    
    def _estimate_tokens(self, text: str) -> int:
        """Estimate token count (rough approximation: ~4 chars per token)"""
        return len(text) // 4
    
    def _log(self, message: str) -> None:
        """Log message if verbose mode is enabled"""
        if self._verbose:
            print(message)
    
    @abstractmethod
    async def generate(self, *args: Any, **kwargs: Any) -> TResult:
        """Main generation method - must be implemented by subclasses"""
        pass
