"""Pytest configuration for backend tests."""
import sys
from pathlib import Path

# Add backend directory to Python path so imports work from repo root
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))
