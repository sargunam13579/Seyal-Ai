import sys
from seyal_ai.agents.computer_use.laptop import agent as _target

for attr in dir(_target):
    if not attr.startswith("__"):
        globals()[attr] = getattr(_target, attr)

sys.modules[__name__] = _target
