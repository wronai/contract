import asyncio
import os
from reclapp.llm.openrouter import OpenRouterClient, OpenRouterConfig
from reclapp.llm.provider import GenerateOptions

async def test_openrouter():
    print("Testing OpenRouterClient...")
    
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        print("OPENROUTER_API_KEY not set")
        return

    config = OpenRouterConfig(
        api_key=api_key,
        model="nvidia/nemotron-3-nano-30b-a3b:free", 
    )
    
    client = OpenRouterClient(config)
    
    try:
        available = await client.is_available()
        print(f"Is available: {available}")
        
        models = await client.list_models()
        print(f"Total models found: {len(models)}")
        
        free_models = [m.name for m in models if ":free" in m.name]
        print(f"Free models: {len(free_models)}")
        for m in free_models[:5]:
            print(f"  - {m}")
            
        # Test generation with a free model
        if free_models:
            model_to_test = free_models[0]
            print(f"\nTesting free model: {model_to_test}...")
            client.config.model = model_to_test
            resp = await client.generate(GenerateOptions(
                system="You are a helpful assistant.",
                user="Say 'Hello from " + model_to_test + "!'"
            ))
            print(f"Response: {resp.content}")
                
    finally:
        await client.close()

if __name__ == "__main__":
    asyncio.run(test_openrouter())
