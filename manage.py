#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def _check_venv():
    """Warn if the active Python is not inside this project's virtual environment."""
    # Skip the check in CI/CD or container environments where VIRTUAL_ENV is set
    # by the runner, or when SKIP_VENV_CHECK is explicitly set.
    if os.environ.get('SKIP_VENV_CHECK') or os.environ.get('CI'):
        return

    in_venv = (
        os.environ.get('VIRTUAL_ENV')                       # standard venv/virtualenv
        or hasattr(sys, 'real_prefix')                       # virtualenv < 20
        or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)  # venv
    )

    if not in_venv:
        print(
            "\n\033[93m[MEDIAFLOW WARNING]\033[0m "
            "You are NOT running inside the project virtual environment.\n"
            "  Global Python is at: " + sys.executable + "\n"
            "  This may load incompatible packages (e.g. Django 6 instead of 5.1).\n"
            "  Activate the venv first:\n"
            "    Windows : venv\\Scripts\\activate\n"
            "    Unix    : source venv/bin/activate\n"
            "  Or run via the helper scripts: start.bat / start.sh\n",
            file=sys.stderr,
        )


def main():
    """Run administrative tasks."""
    _check_venv()
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mediaflow.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
