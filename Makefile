.PHONY: roster-update roster-update-dry-run

# Override this for a non-default interpreter, e.g.:
#   make roster-update PYTHON='py -3.12'
PYTHON ?= python3

# Collect the prior Pacific-date NBA roster data, rebuild graph.json when it
# changes, then commit and push only the generated graph (the script handles
# the no-change case without creating a commit).
roster-update:
	$(PYTHON) scripts/update_roster_graph.py

# Safe way to validate a scheduler's command and interpreter configuration.
roster-update-dry-run:
	$(PYTHON) scripts/update_roster_graph.py --dry-run
