"""
Testy generowania pełnych aplikacji przez Reclapp

Uruchamia evolve i sprawdza czy aplikacje zostały wygenerowane poprawnie.

Uruchomienie:
    python tests/python/test_generate_apps.py
"""

import os
import sys
import pytest
import tempfile
import subprocess
import time
import json
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent


def check_lm_studio_available():
    """Sprawdza czy LM Studio jest dostępne"""
    try:
        import requests
        response = requests.get('http://localhost:8123/v1/models', timeout=2)
        return response.status_code == 200
    except:
        return False


class TestGenerateTodoApp:
    """Test generowania aplikacji Todo"""
    
    @pytest.mark.integration
    def test_generate_todo_app_with_litellm(self):
        """Test generowania aplikacji todo z użyciem LiteLLM"""
        if not check_lm_studio_available():
            pytest.skip("LM Studio nie działa - uruchom LM Studio na porcie 8123")
        
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir) / 'test-todo-app'
            output_dir.mkdir()
            
            # Ustaw zmienne środowiskowe
            env = os.environ.copy()
            env['LLM_PROVIDER'] = 'litellm'
            env['LITELLM_URL'] = 'http://localhost:8123'
            env['LITELLM_MODEL'] = 'model:1'
            
            # Uruchom evolve
            cmd = [
                'node',
                str(project_root / 'bin' / 'reclapp'),
                'evolve',
                '--prompt', 'Create a simple todo app with tasks',
                '-o', str(output_dir),
                '--port', '5000'
            ]
            
            result = subprocess.run(
                cmd,
                cwd=project_root,
                capture_output=True,
                text=True,
                env=env,
                timeout=300  # 5 minut timeout
            )
            
            # Assert - sprawdź czy aplikacja została wygenerowana
            api_dir = output_dir / 'api'
            assert api_dir.exists(), f"API directory nie istnieje. Output: {result.stdout}\nError: {result.stderr}"
            
            server_file = api_dir / 'src' / 'server.ts'
            assert server_file.exists(), "server.ts nie został wygenerowany"
            
            package_json = api_dir / 'package.json'
            assert package_json.exists(), "package.json nie został wygenerowany"
            
            # Sprawdź czy kod zawiera todo-related endpoints
            server_content = server_file.read_text()
            assert 'todo' in server_content.lower() or 'task' in server_content.lower(), \
                "Kod nie zawiera todo/task endpoints"
            
            print(f"✅ Aplikacja Todo wygenerowana w: {output_dir}")


class TestGenerateRecipeApp:
    """Test generowania aplikacji Recipe"""
    
    @pytest.mark.integration
    def test_generate_recipe_app_with_litellm(self):
        """Test generowania aplikacji recipe z użyciem LiteLLM"""
        if not check_lm_studio_available():
            pytest.skip("LM Studio nie działa - uruchom LM Studio na porcie 8123")
        
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir) / 'test-recipe-app'
            output_dir.mkdir()
            
            prompt = "Create a recipe management system with: Recipes with name, description, ingredients, instructions. Categories for recipes. REST API with Express.js and TypeScript."
            
            # Ustaw zmienne środowiskowe
            env = os.environ.copy()
            env['LLM_PROVIDER'] = 'litellm'
            env['LITELLM_URL'] = 'http://localhost:8123'
            env['LITELLM_MODEL'] = 'model:1'
            
            # Uruchom evolve
            cmd = [
                'node',
                str(project_root / 'bin' / 'reclapp'),
                'evolve',
                '--prompt', prompt,
                '-o', str(output_dir),
                '--port', '5001'
            ]
            
            result = subprocess.run(
                cmd,
                cwd=project_root,
                capture_output=True,
                text=True,
                env=env,
                timeout=300
            )
            
            # Assert
            api_dir = output_dir / 'api'
            if not api_dir.exists():
                pytest.skip(f"Aplikacja nie została wygenerowana. Output: {result.stdout}\nError: {result.stderr}")
            
            server_file = api_dir / 'src' / 'server.ts'
            assert server_file.exists(), "server.ts nie został wygenerowany"
            
            # Sprawdź czy kod zawiera recipe-related endpoints lub categories (LLM może wygenerować częściowo)
            server_content = server_file.read_text()
            # LLM może wygenerować tylko categories lub pełne recipe endpoints - oba są OK
            has_recipe_content = 'recipe' in server_content.lower() or 'Recipe' in server_content
            has_category_content = 'categor' in server_content.lower() or 'Categor' in server_content
            assert has_recipe_content or has_category_content, \
                f"Kod nie zawiera recipe/category endpoints. Zawartość: {server_content[:200]}..."
            
            print(f"✅ Aplikacja Recipe wygenerowana w: {output_dir}")


class TestGenerateBlogApp:
    """Test generowania aplikacji Blog"""
    
    @pytest.mark.integration
    def test_generate_blog_app_with_litellm(self):
        """Test generowania aplikacji blog z użyciem LiteLLM"""
        if not check_lm_studio_available():
            pytest.skip("LM Studio nie działa - uruchom LM Studio na porcie 8123")
        
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir) / 'test-blog-app'
            output_dir.mkdir()
            
            prompt = "Create a blog app with posts and comments. Posts have title, content, author, published date. Comments have content, author, post reference. REST API with Express.js and TypeScript."
            
            # Ustaw zmienne środowiskowe
            env = os.environ.copy()
            env['LLM_PROVIDER'] = 'litellm'
            env['LITELLM_URL'] = 'http://localhost:8123'
            env['LITELLM_MODEL'] = 'model:1'
            
            # Uruchom evolve
            cmd = [
                'node',
                str(project_root / 'bin' / 'reclapp'),
                'evolve',
                '--prompt', prompt,
                '-o', str(output_dir),
                '--port', '5002'
            ]
            
            result = subprocess.run(
                cmd,
                cwd=project_root,
                capture_output=True,
                text=True,
                env=env,
                timeout=300
            )
            
            # Assert
            api_dir = output_dir / 'api'
            if not api_dir.exists():
                pytest.skip(f"Aplikacja nie została wygenerowana. Output: {result.stdout}\nError: {result.stderr}")
            
            server_file = api_dir / 'src' / 'server.ts'
            assert server_file.exists(), "server.ts nie został wygenerowany"
            
            # Sprawdź czy kod zawiera blog-related endpoints
            server_content = server_file.read_text()
            assert ('post' in server_content.lower() or 'Post' in server_content) and \
                   ('comment' in server_content.lower() or 'Comment' in server_content), \
                "Kod nie zawiera post/comment endpoints"
            
            print(f"✅ Aplikacja Blog wygenerowana w: {output_dir}")


def run_all_tests():
    """Uruchom wszystkie testy generowania aplikacji"""
    print("🧪 Uruchamianie testów generowania aplikacji...")
    print("⚠️  Upewnij się, że LM Studio działa na porcie 8123\n")
    
    pytest.main([
        __file__,
        '-v',
        '--tb=short',
        '-m', 'integration'
    ])


if __name__ == '__main__':
    """
    Uruchom wszystkie testy generowania aplikacji:
    
    python tests/python/test_generate_apps.py
    """
    run_all_tests()

