"""Install the Android Pydantic bridge before Hermes modules are imported.

Chaquopy imports application code after its packaged site-packages. Keeping this
hook at the source root means every service entry point sees the same symbols,
including ``field_validator``, without depending on a host-only Pydantic 2 wheel.
"""

try:
    import hermes_android_pydantic

    hermes_android_pydantic.install()
except Exception:
    # A missing compatibility module must remain visible as the original import
    # error; never replace it with a silent fallback.
    pass
