# Refactoring Report: src/python/reclapp

## Summary
- **Files:** 23
- **Functions:** 165
- **Duplicates:** 10
- **Quality issues:** 6
- **Security issues:** 0

## Duplicates

### 39cec4af
**Suggestion:** Extract to shared utility function

- `generator/code_generator.py::CodeGenerator.set_llm_client`
- `generator/contract_generator.py::ContractGenerator.set_llm_client`

### 84d6e963
**Suggestion:** Extract to shared utility function

- `llm/manager.py::LLMManager.__init__`
- `evolution/shell_renderer.py::ShellRenderer.__init__`
- `evolution/task_queue.py::TaskQueue.__init__`

### 3a113a53
**Suggestion:** Extract to shared utility function

- `llm/manager.py::LLMManager.is_available`
- `llm/ollama.py::OllamaClient.is_available`
- `llm/provider.py::LLMProvider.is_available`

### 6c24c540
**Suggestion:** Extract to shared utility function

- `llm/manager.py::LLMManager.close`
- `llm/ollama.py::OllamaClient.close`

### b955f41d
**Suggestion:** Extract to shared utility function

- `llm/manager.py::LLMManager.__aenter__`
- `llm/ollama.py::OllamaClient.__aenter__`

### 70d7f444
**Suggestion:** Extract to shared utility function

- `llm/manager.py::LLMManager.__aexit__`
- `llm/ollama.py::OllamaClient.__aexit__`

### 92a3bf90
**Suggestion:** Extract to shared utility function

- `llm/ollama.py::OllamaClient.name`
- `llm/provider.py::LLMProvider.name`

### 1bbfd0f3
**Suggestion:** Extract to shared utility function

- `llm/ollama.py::OllamaClient.model`
- `llm/provider.py::LLMProvider.model`

### 976cad73
**Suggestion:** Extract to shared utility function

- `llm/ollama.py::OllamaClient.list_models`
- `llm/provider.py::LLMProvider.list_models`

### 4bd4a985
**Suggestion:** Extract to shared utility function

- `llm/ollama.py::OllamaClient.generate`
- `llm/provider.py::LLMProvider.generate`

## Quality Issues

- 🟡 **long_file** at `generator/code_generator.py::`
  - long_file: 564
- 🟡 **long_file** at `evolution/evolution_manager.py::`
  - long_file: 1000
- 🟡 **long_function** at `models/contract.py::create_minimal_contract`
  - long_function: 55
- 🟡 **long_function** at `parser/markdown_parser.py::_parse_tech_section`
  - long_function: 53
- 🟡 **long_function** at `validation/stages.py::create_assertion_validator`
  - long_function: 55
- 🟡 **long_function** at `validation/stages.py::create_quality_checker`
  - long_function: 56
