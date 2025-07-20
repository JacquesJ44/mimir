# This function is used to describe changes between two dictionaries - used for logging
def describe_changes_log(old: dict, new: dict, fields: list = None) -> str:
    """
    Describes changes between two dictionaries.
    If 'old' is empty, assumes a create.
    If both values exist and differ, shows the change.
    """
    changes = []
    keys = fields if fields else set(new.keys())

    for key in keys:
        old_val = old.get(key)
        new_val = new.get(key)

        if old_val is None and new_val is not None:
            changes.append(f"{key}: '{new_val}'")  # New field set
        elif old_val != new_val:
            changes.append(f"{key}: '{old_val}' to '{new_val}'")  # Field updated

    return "; ".join(changes) if changes else "no changes"