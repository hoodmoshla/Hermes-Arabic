"""Pydantic v2 symbols on the Pydantic 1.10 runtime Chaquopy can package.

Chaquopy 17 installs only binary wheels. Pydantic 2 requires ``pydantic-core``,
and neither PyPI nor the Chaquopy index publishes a Python 3.11 Android wheel
for it. Hermes Agent v0.22.4 imports Pydantic 2 names while starting its server,
so this module supplies those names from the installed Pydantic 1.10.24 package.
"""

from __future__ import annotations

import json
from typing import Any, Callable

import pydantic as _pydantic_v1
from pydantic import BaseModel as _V1BaseModel
from pydantic import Extra, Field as _V1Field, ValidationError, root_validator
from pydantic.class_validators import VALIDATOR_CONFIG_KEY, Validator, _prepare_validator


PYDANTIC_VERSION = str(getattr(_pydantic_v1, "VERSION", "0"))
PYDANTIC_MAJOR = int(PYDANTIC_VERSION.split(".", 1)[0] or "0")
_EXTRA = {
    "ignore": Extra.ignore,
    "allow": Extra.allow,
    "forbid": Extra.forbid,
}


class ConfigDict(dict):
    """Mapping accepted anywhere the server writes ``model_config = ConfigDict(...)``."""


def _config_from_mapping(mapping: dict[str, Any]) -> type:
    extra = mapping.get("extra", "ignore")
    if extra not in _EXTRA:
        raise ValueError(f"Unsupported Pydantic extra mode: {extra}")
    return type(
        "Config",
        (),
        {
            "extra": _EXTRA[extra],
            "allow_population_by_field_name": bool(mapping.get("populate_by_name", False)),
            "validate_all": bool(mapping.get("validate_default", False)),
            "orm_mode": bool(mapping.get("from_attributes", False)),
            "allow_mutation": not bool(mapping.get("frozen", False)),
        },
    )


class _BridgeMeta(type(_V1BaseModel)):
    """Translate v2 class config before Pydantic 1 scans the class namespace."""

    def __new__(mcs, name, bases, namespace, **kwargs):
        config = namespace.get("model_config")
        if isinstance(config, dict):
            namespace["Config"] = _config_from_mapping(dict(config))
            annotations = dict(namespace.get("__annotations__", {}))
            annotations.pop("model_config", None)
            namespace["__annotations__"] = annotations
            namespace.pop("model_config", None)
            namespace["__hermes_model_config__"] = dict(config)
        return super().__new__(mcs, name, bases, namespace, **kwargs)


def _model_after_adapter(function: Callable) -> Callable:
    def _wrapped(cls, values: dict[str, Any]) -> dict[str, Any]:
        draft = cls.construct(**{key: values.get(key) for key in cls.__fields__})
        result = function(draft)
        if isinstance(result, cls):
            return {name: getattr(result, name) for name in cls.__fields__}
        if isinstance(result, dict):
            return result
        return values

    return _wrapped


def _decorate_model_validators(cls: type) -> None:
    for function in list(vars(cls).values()):
        if getattr(function, "__hermes_model_validator_mode__", "") == "after":
            root_validator(pre=False, allow_reuse=True, skip_on_failure=True)(
                _model_after_adapter(function)
            )


def _attach_constraint_validators(cls: type) -> None:
    annotations = getattr(cls, "__annotations__", {})
    for name, annotation in annotations.items():
        raw = getattr(annotation, "__metadata__", None)
        field = cls.__dict__.get(name)
        constraints = {}
        if isinstance(field, type(Field())) or hasattr(field, "extra"):
            constraints.update(getattr(field, "extra", {}) or {})
        if raw:
            for item in raw:
                constraints.update(getattr(item, "extra", {}) or {})
        useful = {key: value for key, value in constraints.items() if key in {"ge", "le", "gt", "lt", "min_length", "max_length", "multiple_of", "pattern"}}
        if not useful:
            continue
        prepared = _prepare_validator(_constraint_validator(useful), allow_reuse=True)
        setattr(
            prepared,
            VALIDATOR_CONFIG_KEY,
            ((name,), Validator(func=prepared.__func__, pre=False, always=False, check_fields=True)),
        )
        setattr(cls, f"_hermes_constraint_{name}", prepared)


class BaseModel(_V1BaseModel, metaclass=_BridgeMeta):
    """Pydantic 1 model exposing the v2 methods used by the Android server."""

    def __init_subclass__(cls, **kwargs: Any) -> None:
        _attach_constraint_validators(cls)
        _decorate_model_validators(cls)
        super().__init_subclass__(**kwargs)
        saved = cls.__dict__.get("__hermes_model_config__")
        if isinstance(saved, dict):
            cls.model_config = saved
        cls.model_fields = cls.__fields__

    @classmethod
    def model_validate(cls, value: Any, **_kwargs: Any):
        if isinstance(value, cls):
            return value
        return cls.parse_obj(value)

    @classmethod
    def model_validate_json(cls, raw: str | bytes, **_kwargs: Any):
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")
        return cls.parse_raw(raw)

    def model_dump(self, *args: Any, **kwargs: Any) -> dict[str, Any]:
        mode = kwargs.pop("mode", "python")
        kwargs.pop("warnings", None)
        exclude_none = kwargs.pop("exclude_none", False)
        by_alias = kwargs.pop("by_alias", False)
        if args or kwargs:
            raise TypeError("Unsupported model_dump arguments for the Android Pydantic bridge")
        payload = self.dict(exclude_none=exclude_none, by_alias=by_alias)
        if mode == "json":
            return json.loads(json.dumps(payload, default=_json_default))
        if mode != "python":
            raise ValueError(f"Unsupported model_dump mode: {mode}")
        return payload

    def model_dump_json(self, *args: Any, **kwargs: Any) -> str:
        exclude_none = kwargs.pop("exclude_none", False)
        by_alias = kwargs.pop("by_alias", False)
        if args or kwargs:
            raise TypeError("Unsupported model_dump_json arguments for the Android Pydantic bridge")
        return self.json(exclude_none=exclude_none, by_alias=by_alias)

    @property
    def model_fields_set(self) -> set[str]:
        return set(self.__fields_set__)


