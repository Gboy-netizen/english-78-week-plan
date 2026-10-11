"""Publish the current site commit through GitHub's Git Data API when git push cannot connect.

Run from the github-pages-site directory after committing local changes.
"""
from __future__ import annotations

import base64
import json
import re
import subprocess
import sys


def command(*args: str) -> str:
    result = subprocess.run(args, capture_output=True, text=True, timeout=90, check=False)
    if result.returncode:
        raise RuntimeError(f"{args[0]} {args[1]} failed: {result.stderr.strip()[:500]}")
    return result.stdout.strip()


def api(method: str, endpoint: str, payload: dict | None = None) -> dict:
    args = ["gh", "api", "--method", method, endpoint]
    if payload is not None:
        args += ["--input", "-"]
    result = subprocess.run(args, input=json.dumps(payload) if payload is not None else None,
                            capture_output=True, text=True, timeout=120, check=False)
    if result.returncode:
        raise RuntimeError(f"GitHub API {method} {endpoint} failed: {result.stderr.strip()[:500]}")
    return json.loads(result.stdout) if result.stdout.strip() else {}


def main() -> int:
    try:
        remote_url = command("git", "remote", "get-url", "origin")
        match = re.search(r"github\.com[:/]([^/]+)/([^/]+?)(?:\.git)?$", remote_url)
        if not match:
            raise ValueError("origin is not a GitHub repository")
        repo = f"repos/{match.group(1)}/{match.group(2)}"
        local_sha = command("git", "rev-parse", "HEAD")
        parent = command("git", "rev-parse", "HEAD^")
        local_tree = command("git", "rev-parse", "HEAD^{tree}")
        parent_tree = command("git", "rev-parse", f"{parent}^{{tree}}")
        remote_sha = api("GET", f"{repo}/git/ref/heads/main")["object"]["sha"]
        paths = command("git", "diff", "--name-only", "HEAD^", "HEAD").splitlines()
        tree_entries = []
        for name in paths:
            committed = subprocess.run(["git", "show", f"HEAD:{name}"], capture_output=True, timeout=90, check=False)
            if committed.returncode:
                raise RuntimeError(f"Cannot read committed file {name}")
            content = committed.stdout
            blob = api("POST", f"{repo}/git/blobs", {
                "content": base64.b64encode(content).decode("ascii"), "encoding": "base64",
            })
            tree_entries.append({"path": name.replace("\\", "/"), "mode": "100644", "type": "blob", "sha": blob["sha"]})
            print(f"Uploaded {name}")
        base_tree = api("GET", f"{repo}/git/commits/{remote_sha}")["tree"]["sha"]
        if base_tree != parent_tree:
            raise ValueError("Remote content changed; review it before publishing")
        new_tree = api("POST", f"{repo}/git/trees", {"base_tree": base_tree, "tree": tree_entries})["sha"]
        if new_tree != local_tree:
            raise ValueError("Uploaded tree differs from the reviewed local commit")
        fields = command("git", "log", "-1", "--format=%an%n%ae%n%aI%n%cn%n%ce%n%cI%n%B").splitlines()
        commit = api("POST", f"{repo}/git/commits", {
            "message": "\n".join(fields[6:]).strip(), "tree": new_tree, "parents": [remote_sha],
            "author": {"name": fields[0], "email": fields[1], "date": fields[2]},
            "committer": {"name": fields[3], "email": fields[4], "date": fields[5]},
        })
        api("PATCH", f"{repo}/git/refs/heads/main", {"sha": commit["sha"], "force": False})
        print(f"Published {commit['sha']} (local commit {local_sha})")
        return 0
    except (OSError, ValueError, KeyError, RuntimeError, subprocess.TimeoutExpired, json.JSONDecodeError) as error:
        print(f"Publish failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
