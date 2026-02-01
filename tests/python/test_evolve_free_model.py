import asyncio
import os
import shutil
from pathlib import Path
from reclapp.evolution import EvolutionManager, EvolutionOptions
from reclapp.llm import LLMManager, GenerateOptions

async def test_free_model_evolution():
    print("Testing Evolution Mode with Free Model...")
    
    # Setup
    output_dir = "./test-evolve-free"
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    
    llm_manager = LLMManager(verbose=True)
    await llm_manager.initialize()
    
    if not llm_manager.is_available:
        print("No LLM providers available. Set OPENROUTER_API_KEY")
        return

    # Force a free model for testing
    provider = llm_manager.get_provider()
    # You can specify a free model here if OpenRouter is used
    if provider.name == "openrouter":
        # Using a known good free model
        provider.config.model = "nvidia/nemotron-3-nano-30b-a3b:free"
        print(f"Forced model: {provider.model}")

    options = EvolutionOptions(
        output_dir=output_dir,
        max_iterations=2, # Keep it short for testing
        auto_fix=True,
        verbose=True,
        port=3001
    )
    
    manager = EvolutionManager(options)
    manager.set_llm_client(provider)
    
    prompt = "Create a simple API for notes with title and content."
    
    try:
        print(f"Starting evolution for prompt: '{prompt}'")
        result = await manager.evolve(prompt)
        
        print("\nEvolution Result:")
        print(f"Success: {result.success}")
        print(f"Iterations: {result.iterations}")
        print(f"Files generated: {result.files_generated}")
        if result.errors:
            print(f"Errors: {result.errors}")
            
    finally:
        await llm_manager.close()

if __name__ == "__main__":
    asyncio.run(test_free_model_evolution())
