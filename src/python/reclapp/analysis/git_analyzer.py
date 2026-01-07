"""
Git Analyzer - Analyzes Git repositories for state, tech stack detection, and contract generation.

Port of: src/core/contract-ai/evolution/git-analyzer.ts

@version 1.0.0
"""

import json
import subprocess
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal, Optional

from pydantic import BaseModel


class CommitInfo(BaseModel):
    """Git commit information"""
    hash: str
    message: str
    date: str


class GitStatus(BaseModel):
    """Git status (modified, untracked, staged files)"""
    modified: list[str] = []
    untracked: list[str] = []
    staged: list[str] = []


class FileEntry(BaseModel):
    """File or directory entry"""
    path: str
    type: Literal["file", "dir"]


class DetectedStack(BaseModel):
    """Detected technology stack"""
    language: str = "unknown"
    framework: str = "unknown"
    dependencies: list[str] = []


class GitState(BaseModel):
    """Complete Git repository state"""
    is_git_repo: bool
    branch: str
    last_commit: Optional[CommitInfo] = None
    status: GitStatus = GitStatus()
    remotes: list[str] = []
    recent_commits: list[CommitInfo] = []
    file_structure: list[FileEntry] = []
    detected_stack: DetectedStack = DetectedStack()


class GitAnalyzer:
    """
    Analyzes Git repositories for state, tech stack detection, and contract generation.
    
    Example:
        analyzer = GitAnalyzer("/path/to/repo")
        state = analyzer.get_full_state()
        print(f"Branch: {state.branch}")
        print(f"Stack: {state.detected_stack.framework}")
    """
    
    def __init__(self, cwd: str):
        self.cwd = Path(cwd)
    
    def _run_git(self, *args: str) -> Optional[str]:
        """Run git command and return output"""
        try:
            result = subprocess.run(
                ["git", *args],
                cwd=self.cwd,
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                return result.stdout.strip()
            return None
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return None
    
    def is_git_repo(self) -> bool:
        """Check if directory is a git repository"""
        result = self._run_git("rev-parse", "--is-inside-work-tree")
        return result == "true"
    
    def get_branch(self) -> str:
        """Get current branch name"""
        result = self._run_git("branch", "--show-current")
        return result or "unknown"
    
    def get_last_commit(self) -> Optional[CommitInfo]:
        """Get information about the last commit"""
        result = self._run_git("log", "-1", "--format=%H|%s|%ci")
        if not result:
            return None
        
        parts = result.split("|", 2)
        if len(parts) >= 3:
            return CommitInfo(
                hash=parts[0][:8],
                message=parts[1],
                date=parts[2]
            )
        return None
    
    def get_recent_commits(self, count: int = 5) -> list[CommitInfo]:
        """Get recent commits"""
        result = self._run_git("log", f"-{count}", "--format=%H|%s|%ci")
        if not result:
            return []
        
        commits = []
        for line in result.split("\n"):
            if not line:
                continue
            parts = line.split("|", 2)
            if len(parts) >= 3:
                commits.append(CommitInfo(
                    hash=parts[0][:8],
                    message=parts[1],
                    date=parts[2]
                ))
        return commits
    
    def get_status(self) -> GitStatus:
        """Get git status (modified, untracked, staged)"""
        result = self._run_git("status", "--porcelain")
        if not result:
            return GitStatus()
        
        modified = []
        untracked = []
        staged = []
        
        for line in result.split("\n"):
            if not line or len(line) < 3:
                continue
            code = line[:2]
            file_path = line[3:]
            
            if "M" in code:
                modified.append(file_path)
            if code == "??":
                untracked.append(file_path)
            if code[0] not in (" ", "?"):
                staged.append(file_path)
        
        return GitStatus(modified=modified, untracked=untracked, staged=staged)
    
    def get_remotes(self) -> list[str]:
        """Get list of remote URLs"""
        result = self._run_git("remote", "-v")
        if not result:
            return []
        
        urls = set()
        for line in result.split("\n"):
            if not line:
                continue
            parts = line.split()
            if len(parts) >= 2:
                urls.add(parts[1])
        
        return list(urls)
    
    def get_file_structure(self) -> list[FileEntry]:
        """Get list of tracked files and directories"""
        result = self._run_git("ls-files")
        if not result:
            return []
        
        structure = []
        dirs_seen = set()
        
        for file_path in result.split("\n"):
            if not file_path:
                continue
            
            structure.append(FileEntry(path=file_path, type="file"))
            
            # Add parent directories
            parts = file_path.split("/")
            for i in range(1, len(parts)):
                dir_path = "/".join(parts[:i])
                if dir_path not in dirs_seen:
                    dirs_seen.add(dir_path)
                    structure.append(FileEntry(path=dir_path, type="dir"))
        
        return sorted(structure, key=lambda x: x.path)
    
    def detect_stack(self) -> DetectedStack:
        """Detect technology stack from repository files"""
        result = DetectedStack()
        
        try:
            files_output = self._run_git("ls-files")
            if not files_output:
                return result
            
            files = files_output.split("\n")
            
            # Detect language
            if any(f.endswith((".ts", ".tsx")) for f in files):
                result.language = "typescript"
            elif any(f.endswith((".js", ".jsx")) for f in files):
                result.language = "javascript"
            elif any(f.endswith(".py") for f in files):
                result.language = "python"
            elif any(f.endswith(".go") for f in files):
                result.language = "go"
            elif any(f.endswith(".rs") for f in files):
                result.language = "rust"
            
            # Check package.json for Node.js projects
            pkg_path = self.cwd / "package.json"
            if pkg_path.exists():
                pkg = json.loads(pkg_path.read_text())
                deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
                result.dependencies = list(deps.keys())[:50]
                
                if "next" in deps:
                    result.framework = "nextjs"
                elif "react" in deps:
                    result.framework = "react"
                elif "vue" in deps:
                    result.framework = "vue"
                elif "express" in deps:
                    result.framework = "express"
                elif "fastify" in deps:
                    result.framework = "fastify"
                elif "@nestjs/core" in deps or "nestjs" in deps:
                    result.framework = "nestjs"
            
            # Check requirements.txt for Python projects
            req_path = self.cwd / "requirements.txt"
            if req_path.exists():
                reqs = req_path.read_text().split("\n")
                result.dependencies = [r.split("==")[0].split(">=")[0].strip() 
                                       for r in reqs if r.strip()][:50]
                
                if any("django" in r.lower() for r in reqs):
                    result.framework = "django"
                elif any("flask" in r.lower() for r in reqs):
                    result.framework = "flask"
                elif any("fastapi" in r.lower() for r in reqs):
                    result.framework = "fastapi"
            
            # Check pyproject.toml
            pyproject_path = self.cwd / "pyproject.toml"
            if pyproject_path.exists():
                content = pyproject_path.read_text()
                if "django" in content.lower():
                    result.framework = "django"
                elif "flask" in content.lower():
                    result.framework = "flask"
                elif "fastapi" in content.lower():
                    result.framework = "fastapi"
        
        except Exception:
            pass
        
        return result
    
    def get_full_state(self) -> GitState:
        """Get complete repository state"""
        return GitState(
            is_git_repo=self.is_git_repo(),
            branch=self.get_branch(),
            last_commit=self.get_last_commit(),
            status=self.get_status(),
            remotes=self.get_remotes(),
            recent_commits=self.get_recent_commits(),
            file_structure=self.get_file_structure(),
            detected_stack=self.detect_stack()
        )
    
    async def generate_contract_from_code(
        self, 
        llm_client: Optional[Any] = None
    ) -> Optional[dict]:
        """
        Generate a ContractAI from existing codebase using LLM analysis.
        
        Args:
            llm_client: Optional LLM client for intelligent analysis
        
        Returns:
            ContractAI dict or None if not a git repo
        """
        if not self.is_git_repo():
            return None
        
        state = self.get_full_state()
        stack = state.detected_stack
        
        # Collect key files for analysis
        key_files: list[dict[str, str]] = []
        interesting_patterns = ["server", "model", "schema", "entity", "route", "api"]
        
        for entry in state.file_structure:
            if entry.type != "file":
                continue
            
            # Select interesting files
            is_interesting = (
                entry.path.endswith((".ts", ".js", ".py")) and
                (any(p in entry.path.lower() for p in interesting_patterns) or
                 entry.path in ("package.json", "requirements.txt"))
            )
            
            if is_interesting and len(key_files) < 10:
                try:
                    file_path = self.cwd / entry.path
                    content = file_path.read_text()[:2000]
                    key_files.append({"path": entry.path, "content": content})
                except Exception:
                    pass
        
        # Use LLM to generate contract if available
        if llm_client and key_files:
            files_context = "\n\n".join(
                f"--- {f['path']} ---\n{f['content']}" for f in key_files
            )
            
            prompt = f"""Analyze this existing codebase and generate a ContractAI JSON.

Tech Stack:
- Language: {stack.language}
- Framework: {stack.framework}
- Dependencies: {', '.join(stack.dependencies[:20])}

Key Files:
{files_context}

Generate a ContractAI with:
1. entities - data models found in the code
2. generation.instructions - what layers exist and their status

Output ONLY valid JSON matching ContractAI schema."""
            
            try:
                from ..llm import GenerateOptions
                response = await llm_client.generate(GenerateOptions(
                    system="You analyze codebases and generate ContractAI specifications. Output only valid JSON.",
                    user=prompt,
                    temperature=0.2,
                    max_tokens=4000
                ))
                
                # Extract JSON from response
                import re
                json_match = re.search(r'\{[\s\S]*\}', response.content)
                if json_match:
                    return json.loads(json_match.group(0))
            except Exception:
                pass
        
        # Return basic contract structure
        return {
            "definition": {
                "app": {
                    "name": self.cwd.name,
                    "version": "1.0.0",
                    "description": f"Imported from existing {stack.framework} project"
                },
                "entities": [],
                "events": [],
                "api": {
                    "version": "v1",
                    "prefix": "/api/v1",
                    "resources": []
                }
            },
            "generation": {
                "instructions": [
                    {
                        "target": "api",
                        "priority": "must",
                        "instruction": f"Existing {stack.framework} API detected"
                    }
                ],
                "patterns": [],
                "constraints": [],
                "techStack": {
                    "backend": {"framework": "express", "language": "typescript", "runtime": "node", "port": 3000},
                    "database": {"type": "in-memory"}
                }
            },
            "validation": {
                "assertions": [],
                "tests": [],
                "staticRules": [],
                "qualityGates": [],
                "acceptance": {
                    "testsPass": True,
                    "minCoverage": 0,
                    "maxLintErrors": 0,
                    "maxResponseTime": 1000,
                    "securityChecks": [],
                    "custom": []
                }
            },
            "metadata": {
                "version": "1.0.0",
                "source": "imported"
            }
        }
