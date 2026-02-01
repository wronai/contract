import asyncio
import os
from reclapp.llm.windsurf import WindsurfClient, WindsurfConfig
from reclapp.llm.provider import GenerateOptions

async def test_windsurf():
    print("Testing WindsurfClient...")
    
    config = WindsurfConfig(
        base_url=os.getenv("WINDSURF_BASE_URL", "http://localhost:9090/v1"),
        model="cascade", # Default model
    )
    
    client = WindsurfClient(config)
    
    try:
        available = await client.is_available()
        print(f"Is available: {available}")
        
        if not available:
            print("Windsurf server not running at http://localhost:9090")
            return

        models = await client.list_models()
        print(f"Available models: {[m.name for m in models]}")
        
        # Test generation with cascade
        print("\nTesting 'cascade' model...")
        resp = await client.generate(GenerateOptions(
            system="You are a helpful assistant.",
            user="Say 'Hello from Cascade!'"
        ))
        print(f"Response: {resp.content}")
        
        # Test free models if any detected
        free_models = [m.name for m in models if "free" in m.name.lower() or "claude-3-haiku" in m.name.lower()]
        for model in free_models:
            print(f"\nTesting free model: {model}...")
            client.config.model = model
            try:
                resp = await client.generate(GenerateOptions(
                    system="You are a helpful assistant.",
                    user="Say 'Hello from " + model + "!'"
                ))
                print(f"Response: {resp.content}")
            except Exception as e:
                print(f"Error testing {model}: {e}")
                
    finally:
        await client.close()

if __name__ == "__main__":
    asyncio.run(test_windsurf())