class RootModel(BaseModel):
    """Subset of Pydantic v2 ``RootModel`` used by the gateway contracts."""

    def __init__(self, root: Any = None, **data: Any) -> None:
        if "root" not in data:
            data = {"root": root}
        super().__init__(**data)


def _json_default(value: Any) -> Any:
    if hasattr(value, "dict"):
        return value.dict()
    if isinstance(value, (set, tuple)):
        return list(value)
    return str(value)


_CONSTRAINT_VALIDATORS: dict[tuple[str, str], Callable] = {}


def Field(default: Any = ..., *args: Any, **kwargs: Any):
    """Accept v2 Field constraints and enforce them on the Android runtime."""
    if default is ... and not args:
        default = kwargs.pop("default", ...)
    constraints = {
        key: kwargs.pop(key)
        for key in ("ge", "le", "gt", "lt", "min_length", "max_length", "multiple_of", "pattern")
        if key in kwargs
    }
    alias = kwargs.get("alias")
    if default is ... and "default_factory" in kwargs:
        field = _V1Field(**kwargs)
    else:
        field = _V1Field(default, **kwargs)
    if constraints:
        field.extra = dict(getattr(field, "extra", {}) or {})
        field.extra.update(constraints)
        if alias:
            _CONSTRAINT_VALIDATORS[("alias", str(alias))] = _constraint_validator(constraints)
    return field


def _constraint_validator(constraints: dict[str, Any]) -> Callable:
    def _validate(cls, value: Any) -> Any:
        if value is None:
            return value
        number = constraints.keys() & {"ge", "le", "gt", "lt", "multiple_of"}
        if number:
            try:
                numeric = float(value)
            except (TypeError, ValueError) as exc:
                raise ValueError("value must be numeric") from exc
            if "ge" in constraints and numeric < constraints["ge"]:
                raise ValueError(f"value must be >= {constraints['ge']}")
            if "gt" in constraints and numeric <= constraints["gt"]:
                raise ValueError(f"value must be > {constraints['gt']}")
            if "le" in constraints and numeric > constraints["le"]:
                raise ValueError(f"value must be <= {constraints['le']}")
            if "lt" in constraints and numeric >= constraints["lt"]:
                raise ValueError(f"value must be < {constraints['lt']}")
        length = constraints.keys() & {"min_length", "max_length"}
        if length:
            try:
                size = len(value)
            except TypeError as exc:
                raise ValueError("value must have a length") from exc
            if "min_length" in constraints and size < constraints["min_length"]:
                raise ValueError(f"value is shorter than {constraints['min_length']}")
            if "max_length" in constraints and size > constraints["max_length"]:
                raise ValueError(f"value is longer than {constraints['max_length']}")
        if "pattern" in constraints:
            import re
            if re.fullmatch(constraints["pattern"], str(value)) is None:
                raise ValueError("value does not match the required pattern")
        return value

    return _validate


def field_validator(*fields: str, mode: str = "after", **_kwargs: Any):
    if not fields:
        raise TypeError("field_validator requires at least one field")
    if mode not in {"before", "after", "wrap", "plain"}:
        raise ValueError(f"Unsupported field_validator mode: {mode}")

    def _decorator(function: Callable) -> Callable:
        prepared = _prepare_validator(function, allow_reuse=True)
        setattr(
            prepared,
            VALIDATOR_CONFIG_KEY,
            (
                fields,
                Validator(
                    func=prepared.__func__,
                    pre=mode == "before",
                    each_item=False,
                    always=True,
                    check_fields=True,
                ),
            ),
        )
        return prepared

    return _decorator


def model_validator(*, mode: str = "after", **_kwargs: Any):
    if mode not in {"before", "after", "wrap"}:
        raise ValueError(f"Unsupported model_validator mode: {mode}")

    def _decorator(function: Callable) -> Callable:
        prepared = _prepare_validator(function, allow_reuse=True)
        prepared.__hermes_model_validator_mode__ = mode
        return prepared

    return _decorator


def install() -> str:
    """Expose the required v2 names from the installed Pydantic package."""
    if PYDANTIC_MAJOR >= 2 and all(hasattr(_pydantic_v1, name) for name in (
        "field_validator", "model_validator", "ConfigDict", "RootModel"
    )):
        return PYDANTIC_VERSION
    _pydantic_v1.BaseModel = BaseModel
    _pydantic_v1.ConfigDict = ConfigDict
    _pydantic_v1.RootModel = RootModel
    _pydantic_v1.Field = Field
    _pydantic_v1.field_validator = field_validator
    _pydantic_v1.model_validator = model_validator
    exports = list(getattr(_pydantic_v1, "__all__", []))
    for name in ("BaseModel", "ConfigDict", "RootModel", "Field", "field_validator", "model_validator"):
        if name not in exports:
            exports.append(name)
    _pydantic_v1.__all__ = exports
    return PYDANTIC_VERSION


install()
