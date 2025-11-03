"""
Unit tests for worktree file operation isolation in agent.py

These tests verify that when a working_dir is specified in an AgentPromptRequest,
file operations (Edit, Write, Read, Glob, Grep) execute in the correct context.
"""

import os
import tempfile
import shutil
from unittest.mock import patch, MagicMock
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from adw_modules.agent import prompt_claude_code
from adw_modules.data_types import AgentPromptRequest


def test_prompt_claude_code_respects_working_dir():
    """
    Test that prompt_claude_code changes to working_dir before execution
    and restores the original directory afterward.
    """
    # Create temporary directories
    temp_main = tempfile.mkdtemp(prefix="test_main_")
    temp_worktree = tempfile.mkdtemp(prefix="test_worktree_")

    try:
        # Save original working directory
        original_cwd = os.getcwd()

        # Create a test output file path
        output_file = os.path.join(temp_main, "agents", "test123", "ops", "output.jsonl")
        os.makedirs(os.path.dirname(output_file), exist_ok=True)

        # Track which directory we were in during subprocess.run
        cwd_during_execution = None

        def mock_subprocess_run(*args, **kwargs):
            """Mock subprocess.run and capture the current working directory."""
            nonlocal cwd_during_execution
            cwd_during_execution = os.getcwd()

            # Create minimal output file to simulate successful execution
            with open(output_file, "w") as f:
                f.write('{"type": "result", "result": "test output", "is_error": false, "session_id": "test123"}\n')

            # Return successful result
            result = MagicMock()
            result.returncode = 0
            result.stderr = ""
            return result

        # Mock check_claude_installed to avoid requiring Claude Code
        with patch('adw_modules.agent.check_claude_installed', return_value=None):
            # Mock subprocess.run to capture the working directory
            with patch('subprocess.run', side_effect=mock_subprocess_run):
                # Create request with working_dir specified
                request = AgentPromptRequest(
                    prompt="/test command",
                    adw_id="test123",
                    agent_name="ops",
                    model="sonnet",
                    output_file=output_file,
                    working_dir=temp_worktree,
                )

                # Execute the function
                response = prompt_claude_code(request)

                # Verify the response was successful
                assert response.success, f"Expected success, got: {response.output}"

                # Verify that during subprocess execution, we were in the worktree directory
                # Use realpath to resolve symlinks (e.g., /var -> /private/var on macOS)
                assert os.path.realpath(cwd_during_execution) == os.path.realpath(temp_worktree), (
                    f"Expected subprocess to run in {temp_worktree}, "
                    f"but it ran in {cwd_during_execution}"
                )

                # Verify that after execution, we're back in the original directory
                assert os.getcwd() == original_cwd, (
                    f"Expected to be restored to {original_cwd}, "
                    f"but currently in {os.getcwd()}"
                )

    finally:
        # Clean up temporary directories
        shutil.rmtree(temp_main, ignore_errors=True)
        shutil.rmtree(temp_worktree, ignore_errors=True)


def test_prompt_claude_code_restores_cwd_on_error():
    """
    Test that prompt_claude_code restores the original directory
    even when an error occurs during execution.
    """
    # Create temporary directories
    temp_main = tempfile.mkdtemp(prefix="test_main_")
    temp_worktree = tempfile.mkdtemp(prefix="test_worktree_")

    try:
        # Save original working directory
        original_cwd = os.getcwd()

        # Create a test output file path
        output_file = os.path.join(temp_main, "agents", "test456", "ops", "output.jsonl")
        os.makedirs(os.path.dirname(output_file), exist_ok=True)

        def mock_subprocess_run_with_error(*args, **kwargs):
            """Mock subprocess.run that raises an exception."""
            # Verify we're in the worktree
            assert os.getcwd() == temp_worktree
            # Raise an exception to simulate error
            raise RuntimeError("Simulated subprocess error")

        # Mock check_claude_installed to avoid requiring Claude Code
        with patch('adw_modules.agent.check_claude_installed', return_value=None):
            # Mock subprocess.run to raise an error
            with patch('subprocess.run', side_effect=mock_subprocess_run_with_error):
                # Create request with working_dir specified
                request = AgentPromptRequest(
                    prompt="/test command",
                    adw_id="test456",
                    agent_name="ops",
                    model="sonnet",
                    output_file=output_file,
                    working_dir=temp_worktree,
                )

                # Execute the function (should catch the error)
                response = prompt_claude_code(request)

                # Verify the response indicates failure
                assert not response.success, "Expected failure due to simulated error"
                assert "Error executing Claude Code" in response.output

                # Verify that after error, we're back in the original directory
                assert os.getcwd() == original_cwd, (
                    f"Expected to be restored to {original_cwd} after error, "
                    f"but currently in {os.getcwd()}"
                )

    finally:
        # Clean up temporary directories
        shutil.rmtree(temp_main, ignore_errors=True)
        shutil.rmtree(temp_worktree, ignore_errors=True)


def test_prompt_claude_code_works_without_working_dir():
    """
    Test that prompt_claude_code still works when working_dir is not specified.
    This ensures backward compatibility with code that doesn't use worktrees.
    """
    # Create temporary directory for output
    temp_main = tempfile.mkdtemp(prefix="test_main_")

    try:
        # Save original working directory
        original_cwd = os.getcwd()

        # Create a test output file path
        output_file = os.path.join(temp_main, "agents", "test789", "ops", "output.jsonl")
        os.makedirs(os.path.dirname(output_file), exist_ok=True)

        # Track which directory we were in during subprocess.run
        cwd_during_execution = None

        def mock_subprocess_run(*args, **kwargs):
            """Mock subprocess.run and capture the current working directory."""
            nonlocal cwd_during_execution
            cwd_during_execution = os.getcwd()

            # Create minimal output file
            with open(output_file, "w") as f:
                f.write('{"type": "result", "result": "test output", "is_error": false, "session_id": "test789"}\n')

            result = MagicMock()
            result.returncode = 0
            result.stderr = ""
            return result

        # Mock check_claude_installed
        with patch('adw_modules.agent.check_claude_installed', return_value=None):
            # Mock subprocess.run
            with patch('subprocess.run', side_effect=mock_subprocess_run):
                # Create request WITHOUT working_dir
                request = AgentPromptRequest(
                    prompt="/test command",
                    adw_id="test789",
                    agent_name="ops",
                    model="sonnet",
                    output_file=output_file,
                    working_dir=None,  # No working_dir specified
                )

                # Execute the function
                response = prompt_claude_code(request)

                # Verify success
                assert response.success, f"Expected success, got: {response.output}"

                # Verify we stayed in the original directory
                assert cwd_during_execution == original_cwd
                assert os.getcwd() == original_cwd

    finally:
        # Clean up
        shutil.rmtree(temp_main, ignore_errors=True)


if __name__ == "__main__":
    """Run tests directly without pytest."""
    print("Running test_prompt_claude_code_respects_working_dir...")
    test_prompt_claude_code_respects_working_dir()
    print("✅ PASSED\n")

    print("Running test_prompt_claude_code_restores_cwd_on_error...")
    test_prompt_claude_code_restores_cwd_on_error()
    print("✅ PASSED\n")

    print("Running test_prompt_claude_code_works_without_working_dir...")
    test_prompt_claude_code_works_without_working_dir()
    print("✅ PASSED\n")

    print("All tests passed! ✅")
