class PermanentJobError(Exception):
    """A failure that retrying cannot fix. The queue consumer skips the
    retry loop and runs the failure hook immediately."""
